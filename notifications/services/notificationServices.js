const NotificationPreference = require("../models/NotificationPreference")
const { supabase } = require("../../config/supabaseClient")

class NotificationService {
  async sendNotification(notification) {
    try {
      const preferences = await NotificationPreference.findByUserId(notification.user_id)

      if (!preferences) {
        console.log(`Usuario ${notification.user_id} no tiene preferencias configuradas`)
        return { success: false, reason: "no_preferences" }
      }

      // Verificar horario de silencio
      if (this.isQuietHours(preferences)) {
        console.log(`Usuario ${notification.user_id} en horario de silencio`)
        return { success: false, reason: "quiet_hours" }
      }

      const results = []

      // Enviar push notification si está habilitado
      if (preferences.push_enabled && preferences.device_tokens?.length > 0) {
        const pushResult = await this.sendPushNotification(notification, preferences)
        results.push(pushResult)
      }

      // Enviar email si está habilitado
      if (preferences.email_enabled) {
        const emailResult = await this.sendEmailNotification(notification)
        results.push(emailResult)
      }

      // Enviar SMS si está habilitado
      if (preferences.sms_enabled) {
        const smsResult = await this.sendSMSNotification(notification)
        results.push(smsResult)
      }

      // Marcar como enviada
      await notification.markAsSent()

      return { success: true, results }
    } catch (error) {
      console.error("Error enviando notificación:", error)
      return { success: false, error: error.message }
    }
  }

  async sendPushNotification(notification, preferences) {
    try {
      const audioPrefs = preferences.audio_preferences || {}
      const sound = audioPrefs.enabled ? notification.data?.sound || "default.mp3" : null

      const tokens = preferences.device_tokens.filter((t) => t.active !== false).map((t) => t.token)

      if (tokens.length === 0) {
        return { success: false, channel: "push", reason: "no_active_tokens" }
      }

      console.log(`[PUSH] Simulando envío a ${tokens.length} dispositivos`)
      console.log(`[PUSH] Título: ${notification.title}`)
      console.log(`[PUSH] Mensaje: ${notification.message}`)
      console.log(`[PUSH] Sound: ${sound || "none"}`)

      return {
        success: true,
        channel: "push",
        successCount: tokens.length,
        failureCount: 0,
        simulated: true,
      }
    } catch (error) {
      console.error("[PUSH] Error:", error)
      return { success: false, channel: "push", error: error.message }
    }
  }

  async sendEmailNotification(notification) {
    try {
      console.log(`[EMAIL] ${notification.title}: ${notification.message}`)
      await new Promise((resolve) => setTimeout(resolve, 200))
      return { success: true, channel: "email", simulated: true }
    } catch (error) {
      console.error("[EMAIL] Error:", error)
      return { success: false, channel: "email", error: error.message }
    }
  }

  async sendSMSNotification(notification) {
    try {
      console.log(`[SMS] ${notification.title}: ${notification.message}`)
      await new Promise((resolve) => setTimeout(resolve, 150))
      return { success: true, channel: "sms", simulated: true }
    } catch (error) {
      console.error("[SMS] Error:", error)
      return { success: false, channel: "sms", error: error.message }
    }
  }

  isQuietHours(preferences) {
    if (!preferences.quiet_hours?.enabled) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()

    const [startHour, startMin] = preferences.quiet_hours.start.split(":").map(Number)
    const [endHour, endMin] = preferences.quiet_hours.end.split(":").map(Number)

    const startTime = startHour * 60 + startMin
    const endTime = endHour * 60 + endMin

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime < endTime
    } else {
      return currentTime >= startTime || currentTime < endTime
    }
  }
}

module.exports = new NotificationService()
