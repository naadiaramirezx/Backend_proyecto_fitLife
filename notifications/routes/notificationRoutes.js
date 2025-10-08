const express = require("express")
const notificationController = require("../controllers/notificationController")

const router = express.Router()

// Enviar notificaciones específicas
router.post("/workout-reminder", notificationController.sendWorkoutReminder)
router.post("/login", notificationController.sendLoginNotification)
router.post("/overdue", notificationController.sendOverdueReminder)

// Gestionar notificaciones del usuario
router.get("/user/:userId", notificationController.getUserNotifications)
router.put("/:notificationId/read", notificationController.markAsRead)

// Preferencias de notificación
router.get("/preferences/:userId", notificationController.getNotificationPreferences)
router.put("/preferences/:userId", notificationController.updateNotificationPreferences)
router.put("/preferences/:userId/audio", notificationController.updateAudioPreferences)

// Gestión de tokens de dispositivos
router.post("/preferences/:userId/device-token", notificationController.registerDeviceToken)
router.delete("/preferences/:userId/device-token", notificationController.removeDeviceToken)

module.exports = router
