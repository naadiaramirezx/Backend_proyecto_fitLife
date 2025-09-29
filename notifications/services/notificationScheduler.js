const Notification = require("../models/Notification")
const NotificationPreference = require("../models/NotificationPreference")
const NotificationService = require("./notificationService")

class NotificationScheduler {
  async processScheduledNotifications() {
    try {
      const now = new Date()

      // Buscar notificaciones programadas que deben enviarse
      const scheduledNotifications = await Notification.find({
        status: "pending",
        scheduledFor: { $lte: now },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: now } }],
      })

      console.log(`Procesando ${scheduledNotifications.length} notificaciones programadas`)

      for (const notification of scheduledNotifications) {
        await NotificationService.sendNotification(notification)
      }

      // Reintentar notificaciones fallidas
      await NotificationService.retryFailedNotifications()
    } catch (error) {
      console.error("Error procesando notificaciones programadas:", error)
    }
  }

  async sendDailyReminders() {
    try {
      console.log("Enviando recordatorios diarios...")

      // Obtener todos los usuarios con preferencias de notificación
      const userPreferences = await NotificationPreference.find({
        "preferences.workoutReminders.enabled": true,
      })

      for (const userPref of userPreferences) {
        await this.scheduleWorkoutReminders(userPref)
        await this.scheduleMealReminders(userPref)
        await this.scheduleWaterReminders(userPref)
      }
    } catch (error) {
      console.error("Error enviando recordatorios diarios:", error)
    }
  }

  async scheduleWorkoutReminders(userPreferences) {
    const { userId, preferences } = userPreferences
    const workoutPrefs = preferences.workoutReminders

    if (!workoutPrefs.enabled) return

    const today = new Date()
    const dayOfWeek = today.getDay()

    // Verificar si hoy es un día programado para entrenar
    if (workoutPrefs.daysOfWeek && workoutPrefs.daysOfWeek.length > 0) {
      if (!workoutPrefs.daysOfWeek.includes(dayOfWeek)) {
        return // No hay entrenamiento programado para hoy
      }
    }

    // Programar recordatorio de entrenamiento
    const [hours, minutes] = workoutPrefs.time.split(":")
    const scheduledTime = new Date()
    scheduledTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)

    // Solo programar si la hora aún no ha pasado
    if (scheduledTime > new Date()) {
      const notification = new Notification({
        userId,
        type: "workout_reminder",
        title: "💪 ¡Hora de entrenar!",
        message: "Es momento de realizar tu rutina de ejercicios programada",
        scheduledFor: scheduledTime,
        channels: workoutPrefs.channels,
        data: {
          reminderType: "daily_workout",
          dayOfWeek,
        },
        actionUrl: "/workouts",
      })

      await notification.save()
    }
  }

  async scheduleMealReminders(userPreferences) {
    const { userId, preferences } = userPreferences
    const mealPrefs = preferences.mealReminders

    if (!mealPrefs.enabled) return

    const meals = ["breakfast", "lunch", "dinner", "snack"]
    const mealNames = {
      breakfast: "desayuno",
      lunch: "almuerzo",
      dinner: "cena",
      snack: "snack",
    }

    for (const meal of meals) {
      const mealConfig = mealPrefs.meals[meal]

      if (mealConfig && mealConfig.enabled) {
        const [hours, minutes] = mealConfig.time.split(":")
        const scheduledTime = new Date()
        scheduledTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)

        // Solo programar si la hora aún no ha pasado
        if (scheduledTime > new Date()) {
          const notification = new Notification({
            userId,
            type: "meal_reminder",
            title: `🍽️ Hora de tu ${mealNames[meal]}`,
            message: `No olvides registrar tu ${mealNames[meal]} para mantener tu seguimiento nutricional`,
            scheduledFor: scheduledTime,
            channels: mealPrefs.channels,
            data: {
              mealType: meal,
              reminderType: "daily_meal",
            },
            actionUrl: "/nutrition/log",
          })

          await notification.save()
        }
      }
    }
  }

  async scheduleWaterReminders(userPreferences) {
    const { userId, preferences } = userPreferences
    const waterPrefs = preferences.waterReminders

    if (!waterPrefs.enabled) return

    const [startHours, startMinutes] = waterPrefs.startTime.split(":")
    const [endHours, endMinutes] = waterPrefs.endTime.split(":")

    const startTime = new Date()
    startTime.setHours(Number.parseInt(startHours), Number.parseInt(startMinutes), 0, 0)

    const endTime = new Date()
    endTime.setHours(Number.parseInt(endHours), Number.parseInt(endMinutes), 0, 0)

    const interval = waterPrefs.interval * 60 * 1000 // convertir a milisegundos
    let currentTime = new Date(startTime)

    while (currentTime < endTime) {
      // Solo programar si la hora aún no ha pasado
      if (currentTime > new Date()) {
        const notification = new Notification({
          userId,
          type: "water_reminder",
          title: "💧 Hora de hidratarte",
          message: "Recuerda beber agua para mantenerte hidratado",
          scheduledFor: new Date(currentTime),
          channels: waterPrefs.channels,
          data: {
            reminderType: "water_intake",
          },
          actionUrl: "/nutrition/water",
        })

        await notification.save()
      }

      currentTime = new Date(currentTime.getTime() + interval)
    }
  }
}

module.exports = NotificationScheduler
