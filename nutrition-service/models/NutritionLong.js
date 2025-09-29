const dbConnection = require("../../config/database")

class NutritionLog {
  constructor(nutritionLogData) {
    this.id = nutritionLogData.id
    this.user_id = nutritionLogData.user_id
    this.date = nutritionLogData.date
    this.total_calories = nutritionLogData.total_calories
    this.total_protein = nutritionLogData.total_protein
    this.total_carbs = nutritionLogData.total_carbs
    this.total_fat = nutritionLogData.total_fat
    this.water_intake = nutritionLogData.water_intake
    this.notes = nutritionLogData.notes
    this.created_at = nutritionLogData.created_at
    this.updated_at = nutritionLogData.updated_at
  }

  // Crear o actualizar log nutricional
  static async createOrUpdate(nutritionLogData) {
    try {
      const query = `
        INSERT INTO nutrition_logs (user_id, date, total_calories, total_protein, total_carbs, total_fat, water_intake, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, date) 
        DO UPDATE SET 
          total_calories = EXCLUDED.total_calories,
          total_protein = EXCLUDED.total_protein,
          total_carbs = EXCLUDED.total_carbs,
          total_fat = EXCLUDED.total_fat,
          water_intake = EXCLUDED.water_intake,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING *
      `

      const values = [
        nutritionLogData.user_id,
        nutritionLogData.date,
        nutritionLogData.total_calories || 0,
        nutritionLogData.total_protein || 0,
        nutritionLogData.total_carbs || 0,
        nutritionLogData.total_fat || 0,
        nutritionLogData.water_intake || 0,
        nutritionLogData.notes,
      ]

      const result = await dbConnection.query(query, values)
      return new NutritionLog(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar log por usuario y fecha
  static async findByUserAndDate(userId, date) {
    try {
      const query = "SELECT * FROM nutrition_logs WHERE user_id = $1 AND date = $2"
      const result = await dbConnection.query(query, [userId, date])

      if (result.rows.length === 0) {
        return null
      }

      return new NutritionLog(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Obtener logs por rango de fechas
  static async findByDateRange(userId, startDate, endDate) {
    try {
      const query = `
        SELECT * FROM nutrition_logs 
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
        ORDER BY date DESC
      `
      const result = await dbConnection.query(query, [userId, startDate, endDate])

      return result.rows.map((row) => new NutritionLog(row))
    } catch (error) {
      throw error
    }
  }

  // Obtener estadísticas semanales
  static async getWeeklyStats(userId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          AVG(total_calories) as avg_calories,
          AVG(total_protein) as avg_protein,
          AVG(total_carbs) as avg_carbs,
          AVG(total_fat) as avg_fat,
          AVG(water_intake) as avg_water
        FROM nutrition_logs 
        WHERE user_id = $1 AND date BETWEEN $2 AND $3
      `
      const result = await dbConnection.query(query, [userId, startDate, endDate])

      return result.rows[0]
    } catch (error) {
      throw error
    }
  }

  // Actualizar log
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
        UPDATE nutrition_logs 
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
}

// Clase para manejar entradas de comida individuales
class FoodEntry {
  static async create(entryData) {
    try {
      const query = `
        INSERT INTO food_entries (nutrition_log_id, food_id, quantity, unit, meal_type, calories, protein, carbs, fat)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `

      const values = [
        entryData.nutrition_log_id,
        entryData.food_id,
        entryData.quantity,
        entryData.unit,
        entryData.meal_type,
        entryData.calories,
        entryData.protein,
        entryData.carbs,
        entryData.fat,
      ]

      const result = await dbConnection.query(query, values)
      return result.rows[0]
    } catch (error) {
      throw error
    }
  }

  static async findByNutritionLogId(nutritionLogId) {
    try {
      const query = "SELECT * FROM food_entries WHERE nutrition_log_id = $1 ORDER BY created_at"
      const result = await dbConnection.query(query, [nutritionLogId])
      return result.rows
    } catch (error) {
      throw error
    }
  }
}

module.exports = { NutritionLog, FoodEntry }
