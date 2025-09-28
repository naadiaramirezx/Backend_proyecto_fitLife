// wearables-service/models/HealthData.js

const db = require('../../config/database');
const DATA_TABLE = 'datos_salud';

/**
 * Inserta un registro único de datos de salud (ej: 1000 pasos a las 10:00 AM).
 */
async function insertHealthRecord(perfilId, dispositivoId, tipoMedida, valor, timestamp) {
    const queryText = `
        INSERT INTO ${DATA_TABLE} (perfil_id, dispositivo_id, tipo_medida, valor, timestamp)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [perfilId, dispositivoId, tipoMedida, valor, timestamp];
    const res = await db.query(queryText, values);
    return res.rows[0];
}

/**
 * Obtiene datos de salud de un tipo específico (ej: Frecuencia Cardiaca) en un rango de tiempo.
 */
async function getHealthDataByType(perfilId, tipoMedida, startDate, endDate) {
    const queryText = `
        SELECT valor, timestamp
        FROM ${DATA_TABLE}
        WHERE perfil_id = $1 
        AND tipo_medida = $2
        AND timestamp >= $3
        AND timestamp <= $4
        ORDER BY timestamp ASC;
    `;
    const values = [perfilId, tipoMedida, startDate, endDate];
    const res = await db.query(queryText, values);
    return res.rows;
}

module.exports = {
    insertHealthRecord,
    getHealthDataByType,
    // Aquí iría la función para inserción masiva (insertBatchHealthRecords)
};