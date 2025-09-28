// notifications/models/NotificationPreference.js

const NotificationPreference = {
    tableName: 'notification_preferences',
    columns: {
        perfil_id: 'UUID', 
        email_enabled: 'BOOLEAN',
        sms_enabled: 'BOOLEAN',
        push_enabled: 'BOOLEAN',
    }
};

module.exports = NotificationPreference;