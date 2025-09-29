const { Pool } = require("pg")

// Configuración de la conexión a PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Función para ejecutar queries
const query = async (text, params) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Executed query", { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Función para obtener un cliente del pool
const getClient = async () => {
  return await pool.connect()
}

// Función para cerrar el pool
const end = async () => {
  await pool.end()
}

module.exports = {
  query,
  getClient,
  end,
  pool,
}
