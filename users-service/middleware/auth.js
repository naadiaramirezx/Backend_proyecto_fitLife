// users-service/middleware/auth.js

const jwt = require('jsonwebtoken');
// Nota: Necesitarás el paquete 'jsonwebtoken'
const SECRET_KEY = process.env.JWT_SECRET; // Clave secreta definida en .env

/**
 * Middleware para verificar un JWT y adjuntar el perfilId al request.
 */
function authenticateToken(req, res, next) {
    // 1. Obtener el token del header (Bearer Token)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Espera "Bearer [TOKEN]"

    if (token == null) {
        return res.status(401).json({ message: 'Token de acceso requerido' }); // No autorizado
    }

    // 2. Verificar el token
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            // El token es inválido o ha expirado
            return res.status(403).json({ message: 'Token inválido o expirado' }); // Prohibido
        }
        
        // 3. Adjuntar IDs al request para que el controlador los use
        req.id_usuario = user.id_usuario;
        req.perfil_id = user.perfil_id;
        
        next(); // Continuar al controlador
    });
}

module.exports = {
    authenticateToken,
};