// plans-services/models/Plan.js

const db = require('../../config/database');

// Tablas: tabla_planes, tabla_ejercicios, planes_detalles

/**
 * Obtiene todos los planes de ejercicio disponibles.
 */
async function getAllPlans() {
    const queryText = `
        SELECT id_plan, nombre, duracion_dias, objetivo, precio
        FROM tabla_planes
        ORDER BY precio ASC;
    `;
    const res = await db.query(queryText);
    return res.rows;
}

/**
 * Obtiene los detalles de un plan específico (ejercicios, series, repeticiones).
 */
async function getPlanDetails(planId) {
    const queryText = `
        SELECT 
            pd.dia_semana, 
            pd.orden, 
            pd.series, 
            pd.repeticiones,
            e.nombre AS ejercicio_nombre,
            e.descripcion,
            e.tipo_ejercicio
        FROM planes_detalles pd
        JOIN tabla_ejercicios e ON pd.ejercicio_id = e.id_ejercicio
        WHERE pd.plan_id = $1
        ORDER BY pd.dia_semana, pd.orden;
    `;
    const res = await db.query(queryText, [planId]);
    return res.rows;
}

module.exports = {
    getAllPlans,
    getPlanDetails,
};