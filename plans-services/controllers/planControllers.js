// controllers/planController.js
const { Plan, PlanDetalle } = require("../models/Plan")
const UserPlan = require("../models/UserPlan")
const Exercise = require("../models/Exercise")

class PlanController {
  // RF04: Crear plan personalizado (suscripción) por objetivo/duración
  async createPersonalizedPlan(req, res) {
    try {
      const { perfil_id, objetivo, duracion_dias } = req.body
      if (!perfil_id || !objetivo) {
        return res.status(400).json({ success: false, message: "perfil_id y objetivo son requeridos" })
      }

      const matchingPlans = await Plan.findByFilters({
        objetivo,
        duracion_min: duracion_dias ? duracion_dias - 7 : undefined,
        duracion_max: duracion_dias ? duracion_dias + 7 : undefined,
      })

      if (matchingPlans.length === 0) {
        return res.status(404).json({ success: false, message: "No se encontraron planes que coincidan con tus criterios" })
      }

      const selectedPlan = matchingPlans[0]

      const fechaInicio = new Date()
      const fechaFin = new Date(fechaInicio)
      fechaFin.setDate(fechaInicio.getDate() + (selectedPlan.duracion_dias || 0))

      const userPlan = await UserPlan.create({
        plan_id: selectedPlan.id_plan,
        perfil_id,
        fecha_inicio: fechaInicio.toISOString(),
        fecha_fin: fechaFin.toISOString(),
        id_estado: 1, // activo
      })

      res.status(201).json({
        success: true,
        message: "Plan personalizado creado exitosamente",
        data: { userPlan, plan: selectedPlan },
      })
    } catch (error) {
      console.error("Error creando plan personalizado:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  // RF05: Consultar planes (suscripciones) del usuario
  async getUserPlans(req, res) {
    try {
      const { perfil_id } = req.params
      const userPlans = await UserPlan.findByUserId(perfil_id)
      res.status(200).json({ success: true, data: { userPlans } })
    } catch (error) {
      console.error("Error obteniendo planes del usuario:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  // Ejercicios del día para una suscripción
  async getTodayWorkout(req, res) {
    try {
      const { suscripcion_id } = req.params
      const hoy = new Date()
      // 1 (lunes) ... 7 (domingo)
      const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay()

      // reutilizamos el método “findActiveByUserId” cuando recibes perfil,
      // pero aquí llega suscripcion_id, así que generamos una instancia mínima:
      const dummy = { id_suscripcion: Number(suscripcion_id) }
      const userPlan = Object.assign(new UserPlan(dummy), dummy)

      const ejercicios = await userPlan.getEjerciciosPorDia(diaSemana)
      res.status(200).json({ success: true, data: { dia_semana: diaSemana, ejercicios } })
    } catch (error) {
      console.error("Error obteniendo ejercicios del día:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  // RF07: Crear plan (admin)
  async createPlan(req, res) {
    try {
      const plan = await Plan.create(req.body)
      res.status(201).json({ success: true, message: "Plan creado exitosamente", data: { plan } })
    } catch (error) {
      console.error("Error creando plan:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  async updatePlan(req, res) {
    try {
      const { planId } = req.params
      const plan = await Plan.findById(planId)
      if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" })

      await plan.update(req.body)
      res.status(200).json({ success: true, message: "Plan actualizado exitosamente", data: { plan } })
    } catch (error) {
      console.error("Error actualizando plan:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  async deletePlan(req, res) {
    try {
      const { planId } = req.params
      const plan = await Plan.findById(planId)
      if (!plan) return res.status(404).json({ success: false, message: "Plan no encontrado" })

      await plan.delete()
      res.status(200).json({ success: true, message: "Plan eliminado exitosamente" })
    } catch (error) {
      console.error("Error eliminando plan:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  // Listado de planes con filtros
  async getAllPlans(req, res) {
    try {
      const { objetivo, duracion_min, duracion_max } = req.query
      const filters = {
        objetivo: objetivo || undefined,
        duracion_min: duracion_min ? parseInt(duracion_min) : undefined,
        duracion_max: duracion_max ? parseInt(duracion_max) : undefined,
      }
      const plans = await Plan.findByFilters(filters)
      res.status(200).json({ success: true, data: { plans } })
    } catch (error) {
      console.error("Error obteniendo planes:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }

  // Ejercicios
  async getAllExercises(req, res) {
    try {
      const { tipo_ejercicio } = req.query
      const exercises = tipo_ejercicio
        ? await Exercise.findByType(tipo_ejercicio)
        : await Exercise.findAll()

      res.status(200).json({ success: true, data: { exercises } })
    } catch (error) {
      console.error("Error obteniendo ejercicios:", error)
      res.status(500).json({ success: false, message: "Error interno del servidor" })
    }
  }
}

module.exports = new PlanController()
