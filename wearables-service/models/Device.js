const dbConnection = require("../../config/database")

class Device {
  constructor(deviceData) {
    this.id = deviceData.id
    this.user_id = deviceData.user_id
    this.device_type = deviceData.device_type
    this.brand = deviceData.brand
    this.model = deviceData.model
    this.device_id = deviceData.device_id
    this.is_connected = deviceData.is_connected
    this.last_sync = deviceData.last_sync
    this.battery_level = deviceData.battery_level
    this.firmware_version = deviceData.firmware_version
    this.created_at = deviceData.created_at
    this.updated_at = deviceData.updated_at
  }

  // Crear nuevo dispositivo
  static async create(deviceData) {
    try {
      const query = `
        INSERT INTO devices (user_id, device_type, brand, model, device_id, is_connected, battery_level, firmware_version)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `

      const values = [
        deviceData.user_id,
        deviceData.device_type,
        deviceData.brand,
        deviceData.model,
        deviceData.device_id,
        deviceData.is_connected || false,
        deviceData.battery_level,
        deviceData.firmware_version,
      ]

      const result = await dbConnection.query(query, values)
      return new Device(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar dispositivo por ID
  static async findById(id) {
    try {
      const query = "SELECT * FROM devices WHERE id = $1"
      const result = await dbConnection.query(query, [id])

      if (result.rows.length === 0) {
        return null
      }

      return new Device(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar dispositivos por usuario
  static async findByUserId(userId) {
    try {
      const query = "SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC"
      const result = await dbConnection.query(query, [userId])

      return result.rows.map((row) => new Device(row))
    } catch (error) {
      throw error
    }
  }

  // Actualizar dispositivo
  async update(updateData) {
    try {
      const fields = []
      const values = []
      let paramCount = 1

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== "id") {
          fields.push(`${key} = $${paramCount}`)
          values.push(updateData[key])
          paramCount++
        }
      })

      if (fields.length === 0) {
        return this
      }

      values.push(this.id)

      const query = `
        UPDATE devices 
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING *
      `

      const result = await dbConnection.query(query, values)

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0])
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Actualizar última sincronización
  async updateLastSync() {
    try {
      const query = "UPDATE devices SET last_sync = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      if (result.rows.length > 0) {
        this.last_sync = result.rows[0].last_sync
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Eliminar dispositivo
  async delete() {
    try {
      const query = "DELETE FROM devices WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      return result.rows.length > 0
    } catch (error) {
      throw error
    }
  }
}

module.exports = Device
