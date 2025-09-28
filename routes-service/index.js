const express = require("express")
const cors = require("cors")
const routeRoutes = require("./routes/routeRoutes")

const app = express()
const PORT = process.env.ROUTES_SERVICE_PORT || 3005

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
    credentials: true,
  }),
)
app.use(express.json())

// Routes
app.use("/api/routes", routeRoutes)

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "routes-service",
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Routes service running on port ${PORT}`)
})

module.exports = app
