const { supabaseAdmin } = require("../../config/supabaseClient")

class Food {
  constructor(foodData) {
    this.id = foodData.id_alimento
    this.name = foodData.nombre
    this.description = foodData.descripcion
    this.calories = foodData.calorias_por_100g
    this.protein = foodData.proteinas_g
    this.carbohydrates = foodData.carbohidratos_g
    this.fat = foodData.grasas_g
    this.created_at = foodData.created_at
  }

  static async findById(id) {
    try {
      const { data, error } = await supabaseAdmin
        .from("alimentos")
        .select("*")
        .eq("id_alimento", id)
        .single()

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
        .from("alimentos")
        .select("*")
        .ilike("nombre", `%${searchTerm}%`)
        .limit(limit)

      if (error) throw error
      return data.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  static async findAll(limit = 50) {
    try {
      const { data, error } = await supabaseAdmin
        .from("alimentos")
        .select("*")
        .limit(limit)

      if (error) throw error
      return data.map((row) => new Food(row))
    } catch (error) {
      throw error
    }
  }

  calculateNutritionForAmount(amount, unit) {
    // En tu base de datos, los nutrientes están por 100g
    const multiplier = amount / 100
    
    return {
      calories: Math.round((this.calories || 0) * multiplier * 100) / 100,
      protein: Math.round((this.protein || 0) * multiplier * 100) / 100,
      carbohydrates: Math.round((this.carbohydrates || 0) * multiplier * 100) / 100,
      fat: Math.round((this.fat || 0) * multiplier * 100) / 100,
    }
  }
}

module.exports = Food