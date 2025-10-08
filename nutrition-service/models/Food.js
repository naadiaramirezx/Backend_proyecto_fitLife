const { supabaseAdmin } = require("../../config/supabaseClient")

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
    this.barcode = foodData.barcode
    this.is_verified = foodData.is_verified
    this.created_at = foodData.created_at
  }

  static async create(foodData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("foods")
        .insert([
          {
            name: foodData.name,
            category: foodData.category,
            serving_size_amount: foodData.serving_size_amount,
            serving_size_unit: foodData.serving_size_unit,
            calories: foodData.calories,
            protein: foodData.protein,
            carbohydrates: foodData.carbohydrates,
            fat: foodData.fat,
            fiber: foodData.fiber || 0,
            sugar: foodData.sugar || 0,
            sodium: foodData.sodium || 0,
            vitamins: foodData.vitamins || {},
            minerals: foodData.minerals || {},
            allergens: foodData.allergens || [],
            dietary_restrictions: foodData.dietary_restrictions || [],
            glycemic_index: foodData.glycemic_index,
            barcode: foodData.barcode,
            is_verified: foodData.is_verified || false,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return new Food(data)
    } catch (error) {
      throw error
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin.from("foods").select("*").eq("id", id).single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }

      return new Food(data)
    } catch (error) {
      throw error
    }
  }

  static async searchByName(searchTerm, limit = 20) {
    try {
      const { data, error } = await supabaseAdmin
        .from("foods")
        .select("*")
        .ilike("name", `%${searchTerm}%`)
        .order("is_verified", { ascending: false })
        .order("name", { ascending: true })
        .limit(limit)

      if (error) throw error
      return data.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  static async findByBarcode(barcode) {
    try {
      const { data, error } = await supabaseAdmin.from("foods").select("*").eq("barcode", barcode).single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }

      return new Food(data)
    } catch (error) {
      throw error
    }
  }

  static async findByCategory(category, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from("foods")
        .select("*")
        .eq("category", category)
        .order("is_verified", { ascending: false })
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  async update(updateData) {
    try {
      const { data, error } = await supabaseAdmin.from("foods").update(updateData).eq("id", this.id).select().single()

      if (error) throw error
      Object.assign(this, data)
      return this
    } catch (error) {
      throw error
    }
  }

  async delete() {
    try {
      const { error } = await supabaseAdmin.from("foods").delete().eq("id", this.id)

      if (error) throw error
      return true
    } catch (error) {
      throw error
    }
  }

  static async findAll(limit = 50, offset = 0) {
    try {
      const { data, error } = await supabaseAdmin
        .from("foods")
        .select("*")
        .order("is_verified", { ascending: false })
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  static async getCategories() {
    try {
      const { data, error } = await supabaseAdmin
        .from("foods")
        .select("category")
        .order("category", { ascending: true })

      if (error) throw error

      // Obtener valores únicos
      const uniqueCategories = [...new Set(data.map((item) => item.category))]
      return uniqueCategories
    } catch (error) {
      throw error
    }
  }

  calculateNutritionForAmount(amount, unit) {
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
