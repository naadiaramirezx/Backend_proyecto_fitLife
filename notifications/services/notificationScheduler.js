// notifications/services/notificationScheduler.js

const cron = require('node-cron');
const { createNotification } = require('../models/Notification');
const db = require('../../config/database');

// La tabla 'suscripciones' está en el 'plans-service' pero la consultamos desde aquí.
const SUBSCRIPTIONS_TABLE = 'suscripciones';

/**
 * Tarea programada que verifica las suscripciones a punto de expirar y
 * crea registros de notificación para ellas.
 */
async function checkSubscriptionExpiry() {
    // Definimos el umbral: planes que expiran en los próximos 7 días
    const THRESHOLD_DAYS = 7;
    
    // Consulta para encontrar suscripciones que terminan pronto
    const queryText = `
        SELECT perfil_id, plan_id, fecha_fin
        FROM ${SUBSCRIPTIONS_TABLE}
        WHERE fecha_fin > NOW() 
        AND fecha_fin <= NOW() + interval '${THRESHOLD_DAYS} days';
    `;

    try {
        const res = await db.query(queryText);
        
        if (res.rows.length > 0) {
            console.log(`[Scheduler] Encontradas ${res.rows.length} suscripciones a expirar.`);
            
            for (const row of res.rows) {
                const daysLeft = Math.ceil((new Date(row.fecha_fin) - new Date()) / (1000 * 60 * 60 * 24));
                const title = "¡Alerta de Expiración de Plan!";
                const body = `Tu plan expira en ${daysLeft} días, el ${row.fecha_fin.toLocaleDateString()}. ¡Renueva ahora!`;

                // Crea el registro de notificación en la tabla 'notifications'
                await createNotification(
                    row.perfil_id,
                    title,
                    body,
                    'SUBSCRIPTION_EXPIRY'
                );
            }
        }
    } catch (error) {
        console.error('Error en el scheduler de expiración de suscripciones:', error);
    }
}

/**
 * Inicia todas las tareas programadas del servicio de notificaciones.
 */
function startSchedulers() {
    // Ejecutar la verificación de expiración todos los días a las 2:00 AM
    cron.schedule('0 2 * * *', () => {
        console.log('Ejecutando tarea de verificación de expiración...');
        checkSubscriptionExpiry();
    }, {
        scheduled: true,
        timezone: "America/Mexico_City" // Usar la zona horaria de tu servidor o cliente objetivo
    });

    console.log('El programador de notificaciones se ha iniciado.');
}

module.exports = {
    startSchedulers,
    checkSubscriptionExpiry
};