const dbConnection = require("../../config/database")

class MealPlan {
  constructor(mealPlanData) {
    this.id = mealPlanData.id
    this.user_id = mealPlanData.user_id
    this.name = mealPlanData.name
    this.goal = mealPlanData.goal
    this.start_date = mealPlanData.start_date
    this.end_date = mealPlanData.end_date
    this.target_calories = mealPlanData.target_calories
    this.target_protein = mealPlanData.target_protein
    this.target_carbs = mealPlanData.target_carbs
    this.target_fat = mealPlanData.target_fat
    this.dietary_restrictions = mealPlanData.dietary_restrictions
    this.status = mealPlanData.status
    this.created_at = mealPlanData.created_at
    this.updated_at = mealPlanData.updated_at
  }

  // Crear nuevo plan de comidas
  static async create(mealPlanData) {
    try {
      const query = `
        INSERT INTO meal_plans (user_id, name, goal, start_date, end_date, target_calories, target_protein, target_carbs, target_fat, dietary_restrictions, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `

      const values = [
        mealPlanData.user_id,
        mealPlanData.name,
        mealPlanData.goal,
        mealPlanData.start_date,
        mealPlanData.end_date,
        mealPlanData.target_calories,
        mealPlanData.target_protein,
        mealPlanData.target_carbs,
        mealPlanData.target_fat,
        mealPlanData.dietary_restrictions || [],
        mealPlanData.status || "active",
      ]

      const result = await dbConnection.query(query, values)
      return new MealPlan(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar plan por usuario
  static async findByUserId(userId, status = null) {
    try {
      let query = "SELECT * FROM meal_plans WHERE user_id = $1"
      const values = [userId]

      if (status) {
        query += " AND status = $2"
        values.push(status)
      }

      query += " ORDER BY created_at DESC"

      const result = await dbConnection.query(query, values)
      return result.rows.map((row) => new MealPlan(row))
    } catch (error) {
      throw error
    }
  }

  // Buscar plan activo del usuario
  static async findActiveByUserId(userId) {
    try {
      const query = "SELECT * FROM meal_plans WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1"
      const result = await dbConnection.query(query, [userId, "active"])

      if (result.rows.length === 0) {
        return null
      }

      return new MealPlan(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Actualizar plan
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
        UPDATE meal_plans 
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

  // Eliminar plan (soft delete)
  async delete() {
    try {
      const query = "UPDATE meal_plans SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *"
      const result = await dbConnection.query(query, ["inactive", this.id])

      if (result.rows.length > 0) {
        this.status = "inactive"
      }

      return this
    } catch (error) {
      throw error
    }
  }
}

module.exports = MealPlan
