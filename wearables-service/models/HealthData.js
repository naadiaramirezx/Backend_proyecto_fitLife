const dbConnection = require("../../config/database")

class HealthData {
  constructor(healthData) {
    this.id = healthData.id
    this.user_id = healthData.user_id
    this.device_id = healthData.device_id
    this.data_type = healthData.data_type
    this.value = healthData.value
    this.unit = healthData.unit
    this.recorded_at = healthData.recorded_at
    this.metadata = healthData.metadata
    this.created_at = healthData.created_at
  }

  // Crear nuevo registro de salud
  static async create(healthData) {
    try {
      const query = `
        INSERT INTO health_data (user_id, device_id, data_type, value, unit, recorded_at, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `

      const values = [
        healthData.user_id,
        healthData.device_id,
        healthData.data_type,
        healthData.value,
        healthData.unit,
        healthData.recorded_at,
        JSON.stringify(healthData.metadata || {}),
      ]

      const result = await dbConnection.query(query, values)
      return new HealthData(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar datos por usuario y tipo
  static async findByUserAndType(userId, dataType, startDate, endDate, limit = 100) {
    try {
      const query = `
        SELECT * FROM health_data 
        WHERE user_id = $1 AND data_type = $2 
        AND recorded_at BETWEEN $3 AND $4
        ORDER BY recorded_at DESC 
        LIMIT $5
      `
      const result = await dbConnection.query(query, [userId, dataType, startDate, endDate, limit])

      return result.rows.map((row) => new HealthData(row))
    } catch (error) {
      throw error
    }
  }

  // Obtener último registro por tipo
  static async getLatestByType(userId, dataType) {
    try {
      const query = `
        SELECT * FROM health_data 
        WHERE user_id = $1 AND data_type = $2 
        ORDER BY recorded_at DESC 
        LIMIT 1
      `
      const result = await dbConnection.query(query, [userId, dataType])

      if (result.rows.length === 0) {
        return null
      }

      return new HealthData(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Obtener promedio por período
  static async getAverageByPeriod(userId, dataType, startDate, endDate) {
    try {
      const query = `
        SELECT AVG(CAST(value AS DECIMAL)) as average_value
        FROM health_data 
        WHERE user_id = $1 AND data_type = $2 
        AND recorded_at BETWEEN $3 AND $4
      `
      const result = await dbConnection.query(query, [userId, dataType, startDate, endDate])

      return result.rows[0]?.average_value || 0
    } catch (error) {
      throw error
    }
  }
}

class DailyActivity {
  constructor(activityData) {
    this.id = activityData.id
    this.user_id = activityData.user_id
    this.date = activityData.date
    this.steps = activityData.steps
    this.calories_burned = activityData.calories_burned
    this.distance = activityData.distance
    this.active_minutes = activityData.active_minutes
    this.sleep_hours = activityData.sleep_hours
    this.weight = activityData.weight
    this.created_at = activityData.created_at
    this.updated_at = activityData.updated_at
  }

  // Crear o actualizar actividad diaria
  static async createOrUpdate(activityData) {
    try {
      const query = `
        INSERT INTO daily_activities (user_id, date, steps, calories_burned, distance, active_minutes, sleep_hours, weight)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
          steps = EXCLUDED.steps,
          calories_burned = EXCLUDED.calories_burned,
          distance = EXCLUDED.distance,
          active_minutes = EXCLUDED.active_minutes,
          sleep_hours = EXCLUDED.sleep_hours,
          weight = EXCLUDED.weight,
          updated_at = NOW()
        RETURNING *
      `

      const values = [
        activityData.user_id,
        activityData.date,
        activityData.steps || 0,
        activityData.calories_burned || 0,
        activityData.distance || 0,
        activityData.active_minutes || 0,
        activityData.sleep_hours || 0,
        activityData.weight,
      ]

      const result = await dbConnection.query(query, values)
      return new DailyActivity(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar actividad por usuario y fecha
  static async findByUserAndDate(userId, date) {
    try {
      const query = "SELECT * FROM daily_activities WHERE user_id = $1 AND date = $2"
      const result = await dbConnection.query(query, [userId, date])

      if (result.rows.length === 0) {
        return null
      }

      return new DailyActivity(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Obtener actividades por rango de fechas
  static async findByDateRange(userId, startDate, endDate) {
    try {
      const query = `
        SELECT * FROM daily_activities 
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
        ORDER BY date DESC
      `
      const result = await dbConnection.query(query, [userId, startDate, endDate])

      return result.rows.map((row) => new DailyActivity(row))
    } catch (error) {
      throw error
    }
  }
}

module.exports = { HealthData, DailyActivity }
