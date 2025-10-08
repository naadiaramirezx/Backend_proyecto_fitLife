const Notification = require("../models/Notification")
const NotificationPreference = require("../models/NotificationPreference")
const NotificationService = require("../services/notificationServices");


class NotificationController {
  async sendWorkoutReminder(req, res) {
    try {
      const { userId, workoutName, scheduledTime } = req.body

      if (!userId || !workoutName) {
        return res.status(400).json({
          success: false,
          message: "userId y workoutName son requeridos",
        })
      }

      const notification = await Notification.create({
        user_id: userId,
        type: "workout_reminder",
        title: "¡Hora de entrenar! 💪",
        message: `Es momento de realizar tu rutina: ${workoutName}`,
        scheduled_for: scheduledTime ? new Date(scheduledTime) : new Date(),
        data: {
          workoutName,
          actionType: "start_workout",
          sound: "workout.mp3",
        },
      })

      if (!scheduledTime) {
        await NotificationService.sendNotification(notification)
      }

      res.status(201).json({
        success: true,
        message: "Recordatorio de rutina programado exitosamente",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando recordatorio de rutina:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async sendLoginNotification(req, res) {
    try {
      const { userId, deviceInfo } = req.body

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId es requerido",
        })
      }

      const notification = await Notification.create({
        user_id: userId,
        type: "login",
        title: "¡Bienvenido de vuelta! 👋",
        message: `Has iniciado sesión desde ${deviceInfo?.deviceName || "un dispositivo"}`,
        scheduled_for: new Date(),
        data: {
          deviceInfo,
          loginTime: new Date(),
          sound: "login.mp3",
        },
      })

      await NotificationService.sendNotification(notification)

      res.status(201).json({
        success: true,
        message: "Notificación de inicio de sesión enviada",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando notificación de login:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async sendOverdueReminder(req, res) {
    try {
      const { userId, taskName, daysOverdue } = req.body

      if (!userId || !taskName) {
        return res.status(400).json({
          success: false,
          message: "userId y taskName son requeridos",
        })
      }

      const notification = await Notification.create({
        user_id: userId,
        type: "overdue",
        title: "⚠️ Ejercicio atrasado",
        message: `Tienes ${taskName} atrasado por ${daysOverdue} día(s)`,
        scheduled_for: new Date(),
        data: {
          taskName,
          daysOverdue,
          sound: "overdue.mp3",
        },
      })

      await NotificationService.sendNotification(notification)

      res.status(201).json({
        success: true,
        message: "Recordatorio de atraso enviado",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando recordatorio de atraso:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params
      const { page = 1, limit = 20 } = req.query

      const offset = (page - 1) * limit
      const notifications = await Notification.findByUserId(userId, limit, offset)
      const unread = await Notification.findUnreadByUserId(userId)

      res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount: unread.length,
          pagination: {
            current: Number.parseInt(page),
            limit: Number.parseInt(limit),
          },
        },
      })
    } catch (error) {
      console.error("Error obteniendo notificaciones:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params

      const notifications = await Notification.findByUserId(req.user?.id || "")
      const notification = notifications.find((n) => n.id === notificationId)

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notificación no encontrada",
        })
      }

      await notification.markAsRead()

      res.status(200).json({
        success: true,
        message: "Notificación marcada como leída",
        data: { notification },
      })
    } catch (error) {
      console.error("Error marcando notificación como leída:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async getNotificationPreferences(req, res) {
    try {
      const { userId } = req.params

      let preferences = await NotificationPreference.findByUserId(userId)

      if (!preferences) {
        preferences = await NotificationPreference.create(userId)
      }

      res.status(200).json({
        success: true,
        data: { preferences },
      })
    } catch (error) {
      console.error("Error obteniendo preferencias:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async updateNotificationPreferences(req, res) {
    try {
      const { userId } = req.params
      const updates = req.body

      let preferences = await NotificationPreference.findByUserId(userId)

      if (!preferences) {
        preferences = await NotificationPreference.create(userId, updates)
      } else {
        preferences = await NotificationPreference.update(userId, updates)
      }

      res.status(200).json({
        success: true,
        message: "Preferencias actualizadas exitosamente",
        data: { preferences },
      })
    } catch (error) {
      console.error("Error actualizando preferencias:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async updateAudioPreferences(req, res) {
    try {
      const { userId } = req.params
      const { audioPreferences } = req.body

      const preferences = await NotificationPreference.update(userId, { audio_preferences: audioPreferences })

      res.status(200).json({
        success: true,
        message: "Preferencias de audio actualizadas",
        data: { preferences },
      })
    } catch (error) {
      console.error("Error actualizando preferencias de audio:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async registerDeviceToken(req, res) {
    try {
      const { userId } = req.params
      const tokenData = req.body

      if (!tokenData.token) {
        return res.status(400).json({
          success: false,
          message: "Token es requerido",
        })
      }

      const preferences = await NotificationPreference.addDeviceToken(userId, tokenData)

      res.status(200).json({
        success: true,
        message: "Token de dispositivo registrado",
        data: { preferences },
      })
    } catch (error) {
      console.error("Error registrando token:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async removeDeviceToken(req, res) {
    try {
      const { userId } = req.params
      const { token } = req.body

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token es requerido",
        })
      }

      const preferences = await NotificationPreference.removeDeviceToken(userId, token)

      res.status(200).json({
        success: true,
        message: "Token de dispositivo eliminado",
        data: { preferences },
      })
    } catch (error) {
      console.error("Error eliminando token:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }
}

module.exports = new NotificationController()
