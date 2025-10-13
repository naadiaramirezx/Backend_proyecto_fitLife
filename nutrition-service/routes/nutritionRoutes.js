const express = require("express")
const nutritionController = require("../Controllers/nutritionController")
const router = express.Router()

// Rutas para alimentos
router.get("/foods/search", nutritionController.searchFoods)

// Rutas para planes de comidas
router.post("/meal-plans", nutritionController.createPersonalizedMealPlan)

// Rutas para logging de nutrición
router.post("/log", nutritionController.logFood)
router.get("/log/:userId", nutritionController.getNutritionLog)

// Rutas para recomendaciones
router.get("/recommendations/:userId", nutritionController.getNutritionRecommendations)

module.exports = router
