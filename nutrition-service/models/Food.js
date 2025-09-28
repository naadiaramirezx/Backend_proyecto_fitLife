// nutrition-service/models/Food.js (Catálogo de Alimentos)

const db = require('../../config/database');
const FOOD_TABLE = 'catalogo_alimentos'; // Suponiendo una tabla con datos nutricionales

/**
 * Busca alimentos por nombre (usado para auto-completado).
 */
async function searchFoods(query) {
    const queryText = `
        SELECT id, nombre, calorias, proteinas, carbohidratos, grasas
        FROM ${FOOD_TABLE}
        WHERE nombre ILIKE $1 
        LIMIT 20;
    `;
    // ILIKE es la forma de PostgreSQL de hacer un LIKE (case-insensitive)
    const res = await db.query(queryText, [`%${query}%`]); 
    return res.rows;
}

module.exports = {
    searchFoods
};