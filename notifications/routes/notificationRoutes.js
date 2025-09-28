// notifications/routes/notificationRoutes.js

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Las rutas en una app real incluirían un middleware de autenticación (ej: checkAuth)

// GET /api/notifications/preferences
router.get('/preferences', notificationController.getPreferences);

// PUT /api/notifications/preferences
router.put('/preferences', notificationController.updatePreferences);

module.exports = router;