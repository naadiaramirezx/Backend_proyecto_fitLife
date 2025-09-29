const Plan = require("../models/Plan")
const UserPlan = require("../models/UserPlan")

class PlanController {
  // RF04: Crear planes de ejercicio personalizados
  async createPersonalizedPlan(req, res) {
    try {
      const { userId, goal, fitnessLevel, availableDays, duration, equipment } = req.body

      if (!userId || !goal || !fitnessLevel) {
        return res.status(400).json({
          success: false,
          message: "userId, goal y fitnessLevel son requeridos",
        })
      }

      // Buscar planes que coincidan con los criterios
      const matchingPlans = await Plan.find({
        goal: goal,
        "targetAudience.fitnessLevel": fitnessLevel,
        workoutsPerWeek: { $lte: availableDays || 7 },
        isActive: true,
      })

      if (matchingPlans.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No se encontraron planes que coincidan con tus criterios",
        })
      }

      // Seleccionar el plan más adecuado (por ahora el primero)
      const selectedPlan = matchingPlans[0]

      // Crear asignación de plan al usuario
      const userPlan = new UserPlan({
        userId,
        planId: selectedPlan._id,
        endDate: new Date(Date.now() + (duration || selectedPlan.duration) * 7 * 24 * 60 * 60 * 1000),
        progress: {
          totalWorkouts:
            selectedPlan.workouts.length * selectedPlan.workoutsPerWeek * (duration || selectedPlan.duration),
        },
      })

      await userPlan.save()

      res.status(201).json({
        success: true,
        message: "Plan personalizado creado exitosamente",
        data: {
          userPlan,
          plan: selectedPlan,
        },
      })
    } catch (error) {
      console.error("Error creando plan personalizado:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF05: Consultar rutinas de entrenamiento
  async getUserPlans(req, res) {
    try {
      const { userId } = req.params

      const userPlans = await UserPlan.find({
        userId,
        status: { $in: ["active", "paused"] },
      }).populate("planId")

      res.status(200).json({
        success: true,
        data: { userPlans },
      })
    } catch (error) {
      console.error("Error obteniendo planes del usuario:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF05: Iniciar rutina de entrenamiento
  async startWorkout(req, res) {
    try {
      const { userPlanId, workoutId } = req.body

      const userPlan = await UserPlan.findById(userPlanId)
      if (!userPlan) {
        return res.status(404).json({
          success: false,
          message: "Plan de usuario no encontrado",
        })
      }

      // Crear entrada de progreso para el workout
      const workoutProgress = {
        workoutId,
        startedAt: new Date(),
      }

      userPlan.workoutHistory.push(workoutProgress)
      await userPlan.save()

      res.status(200).json({
        success: true,
        message: "Rutina iniciada exitosamente",
        data: {
          workoutProgressId: userPlan.workoutHistory[userPlan.workoutHistory.length - 1]._id,
        },
      })
    } catch (error) {
      console.error("Error iniciando rutina:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF06: Marcar rutinas como completadas
  async completeWorkout(req, res) {
    try {
      const { userPlanId, workoutProgressId, duration, caloriesBurned, exercises, rating, notes } = req.body

      const userPlan = await UserPlan.findById(userPlanId)
      if (!userPlan) {
        return res.status(404).json({
          success: false,
          message: "Plan de usuario no encontrado",
        })
      }

      // Encontrar el progreso del workout
      const workoutProgress = userPlan.workoutHistory.id(workoutProgressId)
      if (!workoutProgress) {
        return res.status(404).json({
          success: false,
          message: "Progreso de rutina no encontrado",
        })
      }

      // Actualizar progreso
      workoutProgress.completedAt = new Date()
      workoutProgress.duration = duration
      workoutProgress.caloriesBurned = caloriesBurned
      workoutProgress.exercises = exercises
      workoutProgress.rating = rating
      workoutProgress.notes = notes

      await userPlan.save()

      res.status(200).json({
        success: true,
        message: "Rutina completada exitosamente",
        data: { workoutProgress },
      })
    } catch (error) {
      console.error("Error completando rutina:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF07: Crear, actualizar y eliminar rutinas (para administradores)
  async createPlan(req, res) {
    try {
      const planData = req.body

      const plan = new Plan(planData)
      await plan.save()

      res.status(201).json({
        success: true,
        message: "Plan creado exitosamente",
        data: { plan },
      })
    } catch (error) {
      console.error("Error creando plan:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async updatePlan(req, res) {
    try {
      const { planId } = req.params
      const updates = req.body

      const plan = await Plan.findByIdAndUpdate(planId, updates, { new: true })
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan no encontrado",
        })
      }

      res.status(200).json({
        success: true,
        message: "Plan actualizado exitosamente",
        data: { plan },
      })
    } catch (error) {
      console.error("Error actualizando plan:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async deletePlan(req, res) {
    try {
      const { planId } = req.params

      const plan = await Plan.findByIdAndUpdate(planId, { isActive: false }, { new: true })

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan no encontrado",
        })
      }

      res.status(200).json({
        success: true,
        message: "Plan desactivado exitosamente",
      })
    } catch (error) {
      console.error("Error eliminando plan:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener todos los planes disponibles
  async getAllPlans(req, res) {
    try {
      const { goal, difficulty, equipment } = req.query

      const filter = { isActive: true }

      if (goal) filter.goal = goal
      if (difficulty) filter.difficulty = difficulty
      if (equipment) filter.equipment = { $in: equipment.split(",") }

      const plans = await Plan.find(filter)

      res.status(200).json({
        success: true,
        data: { plans },
      })
    } catch (error) {
      console.error("Error obteniendo planes:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }
}

module.exports = new PlanController()
