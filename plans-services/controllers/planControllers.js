// plans-services/controllers/planControllers.js

const PlanModel = require('../models/Plan');
const UserPlanModel = require('../models/UserPlan');

// MOCK: Simula la obtención del perfilId del token JWT después de la autenticación
const MOCK_PROFILE_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; 

/**
 * GET /api/plans/catalogue
 * Obtiene la lista de planes disponibles y sus precios.
 */
async function getAvailablePlans(req, res) {
    try {
        const plans = await PlanModel.getAllPlans();
        res.status(200).json(plans);
    } catch (error) {
        console.error('Error al obtener planes:', error);
        res.status(500).json({ error: 'Fallo interno al obtener el catálogo de planes' });
    }
}

/**
 * GET /api/plans/:planId/details
 * Obtiene la estructura de ejercicios (detalles) de un plan.
 */
async function getPlanDetailsById(req, res) {
    try {
        const { planId } = req.params;
        const details = await PlanModel.getPlanDetails(planId);

        if (details.length === 0) {
            return res.status(404).json({ message: 'Plan no encontrado o sin ejercicios definidos' });
        }
        res.status(200).json(details);
    } catch (error) {
        console.error('Error al obtener detalles del plan:', error);
        res.status(500).json({ error: 'Fallo interno al obtener detalles' });
    }
}

/**
 * GET /api/plans/user/active
 * Obtiene la suscripción activa del usuario logueado.
 */
async function getUserActivePlan(req, res) {
    try {
        // En un ambiente real, sería req.perfilId obtenido del JWT
        const perfilId = req.perfilId || MOCK_PROFILE_ID; 
        
        const activePlan = await UserPlanModel.getActiveSubscription(perfilId);

        if (!activePlan) {
            return res.status(404).json({ message: 'El usuario no tiene un plan activo' });
        }
        res.status(200).json(activePlan);
    } catch (error) {
        console.error('Error al obtener plan activo:', error);
        res.status(500).json({ error: 'Fallo interno al obtener plan activo' });
    }
}

/**
 * POST /api/plans/user/subscribe
 * Crea una nueva suscripción (simulando una compra exitosa).
 */
async function subscribeToPlan(req, res) {
    try {
        const perfilId = req.perfilId || MOCK_PROFILE_ID;
        const { planId, fechaFin } = req.body; // fechaFin viene del frontend o se calcula aquí

        if (!planId || !fechaFin) {
            return res.status(400).json({ error: 'Faltan planId y fechaFin' });
        }

        // Simulación de cálculo de fecha de fin basada en plan.duracion_dias si no se envía
        // En este ejemplo, usamos la fecha que viene en req.body

        const newSubscription = await UserPlanModel.createSubscription(perfilId, planId, fechaFin);

        res.status(201).json({ 
            message: 'Suscripción creada exitosamente', 
            data: newSubscription 
        });

    } catch (error) {
        console.error('Error al suscribirse:', error);
        res.status(500).json({ error: 'Fallo interno al crear la suscripción' });
    }
}

module.exports = {
    getAvailablePlans,
    getPlanDetailsById,
    getUserActivePlan,
    subscribeToPlan,
};