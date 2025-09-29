const express = require("express")
const notificationController = require("../controllers/notificationController")

const router = express.Router()

// Rutas para enviar notificaciones específicas
router.post("/workout-reminder", notificationController.sendWorkoutReminder)
router.post("/meal-reminder", notificationController.sendMealReminder)
router.post("/health-alert", notificationController.sendHealthAlert)
router.post("/achievement", notificationController.sendAchievementNotification)
router.post("/weekly-summary", notificationController.sendWeeklySummary)

// Rutas para gestionar notificaciones del usuario
router.get("/user/:userId", notificationController.getUserNotifications)
router.put("/:notificationId/read", notificationController.markAsRead)

// Rutas para preferencias de notificación
router.get("/preferences/:userId", notificationController.getNotificationPreferences)
router.put("/preferences/:userId", notificationController.updateNotificationPreferences)

module.exports = router
