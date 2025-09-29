const dbConnection = require("../../config/database")

class Food {
  constructor(foodData) {
    this.id = foodData.id
    this.name = foodData.name
    this.category = foodData.category
    this.serving_size_amount = foodData.serving_size_amount
    this.serving_size_unit = foodData.serving_size_unit
    this.calories = foodData.calories
    this.protein = foodData.protein
    this.carbohydrates = foodData.carbohydrates
    this.fat = foodData.fat
    this.fiber = foodData.fiber
    this.sugar = foodData.sugar
    this.sodium = foodData.sodium
    this.vitamins = foodData.vitamins
    this.minerals = foodData.minerals
    this.allergens = foodData.allergens
    this.dietary_restrictions = foodData.dietary_restrictions
    this.glycemic_index = foodData.glycemic_index
    this.is_verified = foodData.is_verified
    this.created_at = foodData.created_at
  }

  // Crear nuevo alimento
  static async create(foodData) {
    try {
      const query = `
        INSERT INTO foods (name, category, serving_size_amount, serving_size_unit, calories, protein, carbohydrates, fat, fiber, sugar, sodium, vitamins, minerals, allergens, dietary_restrictions, glycemic_index, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `

      const values = [
        foodData.name,
        foodData.category,
        foodData.serving_size_amount,
        foodData.serving_size_unit,
        foodData.calories,
        foodData.protein,
        foodData.carbohydrates,
        foodData.fat,
        foodData.fiber || 0,
        foodData.sugar || 0,
        foodData.sodium || 0,
        JSON.stringify(foodData.vitamins || {}),
        JSON.stringify(foodData.minerals || {}),
        foodData.allergens || [],
        foodData.dietary_restrictions || [],
        foodData.glycemic_index,
        foodData.is_verified || false,
      ]

      const result = await dbConnection.query(query, values)
      return new Food(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar alimento por ID
  static async findById(id) {
    try {
      const query = "SELECT * FROM foods WHERE id = $1"
      const result = await dbConnection.query(query, [id])

      if (result.rows.length === 0) {
        return null
      }

      return new Food(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar alimentos por nombre
  static async searchByName(searchTerm, limit = 20) {
    try {
      const query = `
        SELECT * FROM foods 
        WHERE name ILIKE $1 
        ORDER BY is_verified DESC, name 
        LIMIT $2
      `
      const result = await dbConnection.query(query, [`%${searchTerm}%`, limit])

      return result.rows.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  // Buscar alimentos por categoría
  static async findByCategory(category, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM foods 
        WHERE category = $1 
        ORDER BY is_verified DESC, name 
        LIMIT $2 OFFSET $3
      `
      const result = await dbConnection.query(query, [category, limit, offset])

      return result.rows.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  // Buscar alimentos por restricciones dietéticas
  static async findByDietaryRestrictions(restrictions, limit = 50) {
    try {
      const query = `
        SELECT * FROM foods 
        WHERE dietary_restrictions && $1 
        ORDER BY is_verified DESC, name 
        LIMIT $2
      `
      const result = await dbConnection.query(query, [restrictions, limit])

      return result.rows.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  // Buscar alimentos sin alérgenos específicos
  static async findWithoutAllergens(allergens, limit = 50) {
    try {
      const query = `
        SELECT * FROM foods 
        WHERE NOT (allergens && $1) OR allergens IS NULL OR allergens = '{}'
        ORDER BY is_verified DESC, name 
        LIMIT $2
      `
      const result = await dbConnection.query(query, [allergens, limit])

      return result.rows.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  // Actualizar alimento
  async update(updateData) {
    try {
      const fields = []
      const values = []
      let paramCount = 1

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== "id") {
          if (key === "vitamins" || key === "minerals") {
            fields.push(`${key} = $${paramCount}`)
            values.push(JSON.stringify(updateData[key]))
          } else {
            fields.push(`${key} = $${paramCount}`)
            values.push(updateData[key])
          }
          paramCount++
        }
      })

      if (fields.length === 0) {
        return this
      }

      values.push(this.id)

      const query = `
        UPDATE foods 
        SET ${fields.join(", ")}
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

  // Eliminar alimento
  async delete() {
    try {
      const query = "DELETE FROM foods WHERE id = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id])

      return result.rows.length > 0
    } catch (error) {
      throw error
    }
  }

  // Obtener todos los alimentos
  static async findAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT * FROM foods 
        ORDER BY is_verified DESC, name 
        LIMIT $1 OFFSET $2
      `
      const result = await dbConnection.query(query, [limit, offset])

      return result.rows.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  // Contar alimentos
  static async count(filters = {}) {
    try {
      let query = "SELECT COUNT(*) FROM foods WHERE 1=1"
      const values = []
      let paramCount = 1

      if (filters.category) {
        query += ` AND category = $${paramCount}`
        values.push(filters.category)
        paramCount++
      }

      if (filters.is_verified !== undefined) {
        query += ` AND is_verified = $${paramCount}`
        values.push(filters.is_verified)
      }

      const result = await dbConnection.query(query, values)
      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      throw error
    }
  }

  // Obtener categorías disponibles
  static async getCategories() {
    try {
      const query = "SELECT DISTINCT category FROM foods ORDER BY category"
      const result = await dbConnection.query(query)

      return result.rows.map((row) => row.category)
    } catch (error) {
      throw error
    }
  }

  // Calcular información nutricional para una cantidad específica
  calculateNutritionForAmount(amount, unit) {
    // Convertir a la unidad base del alimento
    let multiplier = 1

    if (this.serving_size_unit === "g" && unit === "kg") {
      multiplier = (amount * 1000) / this.serving_size_amount
    } else if (this.serving_size_unit === "ml" && unit === "l") {
      multiplier = (amount * 1000) / this.serving_size_amount
    } else if (this.serving_size_unit === unit) {
      multiplier = amount / this.serving_size_amount
    }

    return {
      calories: Math.round((this.calories || 0) * multiplier * 100) / 100,
      protein: Math.round((this.protein || 0) * multiplier * 100) / 100,
      carbohydrates: Math.round((this.carbohydrates || 0) * multiplier * 100) / 100,
      fat: Math.round((this.fat || 0) * multiplier * 100) / 100,
      fiber: Math.round((this.fiber || 0) * multiplier * 100) / 100,
      sugar: Math.round((this.sugar || 0) * multiplier * 100) / 100,
      sodium: Math.round((this.sodium || 0) * multiplier * 100) / 100,
    }
  }
}

module.exports = Food
