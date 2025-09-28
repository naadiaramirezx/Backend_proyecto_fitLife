// plans-services/routes/planRoutes.js

const express = require('express');
const router = express.Router();
const planControllers = require('../controllers/planControllers');

// Middleware de autenticación (ASUMIDO: checkAuth)

// Endpoints Públicos (Ver catálogo)
router.get('/catalogue', planControllers.getAvailablePlans);
router.get('/:planId/details', planControllers.getPlanDetailsById);

// Endpoints Privados (Suscripciones, requieren autenticación)
router.get('/user/active', planControllers.getUserActivePlan);
router.post('/user/subscribe', planControllers.subscribeToPlan); 

module.exports = router;