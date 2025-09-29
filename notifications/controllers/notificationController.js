const Notification = require("../models/Notification")
const NotificationPreference = require("../models/NotificationPreference")
const NotificationService = require("../services/notificationService")

class NotificationController {
  // RF09: Enviar notificaciones para recordar rutinas
  async sendWorkoutReminder(req, res) {
    try {
      const { userId, workoutName, scheduledTime } = req.body

      if (!userId || !workoutName) {
        return res.status(400).json({
          success: false,
          message: "userId y workoutName son requeridos",
        })
      }

      const notification = new Notification({
        userId,
        type: "workout_reminder",
        title: "¡Hora de entrenar! 💪",
        message: `Es momento de realizar tu rutina: ${workoutName}`,
        scheduledFor: scheduledTime ? new Date(scheduledTime) : new Date(),
        channels: ["push"],
        data: {
          workoutName,
          actionType: "start_workout",
        },
        actionUrl: "/workouts/start",
      })

      await notification.save()

      // Enviar inmediatamente si no hay tiempo programado
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

  // Enviar recordatorio de comida
  async sendMealReminder(req, res) {
    try {
      const { userId, mealType, scheduledTime } = req.body

      if (!userId || !mealType) {
        return res.status(400).json({
          success: false,
          message: "userId y mealType son requeridos",
        })
      }

      const mealNames = {
        breakfast: "desayuno",
        lunch: "almuerzo",
        dinner: "cena",
        snack: "snack",
      }

      const notification = new Notification({
        userId,
        type: "meal_reminder",
        title: `Hora de tu ${mealNames[mealType]} 🍽️`,
        message: `No olvides registrar tu ${mealNames[mealType]} para mantener tu seguimiento nutricional`,
        scheduledFor: scheduledTime ? new Date(scheduledTime) : new Date(),
        channels: ["push"],
        data: {
          mealType,
          actionType: "log_meal",
        },
        actionUrl: "/nutrition/log",
      })

      await notification.save()

      if (!scheduledTime) {
        await NotificationService.sendNotification(notification)
      }

      res.status(201).json({
        success: true,
        message: "Recordatorio de comida programado exitosamente",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando recordatorio de comida:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF10: Enviar alerta de salud
  async sendHealthAlert(req, res) {
    try {
      const { userId, alertType, value, severity, message } = req.body

      if (!userId || !alertType || !severity) {
        return res.status(400).json({
          success: false,
          message: "userId, alertType y severity son requeridos",
        })
      }

      const alertTitles = {
        heart_rate: "⚠️ Alerta de Ritmo Cardíaco",
        temperature: "🌡️ Alerta de Temperatura",
        blood_oxygen: "🫁 Alerta de Oxígeno en Sangre",
        blood_pressure: "💓 Alerta de Presión Arterial",
      }

      const notification = new Notification({
        userId,
        type: "health_alert",
        title: alertTitles[alertType] || "⚠️ Alerta de Salud",
        message: message || `Se ha detectado un valor anormal en ${alertType}: ${value}`,
        priority: severity === "urgent" ? "urgent" : "high",
        scheduledFor: new Date(),
        channels: severity === "urgent" ? ["push", "sms"] : ["push"],
        data: {
          alertType,
          value,
          severity,
          timestamp: new Date(),
        },
      })

      await notification.save()
      await NotificationService.sendNotification(notification)

      res.status(201).json({
        success: true,
        message: "Alerta de salud enviada exitosamente",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando alerta de salud:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Enviar notificación de logro
  async sendAchievementNotification(req, res) {
    try {
      const { userId, achievementType, description } = req.body

      if (!userId || !achievementType) {
        return res.status(400).json({
          success: false,
          message: "userId y achievementType son requeridos",
        })
      }

      const notification = new Notification({
        userId,
        type: "achievement",
        title: "🎉 ¡Felicitaciones!",
        message: description || `Has desbloqueado un nuevo logro: ${achievementType}`,
        priority: "medium",
        scheduledFor: new Date(),
        channels: ["push"],
        data: {
          achievementType,
          unlockedAt: new Date(),
        },
        actionUrl: "/achievements",
      })

      await notification.save()
      await NotificationService.sendNotification(notification)

      res.status(201).json({
        success: true,
        message: "Notificación de logro enviada exitosamente",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando notificación de logro:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener notificaciones del usuario
  async getUserNotifications(req, res) {
    try {
      const { userId } = req.params
      const { status, type, page = 1, limit = 20 } = req.query

      const query = { userId }

      if (status) query.status = status
      if (type) query.type = type

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)

      const total = await Notification.countDocuments(query)
      const unreadCount = await Notification.countDocuments({
        userId,
        status: { $in: ["sent", "delivered"] },
      })

      res.status(200).json({
        success: true,
        data: {
          notifications,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
          },
          unreadCount,
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

  // Marcar notificación como leída
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params

      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          status: "read",
          readAt: new Date(),
        },
        { new: true },
      )

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notificación no encontrada",
        })
      }

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

  // Obtener preferencias de notificación
  async getNotificationPreferences(req, res) {
    try {
      const { userId } = req.params

      let preferences = await NotificationPreference.findOne({ userId })

      if (!preferences) {
        // Crear preferencias por defecto
        preferences = new NotificationPreference({ userId })
        await preferences.save()
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

  // Actualizar preferencias de notificación
  async updateNotificationPreferences(req, res) {
    try {
      const { userId } = req.params
      const { preferences } = req.body

      const updatedPreferences = await NotificationPreference.findOneAndUpdate(
        { userId },
        { $set: { preferences } },
        { new: true, upsert: true },
      )

      res.status(200).json({
        success: true,
        message: "Preferencias actualizadas exitosamente",
        data: { preferences: updatedPreferences },
      })
    } catch (error) {
      console.error("Error actualizando preferencias:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Enviar resumen semanal
  async sendWeeklySummary(req, res) {
    try {
      const { userId, summaryData } = req.body

      if (!userId || !summaryData) {
        return res.status(400).json({
          success: false,
          message: "userId y summaryData son requeridos",
        })
      }

      const notification = new Notification({
        userId,
        type: "weekly_summary",
        title: "📊 Tu Resumen Semanal",
        message: "Revisa tu progreso de la semana y planifica la siguiente",
        priority: "low",
        scheduledFor: new Date(),
        channels: ["push", "email"],
        data: summaryData,
        actionUrl: "/dashboard/weekly-report",
      })

      await notification.save()
      await NotificationService.sendNotification(notification)

      res.status(201).json({
        success: true,
        message: "Resumen semanal enviado exitosamente",
        data: { notification },
      })
    } catch (error) {
      console.error("Error enviando resumen semanal:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }
}

module.exports = new NotificationController()
