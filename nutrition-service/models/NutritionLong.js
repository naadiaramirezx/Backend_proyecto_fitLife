// nutrition-service/models/NutritionLong.js (Mediciones Corporales)

const db = require('../../config/database'); // Conexión a Supabase/PostgreSQL

const TABLE_NAME = 'mediciones_corporales';

/**
 * Registra una nueva medición corporal (peso/altura) para un perfil.
 */
async function createMeasurement(perfilId, peso, altura) {
    const queryText = `
        INSERT INTO ${TABLE_NAME} (perfil_id, peso, altura, fecha)
        VALUES ($1, $2, $3, NOW())
        RETURNING *;
    `;
    const values = [perfilId, peso, altura];
    const res = await db.query(queryText, values);
    return res.rows[0];
}

/**
 * Obtiene el historial completo de mediciones para un perfil.
 */
async function getMeasurementHistory(perfilId) {
    const queryText = `
        SELECT peso, altura, fecha, created_at
        FROM ${TABLE_NAME}
        WHERE perfil_id = $1
        ORDER BY fecha DESC, created_at DESC;
    `;
    const res = await db.query(queryText, [perfilId]);
    return res.rows;
}

module.exports = {
    createMeasurement,
    getMeasurementHistory,
};