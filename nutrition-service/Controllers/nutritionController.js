// nutrition-service/controllers/nutritionController.js

const nutritionModels = require('../models/NutritionLong');
const foodModels = require('../models/Food');

// Middleware de autenticación simulado:
const MOCK_PROFILE_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; // En un ambiente real, viene del JWT

/**
 * POST /api/nutrition/mediciones
 * Registra una nueva medición corporal.
 */
async function registerMeasurement(req, res) {
    try {
        const perfilId = req.perfilId || MOCK_PROFILE_ID; // Usar el ID del token
        const { peso, altura } = req.body;

        if (!peso || !altura) {
            return res.status(400).json({ error: 'Faltan peso y altura' });
        }
        
        const newMeasurement = await nutritionModels.createMeasurement(perfilId, peso, altura);
        res.status(201).json({ 
            message: 'Medición registrada exitosamente', 
            data: newMeasurement 
        });

    } catch (error) {
        console.error('Error al registrar medición:', error);
        res.status(500).json({ error: 'Fallo interno al procesar la medición' });
    }
}

/**
 * GET /api/nutrition/mediciones/history
 * Obtiene el historial de mediciones.
 */
async function getHistory(req, res) {
    try {
        const perfilId = req.perfilId || MOCK_PROFILE_ID;
        const history = await nutritionModels.getMeasurementHistory(perfilId);

        res.status(200).json(history);
    } catch (error) {
        console.error('Error al obtener historial:', error);
        res.status(500).json({ error: 'Fallo interno al obtener historial' });
    }
}

/**
 * GET /api/nutrition/foods/search?q=query
 * Busca alimentos.
 */
async function searchFoods(req, res) {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Debe proporcionar un término de búsqueda (q)' });
        }
        
        const foods = await foodModels.searchFoods(query);
        res.status(200).json(foods);

    } catch (error) {
        console.error('Error al buscar alimentos:', error);
        res.status(500).json({ error: 'Fallo interno al buscar alimentos' });
    }
}


module.exports = {
    registerMeasurement,
    getHistory,
    searchFoods,
};