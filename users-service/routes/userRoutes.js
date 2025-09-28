// users-service/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Rutas Públicas (No requieren token)
router.post('/register', userController.register);
router.post('/login', userController.login);

// Ruta Privada (Requiere token)
// La solicitud pasa por el middleware de autenticación antes de llegar al controlador
router.get('/profile', authenticateToken, userController.getProfile); 

module.exports = router;