const Notification = require("../models/Notification")
const NotificationService = require("./notificationServices")

class NotificationScheduler {
  async processScheduledNotifications() {
    try {
      const pendingNotifications = await Notification.findPendingNotifications()

      console.log(`Procesando ${pendingNotifications.length} notificaciones pendientes`)

      for (const notification of pendingNotifications) {
        await NotificationService.sendNotification(notification)
      }

      return pendingNotifications.length
    } catch (error) {
      console.error("Error procesando notificaciones programadas:", error)
      return 0
    }
  }
}

module.exports = new NotificationScheduler()
