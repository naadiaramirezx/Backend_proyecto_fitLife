// wearables-service/models/Device.js

const db = require('../../config/database');
const DEVICE_TABLE = 'dispositivos';

/**
 * Registra un nuevo dispositivo wearable a un perfil.
 */
async function registerDevice(perfilId, fabricante, modelo, serialNumber) {
    const queryText = `
        INSERT INTO ${DEVICE_TABLE} (perfil_id, fabricante, modelo, serial_number)
        VALUES ($1, $2, $3, $4)
        RETURNING id_dispositivo, modelo;
    `;
    const values = [perfilId, fabricante, modelo, serialNumber];
    const res = await db.query(queryText, values);
    return res.rows[0];
}

/**
 * Obtiene todos los dispositivos registrados de un perfil.
 */
async function getRegisteredDevices(perfilId) {
    const queryText = `
        SELECT id_dispositivo, fabricante, modelo, last_sync
        FROM ${DEVICE_TABLE}
        WHERE perfil_id = $1;
    `;
    const res = await db.query(queryText, [perfilId]);
    return res.rows;
}

module.exports = {
    registerDevice,
    getRegisteredDevices,
    // Aquí iría la función para marcar la última sincronización (updateLastSync)
};