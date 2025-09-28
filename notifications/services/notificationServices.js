// notifications/services/notificationServices.js

const db = require('../../config/database');

// Obtener las preferencias de un usuario
async function getPreferences(perfilId) {
    const queryText = `
        SELECT email_enabled, push_enabled 
        FROM notification_preferences 
        WHERE perfil_id = $1
    `;
    const res = await db.query(queryText, [perfilId]);
    return res.rows[0];
}

// Actualizar las preferencias
async function updatePreferences(perfilId, prefs) {
    const queryText = `
        INSERT INTO notification_preferences (perfil_id, email_enabled, push_enabled)
        VALUES ($1, $2, $3)
        ON CONFLICT (perfil_id) 
        DO UPDATE SET 
            email_enabled = EXCLUDED.email_enabled, 
            push_enabled = EXCLUDED.push_enabled
        RETURNING *;
    `;
    const values = [perfilId, prefs.email_enabled, prefs.push_enabled];
    const res = await db.query(queryText, values);
    return res.rows[0];
}

module.exports = {
    getPreferences,
    updatePreferences
    // ... otras funciones de programación de notificaciones
};