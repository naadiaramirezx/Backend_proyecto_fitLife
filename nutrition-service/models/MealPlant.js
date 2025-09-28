// nutrition-service/models/MealPlan.js (Planes de Comidas del Usuario)

const db = require('../../config/database');
const MEAL_PLAN_TABLE = 'planes_comida_usuarios'; // Suponiendo la tabla de planes personalizados

/**
 * Obtiene el plan de comidas para el día de un perfil.
 */
async function getMealPlanForToday(perfilId) {
    // Esta consulta sería compleja, probablemente involucraría una tabla de unión
    // entre el plan y los alimentos. Aquí solo un ejemplo simple.
    const queryText = `
        SELECT *
        FROM ${MEAL_PLAN_TABLE}
        WHERE perfil_id = $1 AND fecha = CURRENT_DATE;
    `;
    const res = await db.query(queryText, [perfilId]);
    return res.rows[0];
}

module.exports = {
    getMealPlanForToday
};