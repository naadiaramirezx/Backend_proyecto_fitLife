require("dotenv").config()

const express = require("express")
const cors = require("cors")
const nutritionRoutes = require("./routes/nutritionRoutes")

const app = express()
const PORT = process.env.PORT || 3003

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/nutrition", nutritionRoutes)

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "nutrition-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Nutrition Service running on port ${PORT}`)
  console.log(`Health check available at http://localhost:${PORT}/health`)
})

module.exports = app
