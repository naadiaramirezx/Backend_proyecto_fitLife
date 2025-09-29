const dbConnection = require("../../config/database")

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

  // Crear nueva notificación
  static async create(notificationData) {
    try {
      const query = `
        INSERT INTO notifications (user_id, type, title, message, data, scheduled_for)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `

      const values = [
        notificationData.user_id,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        JSON.stringify(notificationData.data || {}),
        notificationData.scheduled_for || new Date(),
      ]

      const result = await dbConnection.query(query, values)
      return new Notification(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar notificaciones por usuario
  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
      `
      const result = await dbConnection.query(query, [userId, limit, offset])

      return result.rows.map((row) => new Notification(row))
    } catch (error) {
      throw error
    }
  }

  // Buscar notificaciones no leídas
  static async findUnreadByUserId(userId) {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 AND is_read = false 
        ORDER BY created_at DESC
      `
      const result = await dbConnection.query(query, [userId])

      return result.rows.map((row) => new Notification(row))
    } catch (error) {
      throw error
    }
  }

  // Marcar como leída
  async markAsRead() {
    try {
      const query = "UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      if (result.rows.length > 0) {
        this.is_read = true
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Marcar como enviada
  async markAsSent() {
    try {
      const query = "UPDATE notifications SET sent_at = NOW() WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      if (result.rows.length > 0) {
        this.sent_at = result.rows[0].sent_at
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Obtener notificaciones pendientes de envío
  static async findPendingNotifications() {
    try {
      const query = `
        SELECT * FROM notifications 
        WHERE sent_at IS NULL AND scheduled_for <= NOW()
        ORDER BY scheduled_for ASC
      `
      const result = await dbConnection.query(query)

      return result.rows.map((row) => new Notification(row))
    } catch (error) {
      throw error
    }
  }

  // Eliminar notificación
  async delete() {
    try {
      const query = "DELETE FROM notifications WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      return result.rows.length > 0
    } catch (error) {
      throw error
    }
  }
}

module.exports = Notification
