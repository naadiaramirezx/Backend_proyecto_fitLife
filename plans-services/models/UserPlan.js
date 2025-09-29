const dbConnection = require("../../config/database")

class UserPlan {
  constructor(userPlanData) {
    this.id = userPlanData.id
    this.user_id = userPlanData.user_id
    this.plan_id = userPlanData.plan_id
    this.start_date = userPlanData.start_date
    this.end_date = userPlanData.end_date
    this.status = userPlanData.status
    this.progress = userPlanData.progress
    this.created_at = userPlanData.created_at
    this.updated_at = userPlanData.updated_at
  }

  // Crear nuevo plan de usuario
  static async create(userPlanData) {
    try {
      const query = `
        INSERT INTO user_plans (user_id, plan_id, start_date, end_date, status, progress)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `

      const values = [
        userPlanData.user_id,
        userPlanData.plan_id,
        userPlanData.start_date,
        userPlanData.end_date,
        userPlanData.status || "active",
        JSON.stringify(userPlanData.progress || {}),
      ]

      const result = await dbConnection.query(query, values)
      return new UserPlan(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar plan por usuario
  static async findByUserId(userId, status = null) {
    try {
      let query = "SELECT * FROM user_plans WHERE user_id = $1"
      const values = [userId]

      if (status) {
        query += " AND status = $2"
        values.push(status)
      }

      query += " ORDER BY created_at DESC"

      const result = await dbConnection.query(query, values)
      return result.rows.map((row) => new UserPlan(row))
    } catch (error) {
      throw error
    }
  }

  // Buscar plan activo del usuario
  static async findActiveByUserId(userId) {
    try {
      const query = "SELECT * FROM user_plans WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 1"
      const result = await dbConnection.query(query, [userId, "active"])

      if (result.rows.length === 0) {
        return null
      }

      return new UserPlan(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Actualizar progreso
  async updateProgress(progressData) {
    try {
      const currentProgress = this.progress || {}
      const updatedProgress = { ...currentProgress, ...progressData }

      const query = `
        UPDATE user_plans 
        SET progress = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `

      const result = await dbConnection.query(query, [JSON.stringify(updatedProgress), this.id])

      if (result.rows.length > 0) {
        this.progress = result.rows[0].progress
        this.updated_at = result.rows[0].updated_at
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Actualizar estado
  async updateStatus(newStatus) {
    try {
      const query = `
        UPDATE user_plans 
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `

      const result = await dbConnection.query(query, [newStatus, this.id])

      if (result.rows.length > 0) {
        this.status = newStatus
        this.updated_at = result.rows[0].updated_at
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Obtener plan completo con detalles
  async getFullPlan() {
    try {
      const query = `
        SELECT up.*, ep.name as plan_name, ep.description as plan_description,
               ep.goal, ep.difficulty, ep.duration, ep.workouts_per_week
        FROM user_plans up
        JOIN exercise_plans ep ON up.plan_id = ep.id
        WHERE up.id = $1
      `

      const result = await dbConnection.query(query, [this.id])

      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0]
    } catch (error) {
      throw error
    }
  }
}

module.exports = UserPlan
