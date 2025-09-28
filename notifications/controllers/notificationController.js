// notifications/controllers/notificationController.js

const notificationServices = require('../services/notificationServices');
// Para propósitos de este ejemplo, usaremos un perfilId fijo.
// En una app real, lo obtendrías del token JWT del usuario autenticado.
const MOCK_PROFILE_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; 

async function getPreferences(req, res) {
    try {
        // En una app real, usarías req.perfilId de un token JWT
        const perfilId = MOCK_PROFILE_ID; 
        const preferences = await notificationServices.getPreferences(perfilId);
        
        if (!preferences) {
            return res.status(404).json({ message: 'Preferencias no encontradas' });
        }
        res.status(200).json(preferences);
    } catch (error) {
        console.error('Error al obtener preferencias:', error);
        res.status(500).json({ error: 'Fallo interno del servidor' });
    }
}

async function updatePreferences(req, res) {
    try {
        const perfilId = MOCK_PROFILE_ID;
        const { email_enabled, push_enabled } = req.body;
        
        const updatedPrefs = await notificationServices.updatePreferences(perfilId, { 
            email_enabled, 
            push_enabled 
        });
        
        res.status(200).json({ message: 'Preferencias actualizadas', data: updatedPrefs });
    } catch (error) {
        console.error('Error al actualizar preferencias:', error);
        res.status(500).json({ error: 'Fallo interno del servidor' });
    }
}

module.exports = {
    getPreferences,
    updatePreferences,
};