const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
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

app.listen(PORT, () => {
  console.log(`Users Service running on port ${PORT}`)
})

module.exports = app
