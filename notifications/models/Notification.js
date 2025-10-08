const { supabaseAdmin } = require("../../config/supabaseClient")

class Notification {
  constructor(notificationData) {
    this.id = notificationData.id
    this.user_id = notificationData.user_id
    this.type = notificationData.type
    this.title = notificationData.title
    this.message = notificationData.message
    this.data = notificationData.data
    this.is_read = notificationData.is_read
    this.scheduled_for = notificationData.scheduled_for
    this.sent_at = notificationData.sent_at
    this.created_at = notificationData.created_at
  }

  static async create(notificationData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .insert([
          {
            user_id: notificationData.user_id,
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            data: notificationData.data || {},
            scheduled_for: notificationData.scheduled_for || new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      return new Notification(data)
    } catch (error) {
      throw error
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data.map((row) => new Notification(row))
    } catch (error) {
      throw error
    }
  }

  static async findUnreadByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data.map((row) => new Notification(row))
    } catch (error) {
      throw error
    }
  }

  async markAsRead() {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({ is_read: true })
        .eq("id", this.id)
        .select()
        .single()

      if (error) throw error
      this.is_read = true
      return this
    } catch (error) {
      throw error
    }
  }

  async markAsSent() {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", this.id)
        .select()
        .single()

      if (error) throw error
      this.sent_at = data.sent_at
      return this
    } catch (error) {
      throw error
    }
  }

  static async findPendingNotifications() {
    try {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .select("*")
        .is("sent_at", null)
        .lte("scheduled_for", new Date().toISOString())
        .order("scheduled_for", { ascending: true })

      if (error) throw error
      return data.map((row) => new Notification(row))
    } catch (error) {
      throw error
    }
  }

  async delete() {
    try {
      const { error } = await supabaseAdmin.from("notifications").delete().eq("id", this.id)

      if (error) throw error
      return true
    } catch (error) {
      throw error
    }
  }
}

module.exports = Notification
