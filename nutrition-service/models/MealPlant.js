const { supabaseAdmin } = require("../../config/supabaseClient")

class MealPlan {
  constructor(mealPlanData) {
    this.id = mealPlanData.id_plan_comida
    this.user_id = mealPlanData.perfil_id
    this.name = mealPlanData.nombre
    this.start_date = mealPlanData.fecha_asignacion
    this.active = mealPlanData.activo
    this.diet_type = mealPlanData.tipo_dieta
    this.created_at = mealPlanData.created_at
  }

  static async create(mealPlanData) {
    try {
      const { data, error } = await supabaseAdmin
        .from("planes_comida")
        .insert([
          {
            perfil_id: mealPlanData.user_id,
            nombre: mealPlanData.name,
            fecha_asignacion: mealPlanData.start_date,
            activo: mealPlanData.active !== undefined ? mealPlanData.active : true,
            tipo_dieta: mealPlanData.diet_type,
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

  static async findByUserId(userId) {
    try {
      const { data, error } = await supabaseAdmin
        .from("planes_comida")
        .select("*")
        .eq("perfil_id", userId)
        .order("fecha_asignacion", { ascending: false })

      if (error) throw error
      return data.map((row) => new MealPlan(row))
    } catch (error) {
      throw error
    }
  }
}

module.exports = MealPlan