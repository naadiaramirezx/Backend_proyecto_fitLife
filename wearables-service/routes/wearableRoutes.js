// wearables-service/routes/wearableRoutes.js

const express = require('express');
const router = express.Router();
const wearableController = require('../Controllers/wearableController');
// Aquí importaríamos el middleware de autenticación del users-service:
// const { authenticateToken } = require('../../users-service/middleware/auth'); 

// ASUMIDO: Todas estas rutas están protegidas con authenticateToken

// Endpoints de Dispositivos
router.post('/devices', wearableController.registerDevice);
// router.get('/devices', wearableController.getDevices); // Obtener dispositivos registrados

// Endpoints de Datos de Salud
router.post('/data', wearableController.syncHealthData);
router.get('/data/history', wearableController.getDataHistory); // /data/history?type=Pasos&start=...

module.exports = router;