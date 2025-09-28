const db = require("../../config/database")

class UserRoute {
  constructor(data) {
    this.id = data.id
    this.user_id = data.user_id
    this.route_id = data.route_id
    this.status = data.status // planned, in_progress, completed, abandoned
    this.start_time = data.start_time
    this.end_time = data.end_time
    this.actual_duration = data.actual_duration // in minutes
    this.actual_distance = data.actual_distance // in kilometers
    this.calories_burned = data.calories_burned
    this.average_pace = data.average_pace // minutes per km
    this.max_heart_rate = data.max_heart_rate
    this.average_heart_rate = data.average_heart_rate
    this.notes = data.notes
    this.weather_conditions = data.weather_conditions
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  // Create a new user route activity
  static async create(userRouteData) {
    const query = `
      INSERT INTO user_routes (user_id, route_id, status, start_time, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const values = [
      userRouteData.user_id,
      userRouteData.route_id,
      userRouteData.status || "planned",
      userRouteData.start_time || new Date(),
      userRouteData.notes,
    ]

    const result = await db.query(query, values)
    return new UserRoute(result.rows[0])
  }

  // Get user route by ID
  static async findById(id) {
    const query = "SELECT * FROM user_routes WHERE id = $1"
    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    return new UserRoute(result.rows[0])
  }

  // Get user's route history
  static async getUserRouteHistory(userId, limit = 20, offset = 0) {
    const query = `
      SELECT ur.*, r.name as route_name, r.distance as planned_distance, r.duration as planned_duration
      FROM user_routes ur
      JOIN routes r ON ur.route_id = r.id
      WHERE ur.user_id = $1
      ORDER BY ur.created_at DESC
      LIMIT $2 OFFSET $3
    `

    const result = await db.query(query, [userId, limit, offset])
    return result.rows.map((row) => new UserRoute(row))
  }

  // Get user's active/planned routes
  static async getUserActiveRoutes(userId) {
    const query = `
      SELECT ur.*, r.name as route_name, r.distance, r.duration, r.difficulty
      FROM user_routes ur
      JOIN routes r ON ur.route_id = r.id
      WHERE ur.user_id = $1 AND ur.status IN ('planned', 'in_progress')
      ORDER BY ur.start_time ASC
    `

    const result = await db.query(query, [userId])
    return result.rows.map((row) => new UserRoute(row))
  }

  // Start a route activity
  async startActivity() {
    const query = `
      UPDATE user_routes 
      SET status = 'in_progress', start_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `

    const result = await db.query(query, [this.id])
    return new UserRoute(result.rows[0])
  }

  // Complete a route activity
  async completeActivity(completionData) {
    const query = `
      UPDATE user_routes 
      SET status = 'completed', 
          end_time = CURRENT_TIMESTAMP,
          actual_duration = $1,
          actual_distance = $2,
          calories_burned = $3,
          average_pace = $4,
          max_heart_rate = $5,
          average_heart_rate = $6,
          weather_conditions = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `

    const values = [
      completionData.actual_duration,
      completionData.actual_distance,
      completionData.calories_burned,
      completionData.average_pace,
      completionData.max_heart_rate,
      completionData.average_heart_rate,
      JSON.stringify(completionData.weather_conditions || {}),
      this.id,
    ]

    const result = await db.query(query, values)
    return new UserRoute(result.rows[0])
  }

  // Get user's route statistics
  static async getUserRouteStats(userId) {
    const query = `
      SELECT 
        COUNT(*) as total_routes,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_routes,
        COALESCE(SUM(actual_distance), 0) as total_distance,
        COALESCE(SUM(actual_duration), 0) as total_duration,
        COALESCE(SUM(calories_burned), 0) as total_calories,
        COALESCE(AVG(average_pace), 0) as avg_pace,
        COALESCE(AVG(average_heart_rate), 0) as avg_heart_rate
      FROM user_routes 
      WHERE user_id = $1 AND status = 'completed'
    `

    const result = await db.query(query, [userId])
    return result.rows[0]
  }

  // Update user route
  async update(updateData) {
    const fields = []
    const values = []
    let paramCount = 0

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && key !== "id") {
        paramCount++
        fields.push(`${key} = $${paramCount}`)
        if (key === "weather_conditions") {
          values.push(JSON.stringify(updateData[key]))
        } else {
          values.push(updateData[key])
        }
      }
    })

    if (fields.length === 0) {
      return this
    }

    paramCount++
    values.push(this.id)

    const query = `
      UPDATE user_routes 
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await db.query(query, values)
    return new UserRoute(result.rows[0])
  }
}

module.exports = UserRoute
