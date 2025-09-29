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

// Inicializar programador de notificaciones
const scheduler = new NotificationScheduler()

// Programar tareas de notificaciones
// Verificar notificaciones cada 5 minutos
cron.schedule("*/5 * * * *", () => {
  scheduler.processScheduledNotifications()
})

// Verificar recordatorios diarios a las 8:00 AM
cron.schedule("0 8 * * *", () => {
  scheduler.sendDailyReminders()
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
