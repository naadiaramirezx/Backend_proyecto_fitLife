const express = require("express")
const cors = require("cors")
const planRoutes = require("./routes/planRoutes")

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/plans", planRoutes)

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "plans-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Plans Service running on port ${PORT}`)
})

module.exports = app
