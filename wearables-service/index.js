const express = require("express")
const cors = require("cors")
const wearableRoutes = require("./routes/wearableRoutes")

const app = express()
const PORT = process.env.PORT || 3004

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/wearables", wearableRoutes)

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "wearables-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Wearables Service running on port ${PORT}`)
})

module.exports = app
