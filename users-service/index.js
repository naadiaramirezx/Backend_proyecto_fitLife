require("dotenv").config()

const express = require("express")
const cors = require("cors")
const userRoutes = require("./routes/userRoutes")

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/users", userRoutes)

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "users-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err)
  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  })
})

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
  })
})

app.listen(PORT, () => {
  console.log(`Users Service running on port ${PORT}`)
})

module.exports = app
