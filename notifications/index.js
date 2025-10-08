require('dotenv').config();

const express = require("express")
const cors = require("cors")
const cron = require("node-cron")
const notificationRoutes = require("./routes/notificationRoutes")
const NotificationScheduler = require("./services/notificationScheduler")

const app = express()
const PORT = process.env.PORT || 3005

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use("/api/notifications", notificationRoutes)

// Programar verificación de notificaciones cada 5 minutos
cron.schedule("*/5 * * * *", () => {
  console.log("Verificando notificaciones programadas...")
  NotificationScheduler.processScheduledNotifications()
})

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "notifications-service",
    status: "healthy",
    timestamp: new Date().toISOString(),
  })
})

app.listen(PORT, () => {
  console.log(`Notifications Service running on port ${PORT}`)
})

module.exports = app