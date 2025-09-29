const Food = require("../models/Food")
const MealPlan = require("../models/MealPlan")
const NutritionLog = require("../models/NutritionLog")

class NutritionController {
  // Buscar alimentos
  async searchFoods(req, res) {
    try {
      const { query, category, page = 1, limit = 20 } = req.query

      const searchCriteria = {}

      if (query) {
        searchCriteria.$text = { $search: query }
      }

      if (category) {
        searchCriteria.category = category
      }

      const foods = await Food.find(searchCriteria)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ isVerified: -1, name: 1 })

      const total = await Food.countDocuments(searchCriteria)

      res.status(200).json({
        success: true,
        data: {
          foods,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
        },
      })
    } catch (error) {
      console.error("Error buscando alimentos:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener alimento por código de barras
  async getFoodByBarcode(req, res) {
    try {
      const { barcode } = req.params

      const food = await Food.findOne({ barcode })
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
      })
    }
  }

  // Crear plan de comidas personalizado
  async createPersonalizedMealPlan(req, res) {
    try {
      const { userId, goal, targetCalories, macroTargets, dietaryRestrictions, allergens, duration = 7 } = req.body

      if (!userId || !goal || !targetCalories || !macroTargets) {
        return res.status(400).json({
          success: false,
          message: "userId, goal, targetCalories y macroTargets son requeridos",
        })
      }

      // Crear plan de comidas
      const mealPlan = new MealPlan({
        userId,
        name: `Plan ${goal} - ${new Date().toLocaleDateString()}`,
        goal,
        targetCalories,
        macroTargets,
        dietaryRestrictions: dietaryRestrictions || [],
        allergens: allergens || [],
        endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      })

      // Generar planes diarios (simplificado - en producción sería más complejo)
      for (let i = 0; i < duration; i++) {
        const date = new Date()
        date.setDate(date.getDate() + i)

        const dailyPlan = {
          date,
          meals: await this.generateDailyMeals(targetCalories, macroTargets, dietaryRestrictions, allergens),
          waterIntake: 2000, // 2 litros por defecto
        }

        mealPlan.dailyPlans.push(dailyPlan)
      }

      await mealPlan.save()

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
      })
    }
  }

  // Método auxiliar para generar comidas diarias
  async generateDailyMeals(targetCalories, macroTargets, dietaryRestrictions, allergens) {
    // Distribución de calorías por comida
    const calorieDistribution = {
      breakfast: 0.25,
      lunch: 0.35,
      dinner: 0.3,
      snack: 0.1,
    }

    const meals = []

    for (const [mealType, percentage] of Object.entries(calorieDistribution)) {
      const mealCalories = targetCalories * percentage

      // Buscar alimentos apropiados (simplificado)
      const foodCriteria = {}
      if (dietaryRestrictions.length > 0) {
        foodCriteria.dietaryRestrictions = { $in: dietaryRestrictions }
      }
      if (allergens.length > 0) {
        foodCriteria.allergens = { $nin: allergens }
      }

      const availableFoods = await Food.find(foodCriteria).limit(10)

      if (availableFoods.length > 0) {
        // Seleccionar alimento aleatorio (en producción sería más inteligente)
        const selectedFood = availableFoods[Math.floor(Math.random() * availableFoods.length)]

        const meal = {
          type: mealType,
          name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} del día`,
          items: [
            {
              foodId: selectedFood._id,
              quantity: 1,
              unit: selectedFood.servingSize.unit,
              calories: selectedFood.nutritionalInfo.calories,
              protein: selectedFood.nutritionalInfo.protein,
              carbohydrates: selectedFood.nutritionalInfo.carbohydrates,
              fat: selectedFood.nutritionalInfo.fat,
            },
          ],
          totalCalories: selectedFood.nutritionalInfo.calories,
          totalProtein: selectedFood.nutritionalInfo.protein,
          totalCarbohydrates: selectedFood.nutritionalInfo.carbohydrates,
          totalFat: selectedFood.nutritionalInfo.fat,
        }

        meals.push(meal)
      }
    }

    return meals
  }

  // Registrar consumo de alimentos
  async logFood(req, res) {
    try {
      const { userId, foodId, quantity, unit, mealType } = req.body

      if (!userId || !foodId || !quantity || !unit || !mealType) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos son requeridos",
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
      const multiplier = quantity / food.servingSize.amount
      const nutritionalValues = {
        calories: food.nutritionalInfo.calories * multiplier,
        protein: food.nutritionalInfo.protein * multiplier,
        carbohydrates: food.nutritionalInfo.carbohydrates * multiplier,
        fat: food.nutritionalInfo.fat * multiplier,
      }

      // Buscar o crear log del día
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let nutritionLog = await NutritionLog.findOne({
        userId,
        date: today,
      })

      if (!nutritionLog) {
        nutritionLog = new NutritionLog({
          userId,
          date: today,
          entries: [],
        })
      }

      // Agregar entrada
      nutritionLog.entries.push({
        foodId,
        quantity,
        unit,
        mealType,
        ...nutritionalValues,
      })

      await nutritionLog.save()

      res.status(201).json({
        success: true,
        message: "Alimento registrado exitosamente",
        data: { nutritionLog },
      })
    } catch (error) {
      console.error("Error registrando alimento:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener log nutricional del usuario
  async getNutritionLog(req, res) {
    try {
      const { userId } = req.params
      const { date, startDate, endDate } = req.query

      const query = { userId }

      if (date) {
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)
        query.date = targetDate
      } else if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }

      const logs = await NutritionLog.find(query).populate("entries.foodId").sort({ date: -1 })

      res.status(200).json({
        success: true,
        data: { logs },
      })
    } catch (error) {
      console.error("Error obteniendo log nutricional:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener recomendaciones nutricionales
  async getNutritionRecommendations(req, res) {
    try {
      const { userId } = req.params

      // Obtener logs recientes del usuario
      const recentLogs = await NutritionLog.find({ userId }).sort({ date: -1 }).limit(7)

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
      })
    }
  }

  // Métodos auxiliares
  calculateNutritionAverages(logs) {
    const totals = logs.reduce(
      (acc, log) => {
        acc.calories += log.dailyTotals.calories
        acc.protein += log.dailyTotals.protein
        acc.carbohydrates += log.dailyTotals.carbohydrates
        acc.fat += log.dailyTotals.fat
        acc.waterIntake += log.waterIntake
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
