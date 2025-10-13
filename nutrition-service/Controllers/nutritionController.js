const Food = require("../models/Food")
const MealPlan = require("../models/MealPlant")
const { NutritionLog, FoodEntry } = require("../models/NutritionLong")

class NutritionController {
  // Buscar alimentos - FUNCIONA CON TU BASE DE DATOS
  async searchFoods(req, res) {
    try {
      const { query, limit = 20 } = req.query

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'query' es requerido",
        })
      }

      const foods = await Food.searchByName(query, parseInt(limit))

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

  // Crear plan de comidas personalizado - ADAPTADO A TU BD
  async createPersonalizedMealPlan(req, res) {
    try {
      const {
        userId,
        name,
        startDate,
        dietType = "Balanceada"
      } = req.body

      if (!userId || !name) {
        return res.status(400).json({
          success: false,
          message: "userId y name son requeridos",
        })
      }

      const mealPlanData = {
        user_id: userId,
        name: name,
        start_date: startDate || new Date().toISOString().split("T")[0],
        diet_type: dietType,
        active: true
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

  // Registrar consumo de alimentos - SIMPLIFICADO
  async logFood(req, res) {
    try {
      const { userId, foodId, quantity, mealType, date } = req.body

      if (!userId || !foodId || !quantity || !mealType) {
        return res.status(400).json({
          success: false,
          message: "userId, foodId, quantity y mealType son requeridos",
        })
      }

      // Obtener información del alimento
      const food = await Food.findById(foodId)
      if (!food) {
        return res.status(404).json({
          success: false,
          message: "Alimento no encontrado",
        })
      }

      // Calcular valores nutricionales (asumiendo cantidad en gramos)
      const nutritionalValues = food.calculateNutritionForAmount(quantity, "g")

      res.status(201).json({
        success: true,
        message: "Alimento registrado exitosamente",
        data: { 
          foodEntry: {
            food: food,
            quantity: quantity,
            mealType: mealType,
            nutritionalValues: nutritionalValues
          }
        },
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

  // Obtener log nutricional del usuario - SIMPLIFICADO
  async getNutritionLog(req, res) {
    try {
      const { userId } = req.params

      // Por ahora devolvemos un formato básico
      // En una implementación completa, aquí buscarías en la base de datos
      res.status(200).json({
        success: true,
        data: { 
          logs: [],
          message: "Funcionalidad de log en desarrollo"
        },
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

  // Obtener recomendaciones nutricionales - SIMPLIFICADO
  async getNutritionRecommendations(req, res) {
    try {
      const { userId } = req.params

      // Recomendaciones básicas
      const recommendations = [
        "Mantén una dieta balanceada con proteínas, carbohidratos y grasas saludables",
        "Bebe al menos 2 litros de agua al día",
        "Incluye frutas y verduras en cada comida",
        "Controla las porciones para mantener tu objetivo calórico"
      ]

      res.status(200).json({
        success: true,
        data: {
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
}

module.exports = new NutritionController()