const Food = require("../models/Food")
const MealPlan = require("../models/MealPlant")
const { NutritionLog, FoodEntry } = require("../models/NutritionLong")

class NutritionController {
  // Buscar alimentos
  async searchFoods(req, res) {
    try {
      const { query, category, limit = 20 } = req.query

      let foods = []

      if (query) {
        foods = await Food.searchByName(query, Number.parseInt(limit))
      } else if (category) {
        foods = await Food.findByCategory(category, Number.parseInt(limit))
      } else {
        foods = await Food.findAll(Number.parseInt(limit))
      }

      res.status(200).json({
        success: true,
        data: { foods },
      })
    } catch (error) {
      console.error("Error buscando alimentos:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      })
    }
  }

  // Obtener alimento por código de barras
  async getFoodByBarcode(req, res) {
    try {
      const { barcode } = req.params

      const food = await Food.findByBarcode(barcode)
      if (!food) {
        return res.status(404).json({
          success: false,
          message: "Alimento no encontrado",
        })
      }

      res.status(200).json({
        success: true,
        data: { food },
      })
    } catch (error) {
      console.error("Error obteniendo alimento por código de barras:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      })
    }
  }

  // Crear plan de comidas personalizado
  async createPersonalizedMealPlan(req, res) {
    try {
      const {
        userId,
        name,
        goal,
        startDate,
        endDate,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        dietaryRestrictions,
      } = req.body

      if (!userId || !goal || !targetCalories) {
        return res.status(400).json({
          success: false,
          message: "userId, goal y targetCalories son requeridos",
        })
      }

      const mealPlanData = {
        user_id: userId,
        name: name || `Plan ${goal} - ${new Date().toLocaleDateString()}`,
        goal,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate,
        target_calories: targetCalories,
        target_protein: targetProtein,
        target_carbs: targetCarbs,
        target_fat: targetFat,
        dietary_restrictions: dietaryRestrictions || [],
      }

      const mealPlan = await MealPlan.create(mealPlanData)

      res.status(201).json({
        success: true,
        message: "Plan de comidas creado exitosamente",
        data: { mealPlan },
      })
    } catch (error) {
      console.error("Error creando plan de comidas:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      })
    }
  }

  // Registrar consumo de alimentos
  async logFood(req, res) {
    try {
      const { userId, foodId, quantity, unit, mealType, date } = req.body

      if (!userId || !foodId || !quantity || !unit || !mealType) {
        return res.status(400).json({
          success: false,
          message: "userId, foodId, quantity, unit y mealType son requeridos",
        })
      }

      // Obtener información nutricional del alimento
      const food = await Food.findById(foodId)
      if (!food) {
        return res.status(404).json({
          success: false,
          message: "Alimento no encontrado",
        })
      }

      // Calcular valores nutricionales basados en la cantidad
      const nutritionalValues = food.calculateNutritionForAmount(quantity, unit)

      // Fecha del log (hoy si no se especifica)
      const logDate = date || new Date().toISOString().split("T")[0]

      // Buscar o crear log del día
      let nutritionLog = await NutritionLog.findByUserAndDate(userId, logDate)

      if (!nutritionLog) {
        nutritionLog = await NutritionLog.createOrUpdate({
          user_id: userId,
          date: logDate,
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          water_intake: 0,
        })
      }

      // Crear entrada de alimento
      const foodEntry = await FoodEntry.create({
        nutrition_log_id: nutritionLog.id,
        food_id: foodId,
        meal_type: mealType,
        quantity,
        unit,
        calories: nutritionalValues.calories,
        protein: nutritionalValues.protein,
        carbohydrates: nutritionalValues.carbohydrates,
        fat: nutritionalValues.fat,
      })

      // Actualizar totales del log
      await nutritionLog.update({
        total_calories: nutritionLog.total_calories + nutritionalValues.calories,
        total_protein: nutritionLog.total_protein + nutritionalValues.protein,
        total_carbs: nutritionLog.total_carbs + nutritionalValues.carbohydrates,
        total_fat: nutritionLog.total_fat + nutritionalValues.fat,
      })

      res.status(201).json({
        success: true,
        message: "Alimento registrado exitosamente",
        data: { foodEntry, nutritionLog },
      })
    } catch (error) {
      console.error("Error registrando alimento:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      })
    }
  }

  // Obtener log nutricional del usuario
  async getNutritionLog(req, res) {
    try {
      const { userId } = req.params
      const { date, startDate, endDate } = req.query

      let logs = []

      if (date) {
        const log = await NutritionLog.findByUserAndDate(userId, date)
        if (log) {
          const entries = await FoodEntry.findByNutritionLogId(log.id)
          logs = [{ ...log, entries }]
        }
      } else if (startDate && endDate) {
        logs = await NutritionLog.findByDateRange(userId, startDate, endDate)
        // Obtener entradas para cada log
        for (const log of logs) {
          log.entries = await FoodEntry.findByNutritionLogId(log.id)
        }
      } else {
        // Por defecto, últimos 7 días
        const today = new Date()
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)

        logs = await NutritionLog.findByDateRange(
          userId,
          weekAgo.toISOString().split("T")[0],
          today.toISOString().split("T")[0],
        )

        for (const log of logs) {
          log.entries = await FoodEntry.findByNutritionLogId(log.id)
        }
      }

      res.status(200).json({
        success: true,
        data: { logs },
      })
    } catch (error) {
      console.error("Error obteniendo log nutricional:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      })
    }
  }

  // Obtener recomendaciones nutricionales
  async getNutritionRecommendations(req, res) {
    try {
      const { userId } = req.params

      // Obtener logs recientes del usuario (últimos 7 días)
      const today = new Date()
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const recentLogs = await NutritionLog.findByDateRange(
        userId,
        weekAgo.toISOString().split("T")[0],
        today.toISOString().split("T")[0],
      )

      if (recentLogs.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            recommendations: [
              "Comienza registrando tus comidas para obtener recomendaciones personalizadas",
              "Mantén una dieta balanceada con proteínas, carbohidratos y grasas saludables",
              "Bebe al menos 8 vasos de agua al día",
            ],
          },
        })
      }

      // Calcular promedios
      const averages = this.calculateNutritionAverages(recentLogs)

      // Generar recomendaciones basadas en los promedios
      const recommendations = this.generateRecommendations(averages)

      res.status(200).json({
        success: true,
        data: {
          averages,
          recommendations,
        },
      })
    } catch (error) {
      console.error("Error obteniendo recomendaciones:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      })
    }
  }

  // Métodos auxiliares
  calculateNutritionAverages(logs) {
    const totals = logs.reduce(
      (acc, log) => {
        acc.calories += log.total_calories || 0
        acc.protein += log.total_protein || 0
        acc.carbohydrates += log.total_carbs || 0
        acc.fat += log.total_fat || 0
        acc.waterIntake += log.water_intake || 0
        return acc
      },
      { calories: 0, protein: 0, carbohydrates: 0, fat: 0, waterIntake: 0 },
    )

    const count = logs.length
    return {
      calories: Math.round(totals.calories / count),
      protein: Math.round(totals.protein / count),
      carbohydrates: Math.round(totals.carbohydrates / count),
      fat: Math.round(totals.fat / count),
      waterIntake: Math.round(totals.waterIntake / count),
    }
  }

  generateRecommendations(averages) {
    const recommendations = []

    if (averages.calories < 1200) {
      recommendations.push("Considera aumentar tu ingesta calórica para mantener un metabolismo saludable")
    } else if (averages.calories > 2500) {
      recommendations.push("Podrías reducir ligeramente tu ingesta calórica si tu objetivo es perder peso")
    }

    if (averages.protein < 50) {
      recommendations.push("Aumenta tu consumo de proteínas con carnes magras, pescado, huevos o legumbres")
    }

    if (averages.waterIntake < 1500) {
      recommendations.push("Incrementa tu consumo de agua para mantenerte bien hidratado")
    }

    if (recommendations.length === 0) {
      recommendations.push("¡Excelente! Mantienes una dieta balanceada. Continúa así.")
    }

    return recommendations
  }
}

module.exports = new NutritionController()
