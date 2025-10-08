const { supabaseAdmin } = require("../../config/supabaseClient")

class NotificationPreference {
  constructor(data) {
    this.user_id = data.user_id
    this.push_enabled = data.push_enabled
    this.email_enabled = data.email_enabled
    this.sms_enabled = data.sms_enabled
    this.audio_preferences = data.audio_preferences
    this.device_tokens = data.device_tokens
    this.quiet_hours = data.quiet_hours
    this.timezone = data.timezone
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null // No rows returned
        throw error
      }

      return new NotificationPreference(data)
    } catch (error) {
      throw error
    }
  }

  static async create(userId, preferences = {}) {
    try {
      const defaultAudioPreferences = {
        enabled: true,
        volume: 80,
        sounds: {
          login: "login.mp3",
          workout_reminder: "workout.mp3",
          achievement: "achievement.mp3",
          reminder: "reminder.mp3",
          overdue: "overdue.mp3",
        },
      }

      const { data, error } = await supabaseAdmin
        .from("notification_preferences")
        .insert([
          {
            user_id: userId,
            push_enabled: preferences.push_enabled !== undefined ? preferences.push_enabled : true,
            email_enabled: preferences.email_enabled !== undefined ? preferences.email_enabled : true,
            sms_enabled: preferences.sms_enabled !== undefined ? preferences.sms_enabled : false,
            audio_preferences: preferences.audio_preferences || defaultAudioPreferences,
            device_tokens: preferences.device_tokens || [],
            quiet_hours: preferences.quiet_hours || { enabled: false, start: "22:00", end: "08:00" },
            timezone: preferences.timezone || "America/Mexico_City",
          },
        ])
        .select()
        .single()

      if (error) throw error
      return new NotificationPreference(data)
    } catch (error) {
      throw error
    }
  }

  static async update(userId, updates) {
    try {
      const updateData = {}

      if (updates.push_enabled !== undefined) updateData.push_enabled = updates.push_enabled
      if (updates.email_enabled !== undefined) updateData.email_enabled = updates.email_enabled
      if (updates.sms_enabled !== undefined) updateData.sms_enabled = updates.sms_enabled
      if (updates.audio_preferences) updateData.audio_preferences = updates.audio_preferences
      if (updates.device_tokens) updateData.device_tokens = updates.device_tokens
      if (updates.quiet_hours) updateData.quiet_hours = updates.quiet_hours
      if (updates.timezone) updateData.timezone = updates.timezone

      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from("notification_preferences")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) throw error
      return new NotificationPreference(data)
    } catch (error) {
      throw error
    }
  }

  static async addDeviceToken(userId, tokenData) {
    try {
      const prefs = await NotificationPreference.findByUserId(userId)

      if (!prefs) {
        return await NotificationPreference.create(userId, {
          device_tokens: [tokenData],
        })
      }

      const tokens = prefs.device_tokens || []
      const existingIndex = tokens.findIndex((t) => t.token === tokenData.token)

      if (existingIndex >= 0) {
        tokens[existingIndex] = { ...tokens[existingIndex], ...tokenData, lastUsed: new Date().toISOString() }
      } else {
        tokens.push({ ...tokenData, addedAt: new Date().toISOString(), lastUsed: new Date().toISOString() })
      }

      return await NotificationPreference.update(userId, { device_tokens: tokens })
    } catch (error) {
      throw error
    }
  }

  static async removeDeviceToken(userId, token) {
    try {
      const prefs = await NotificationPreference.findByUserId(userId)

      if (!prefs) {
        return null
      }

      const tokens = (prefs.device_tokens || []).filter((t) => t.token !== token)
      return await NotificationPreference.update(userId, { device_tokens: tokens })
    } catch (error) {
      throw error
    }
  }
}

module.exports = NotificationPreference
