const { supabaseAdmin } = require("../../config/supabaseClient")

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

  static async create(mealPlanData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("meal_plans")
        .insert([
          {
            user_id: mealPlanData.user_id,
            name: mealPlanData.name,
            goal: mealPlanData.goal,
            start_date: mealPlanData.start_date,
            end_date: mealPlanData.end_date,
            target_calories: mealPlanData.target_calories,
            target_protein: mealPlanData.target_protein,
            target_carbs: mealPlanData.target_carbs,
            target_fat: mealPlanData.target_fat,
            dietary_restrictions: mealPlanData.dietary_restrictions || [],
            status: mealPlanData.status || "active",
          },
        ])
        .select()
        .single()

      if (error) throw error
      return new MealPlan(data)
    } catch (error) {
      throw error
    }
  }

  static async findByUserId(userId, status = null) {
    try {
      let query = supabaseAdmin.from("meal_plans").select("*").eq("user_id", userId)

      if (status) {
        query = query.eq("status", status)
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) throw error
      return data.map((row) => new MealPlan(row))
    } catch (error) {
      throw error
    }
  }

  static async findActiveByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("meal_plans")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }

      return new MealPlan(data)
    } catch (error) {
      throw error
    }
  }

  async update(updateData) {
    try {
      updateData.updated_at = new Date().toISOString()

      const { data, error } = await supabaseAdmin
        .from("meal_plans")
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

  async delete() {
    try {
      const { data, error } = await supabaseAdmin
        .from("meal_plans")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("id", this.id)
        .select()
        .single()

      if (error) throw error
      this.status = "inactive"
      return this
    } catch (error) {
      throw error
    }
  }
}

module.exports = MealPlan
