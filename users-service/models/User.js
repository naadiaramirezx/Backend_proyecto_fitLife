// users-service/models/User.js

const db = require('../../config/database');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10; // Nivel de seguridad de bcrypt

const USUARIO_TABLE = 'tabla_usuario';
const PERFIL_TABLE = 'tabla_perfiles';

/**
 * 1. Crear un nuevo perfil y 2. crear el registro de usuario asociado.
 */
async function registerUser(nombre, ap_paterno, ap_materno, telefono, correo, password) {
    // Generar el hash de la contraseña antes de guardarla
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Usa una transacción para asegurar que ambos registros se creen o ninguno
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Crear el Perfil (datos personales)
        const perfilQuery = `
            INSERT INTO ${PERFIL_TABLE} (nombre, ap_paterno, ap_materno, telefono)
            VALUES ($1, $2, $3, $4)
            RETURNING id_perfil;
        `;
        const perfilValues = [nombre, ap_paterno, ap_materno, telefono];
        const perfilRes = await client.query(perfilQuery, perfilValues);
        const perfilId = perfilRes.rows[0].id_perfil;

        // 2. Crear el Usuario (credenciales)
        const usuarioQuery = `
            INSERT INTO ${USUARIO_TABLE} (correo, password, perfil_id)
            VALUES ($1, $2, $3)
            RETURNING id_usuario, correo;
        `;
        const usuarioValues = [correo, passwordHash, perfilId];
        const usuarioRes = await client.query(usuarioQuery, usuarioValues);

        await client.query('COMMIT');

        return { ...usuarioRes.rows[0], id_perfil: perfilId };

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

/**
 * Encuentra un usuario por correo para el proceso de login.
 */
async function findUserByEmail(correo) {
    const queryText = `
        SELECT id_usuario, correo, password, perfil_id 
        FROM ${USUARIO_TABLE}
        WHERE correo = $1;
    `;
    const res = await db.query(queryText, [correo]);
    return res.rows[0];
}

/**
 * Obtiene los datos del perfil (datos personales) de un usuario.
 */
async function getProfileDetails(perfilId) {
    const queryText = `
        SELECT id_perfil, nombre, ap_paterno, ap_materno, telefono
        FROM ${PERFIL_TABLE}
        WHERE id_perfil = $1;
    `;
    const res = await db.query(queryText, [perfilId]);
    return res.rows[0];
}

module.exports = {
    registerUser,
    findUserByEmail,
    getProfileDetails,
    // Aquí irían funciones para actualizar perfil, cambiar contraseña, etc.
};