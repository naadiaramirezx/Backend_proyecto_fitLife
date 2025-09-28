// plans-services/models/UserPlan.js

const db = require('../../config/database');

const TABLE_NAME = 'tabla_suscripciones';

/**
 * Crea una nueva suscripción para un usuario (perfil).
 * Asume que el estado '1' es 'activo' (de tabla_estatus).
 */
async function createSubscription(perfilId, planId, fechaFin) {
    const estadoActivo = 1; 
    const queryText = `
        INSERT INTO ${TABLE_NAME} (plan_id, fecha_inicio, fecha_fin, perfil_id, estado_id)
        VALUES ($1, NOW(), $2, $3, $4)
        RETURNING *;
    `;
    const values = [planId, fechaFin, perfilId, estadoActivo];
    const res = await db.query(queryText, values);
    return res.rows[0];
}

/**
 * Obtiene el plan activo actual del usuario.
 */
async function getActiveSubscription(perfilId) {
    const estadoActivo = 1;
    const queryText = `
        SELECT 
            s.id_suscripcion, 
            s.fecha_inicio, 
            s.fecha_fin,
            p.nombre AS plan_nombre,
            p.duracion_dias
        FROM ${TABLE_NAME} s
        JOIN tabla_planes p ON s.plan_id = p.id_plan
        WHERE s.perfil_id = $1 AND s.estado_id = $2 AND s.fecha_fin > NOW()
        LIMIT 1;
    `;
    const res = await db.query(queryText, [perfilId, estadoActivo]);
    return res.rows[0];
}

module.exports = {
    createSubscription,
    getActiveSubscription,
    // Aquí irían funciones como endSubscription, renewSubscription, etc.
};