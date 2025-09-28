// notifications/models/Notification.js

const db = require('../../config/database');

// Estructura de la tabla de Notificaciones
// NOTA: Esta tabla tendría que ser creada previamente con SQL en Supabase
// (perfil_id es una FK a la tabla 'perfiles')

const TABLE_NAME = 'notifications';

/**
 * Crea un registro de notificación en la base de datos
 * @param {string} perfilId - ID del usuario a notificar
 * @param {string} title - Título de la notificación
 * @param {string} body - Contenido del mensaje
 * @param {string} type - Tipo de notificación (e.g., 'SUBSCRIPTION_EXPIRY', 'WORKOUT_REMINDER')
 * @returns {Promise<object>} El registro de notificación creado
 */
async function createNotification(perfilId, title, body, type) {
    const queryText = `
        INSERT INTO ${TABLE_NAME} (perfil_id, title, body, type, is_sent)
        VALUES ($1, $2, $3, $4, FALSE)
        RETURNING *;
    `;
    const values = [perfilId, title, body, type];
    const res = await db.query(queryText, values);
    return res.rows[0];
}

/**
 * Obtiene notificaciones pendientes de envío
 * @returns {Promise<Array<object>>} Lista de notificaciones pendientes
 */
async function getPendingNotifications() {
    const queryText = `
        SELECT * FROM ${TABLE_NAME}
        WHERE is_sent = FALSE AND scheduled_at <= NOW();
    `;
    const res = await db.query(queryText);
    return res.rows;
}

/** Marca una notificación como enviada
 * @param {string} notificationId - ID de la notificación
 */
async function markAsSent(notificationId) {
    const queryText = `
        UPDATE ${TABLE_NAME}
        SET is_sent = TRUE, sent_at = NOW()
        WHERE id = $1;
    `;
    await db.query(queryText, [notificationId]);
}

module.exports = {
    createNotification,
    getPendingNotifications,
    markAsSent,
};