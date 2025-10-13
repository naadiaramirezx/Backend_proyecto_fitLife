require("dotenv").config()
const express = require("express")
const cors = require("cors")
const planRoutes = require("./routers/planRoutes") // ← OJO: routes (no routers)

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())

app.use("/api/plans", planRoutes)

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "plans-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
    port: PORT,
  })
})

app.listen(PORT, () => {
  console.log(`💪 Plans Service running on port ${PORT}`)
  console.log(`❤️  Health check: http://localhost:${PORT}/health`)
})

module.exports = app
