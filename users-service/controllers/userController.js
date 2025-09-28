// users-service/controllers/userController.js

const UserModel = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.JWT_SECRET;

/**
 * POST /api/users/register
 * Registra un nuevo usuario y crea su perfil.
 */
async function register(req, res) {
    try {
        const { nombre, ap_paterno, ap_materno, telefono, correo, password } = req.body;

        if (!correo || !password || !nombre) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (correo, password, nombre).' });
        }
        
        const newUser = await UserModel.registerUser(nombre, ap_paterno, ap_materno, telefono, correo, password);

        // Generar un token para el usuario recién registrado
        const token = jwt.sign(
            { id_usuario: newUser.id_usuario, perfil_id: newUser.id_perfil }, 
            SECRET_KEY, 
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        res.status(201).json({ 
            message: 'Registro exitoso.',
            user: { id_usuario: newUser.id_usuario, correo: newUser.correo },
            token 
        });

    } catch (error) {
        if (error.code === '23505') { // Código de error de PostgreSQL para UNIQUE violation
            return res.status(409).json({ error: 'El correo electrónico ya está registrado.' });
        }
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Fallo interno del servidor durante el registro.' });
    }
}

/**
 * POST /api/users/login
 * Procesa el inicio de sesión.
 */
async function login(req, res) {
    try {
        const { correo, password } = req.body;

        const user = await UserModel.findUserByEmail(correo);

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Comparar la contraseña ingresada con el hash guardado
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Generar JWT para el usuario autenticado
        const token = jwt.sign(
            { id_usuario: user.id_usuario, perfil_id: user.perfil_id }, 
            SECRET_KEY, 
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            user: { id_usuario: user.id_usuario, perfil_id: user.perfil_id, correo: user.correo },
            token
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Fallo interno del servidor durante el login.' });
    }
}

/**
 * GET /api/users/profile
 * Obtiene los detalles del perfil del usuario logueado. Requiere token.
 */
async function getProfile(req, res) {
    try {
        // req.perfil_id viene del middleware/auth.js
        const perfilId = req.perfil_id; 

        const profile = await UserModel.getProfileDetails(perfilId);

        if (!profile) {
            return res.status(404).json({ message: 'Perfil no encontrado.' });
        }

        res.status(200).json(profile);
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ error: 'Fallo interno del servidor al obtener perfil.' });
    }
}


module.exports = {
    register,
    login,
    getProfile,
    // Exportar otras funciones de controlador (updateProfile, changePassword)
};