// nutrition-service/routes/nutritionRoutes.js

const express = require('express');
const router = express.Router();
const nutritionController = require('../Controllers/nutritionController');

// En una aplicación real, aquí iría el middleware de autenticación (ej: jwtMiddleware)

// Endpoints para Mediciones Corporales
router.post('/mediciones', nutritionController.registerMeasurement);
router.get('/mediciones/history', nutritionController.getHistory);

// Endpoint para el Catálogo de Alimentos
router.get('/foods/search', nutritionController.searchFoods);

// Aquí irían las rutas para MealPlan (ej: router.get('/mealplan/today', ...))

module.exports = router;