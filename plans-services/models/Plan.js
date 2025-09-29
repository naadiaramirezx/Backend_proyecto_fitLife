const dbConnection = require("../../config/database")

class Plan {
  constructor(planData) {
    this.id = planData.id
    this.name = planData.name
    this.description = planData.description
    this.goal = planData.goal
    this.difficulty = planData.difficulty
    this.duration = planData.duration
    this.workouts_per_week = planData.workouts_per_week
    this.target_age_min = planData.target_age_min
    this.target_age_max = planData.target_age_max
    this.fitness_level = planData.fitness_level
    this.gender = planData.gender
    this.tags = planData.tags
    this.is_active = planData.is_active
    this.created_by = planData.created_by
    this.created_at = planData.created_at
    this.updated_at = planData.updated_at
  }

  // Crear nuevo plan
  static async create(planData) {
    try {
      const query = `
        INSERT INTO exercise_plans (name, description, goal, difficulty, duration, workouts_per_week, target_age_min, target_age_max, fitness_level, gender, tags, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `

      const values = [
        planData.name,
        planData.description,
        planData.goal,
        planData.difficulty,
        planData.duration,
        planData.workouts_per_week,
        planData.target_age_min,
        planData.target_age_max,
        planData.fitness_level,
        planData.gender,
        planData.tags || [],
        planData.created_by || null,
      ]

      const result = await dbConnection.query(query, values)
      return new Plan(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar plan por ID
  static async findById(id) {
    try {
      const query = "SELECT * FROM exercise_plans WHERE id = $1 AND is_active = true"
      const result = await dbConnection.query(query, [id])

      if (result.rows.length === 0) {
        return null
      }

      return new Plan(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar planes por filtros
  static async findByFilters(filters = {}) {
    try {
      let query = "SELECT * FROM exercise_plans WHERE is_active = true"
      const values = []
      let paramCount = 1

      if (filters.goal) {
        query += ` AND goal = $${paramCount}`
        values.push(filters.goal)
        paramCount++
      }

      if (filters.difficulty) {
        query += ` AND difficulty = $${paramCount}`
        values.push(filters.difficulty)
        paramCount++
      }

      if (filters.fitness_level) {
        query += ` AND fitness_level = $${paramCount}`
        values.push(filters.fitness_level)
        paramCount++
      }

      if (filters.gender && filters.gender !== "unisex") {
        query += ` AND (gender = $${paramCount} OR gender = 'unisex')`
        values.push(filters.gender)
        paramCount++
      }

      if (filters.age) {
        query += ` AND target_age_min <= $${paramCount} AND target_age_max >= $${paramCount}`
        values.push(filters.age)
        paramCount++
      }

      query += " ORDER BY created_at DESC"

      if (filters.limit) {
        query += ` LIMIT $${paramCount}`
        values.push(filters.limit)
        paramCount++
      }

      if (filters.offset) {
        query += ` OFFSET $${paramCount}`
        values.push(filters.offset)
      }

      const result = await dbConnection.query(query, values)
      return result.rows.map((row) => new Plan(row))
    } catch (error) {
      throw error
    }
  }

  // Obtener workouts del plan
  async getWorkouts() {
    try {
      const query = "SELECT * FROM workouts WHERE plan_id = $1 ORDER BY created_at"
      const result = await dbConnection.query(query, [this.id])

      return result.rows
    } catch (error) {
      throw error
    }
  }

  // Obtener plan completo con workouts y ejercicios
  async getFullPlan() {
    try {
      const workoutsQuery = `
        SELECT w.*, 
               json_agg(
                 json_build_object(
                   'id', e.id,
                   'name', e.name,
                   'description', e.description,
                   'muscle_groups', e.muscle_groups,
                   'equipment', e.equipment,
                   'difficulty', e.difficulty,
                   'instructions', e.instructions,
                   'sets', e.sets,
                   'reps_min', e.reps_min,
                   'reps_max', e.reps_max,
                   'duration', e.duration,
                   'rest_time', e.rest_time,
                   'calories', e.calories
                 )
               ) as exercises
        FROM workouts w
        LEFT JOIN exercises e ON w.id = e.workout_id
        WHERE w.plan_id = $1
        GROUP BY w.id
        ORDER BY w.created_at
      `

      const result = await dbConnection.query(workoutsQuery, [this.id])

      return {
        ...this,
        workouts: result.rows,
      }
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
        UPDATE exercise_plans 
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
      const query = "UPDATE exercise_plans SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      if (result.rows.length > 0) {
        this.is_active = false
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Obtener todos los planes activos
  static async findAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM exercise_plans 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
      `
      const result = await dbConnection.query(query, [limit, offset])

      return result.rows.map((row) => new Plan(row))
    } catch (error) {
      throw error
    }
  }

  // Contar planes activos
  static async count(filters = {}) {
    try {
      let query = "SELECT COUNT(*) FROM exercise_plans WHERE is_active = true"
      const values = []
      let paramCount = 1

      if (filters.goal) {
        query += ` AND goal = $${paramCount}`
        values.push(filters.goal)
        paramCount++
      }

      if (filters.difficulty) {
        query += ` AND difficulty = $${paramCount}`
        values.push(filters.difficulty)
      }

      const result = await dbConnection.query(query, values)
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      throw error
    }
  }
}

// Clase para manejar Workouts
class Workout {
  static async create(workoutData) {
    try {
      const query = `
        INSERT INTO workouts (plan_id, name, description, duration, difficulty, total_calories, equipment, muscle_groups)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `

      const values = [
        workoutData.plan_id,
        workoutData.name,
        workoutData.description,
        workoutData.duration,
        workoutData.difficulty,
        workoutData.total_calories,
        workoutData.equipment || [],
        workoutData.muscle_groups || [],
      ]

      const result = await dbConnection.query(query, values)
      return result.rows[0]
    } catch (error) {
      throw error
    }
  }

  static async findByPlanId(planId) {
    try {
      const query = "SELECT * FROM workouts WHERE plan_id = $1 ORDER BY created_at"
      const result = await dbConnection.query(query, [planId])
      return result.rows
    } catch (error) {
      throw error
    }
  }
}

// Clase para manejar Exercises
class Exercise {
  static async create(exerciseData) {
    try {
      const query = `
        INSERT INTO exercises (workout_id, name, description, muscle_groups, equipment, difficulty, instructions, sets, reps_min, reps_max, duration, rest_time, calories)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `

      const values = [
        exerciseData.workout_id,
        exerciseData.name,
        exerciseData.description,
        exerciseData.muscle_groups || [],
        exerciseData.equipment || [],
        exerciseData.difficulty,
        exerciseData.instructions || [],
        exerciseData.sets,
        exerciseData.reps_min,
        exerciseData.reps_max,
        exerciseData.duration,
        exerciseData.rest_time,
        exerciseData.calories,
      ]

      const result = await dbConnection.query(query, values)
      return result.rows[0]
    } catch (error) {
      throw error
    }
  }

  static async findByWorkoutId(workoutId) {
    try {
      const query = "SELECT * FROM exercises WHERE workout_id = $1 ORDER BY created_at"
      const result = await dbConnection.query(query, [workoutId])
      return result.rows
    } catch (error) {
      throw error
    }
  }
}

module.exports = { Plan, Workout, Exercise }
