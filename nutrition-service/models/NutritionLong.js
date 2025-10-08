const { supabaseAdmin } = require("../../config/supabaseClient")

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

  static async createOrUpdate(nutritionLogData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("nutrition_logs")
        .upsert(
          {
            user_id: nutritionLogData.user_id,
            date: nutritionLogData.date,
            total_calories: nutritionLogData.total_calories || 0,
            total_protein: nutritionLogData.total_protein || 0,
            total_carbs: nutritionLogData.total_carbs || 0,
            total_fat: nutritionLogData.total_fat || 0,
            water_intake: nutritionLogData.water_intake || 0,
            notes: nutritionLogData.notes,
          },
          { onConflict: "user_id,date" },
        )
        .select()
        .single()

      if (error) throw error
      return new NutritionLog(data)
    } catch (error) {
      throw error
    }
  }

  static async findByUserAndDate(userId, date) {
    try {
      const { data, error } = await supabaseAdmin
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("date", date)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }

      return new NutritionLog(data)
    } catch (error) {
      throw error
    }
  }

  static async findByDateRange(userId, startDate, endDate) {
    try {
      const { data, error } = await supabaseAdmin
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })

      if (error) throw error
      return data.map((row) => new NutritionLog(row))
    } catch (error) {
      throw error
    }
  }

  async update(updateData) {
    try {
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from("nutrition_logs")
        .update(updateData)
        .eq("id", this.id)
        .select()
        .single()

      if (error) throw error
      Object.assign(this, data)
      return this
    } catch (error) {
      throw error
    }
  }
}

class FoodEntry {
  static async create(entryData) {
    try {
      const { data, error } = await supabaseAdmin.from("food_entries").insert([entryData]).select().single()

      if (error) throw error
      return data
    } catch (error) {
      throw error
    }
  }

  static async findByNutritionLogId(nutritionLogId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("food_entries")
        .select("*")
        .eq("nutrition_log_id", nutritionLogId)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data
    } catch (error) {
      throw error
    }
  }
}

module.exports = { NutritionLog, FoodEntry }
