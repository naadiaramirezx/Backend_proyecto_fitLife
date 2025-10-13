// models/Plan.js
const { supabaseAdmin } = require("../../config/supabaseClient")

class Plan {
  constructor(row) {
    this.id_plan       = row.id_plan
    this.nombre        = row.nombre
    this.duracion_dias = row.duracion_dias
    this.objetivo      = row.objetivo
    this.precio        = row.precio
    this.created_at    = row.created_at
  }

  static async create(data) {
    const { data: row, error } = await supabaseAdmin
      .from("planes")
      .insert({
        nombre: data.nombre,
        duracion_dias: data.duracion_dias,
        objetivo: data.objetivo,
        precio: data.precio ?? 0,
      })
      .select()
      .single()

    if (error) throw error
    return new Plan(row)
  }

  static async findById(id) {
    const { data: row, error } = await supabaseAdmin
      .from("planes")
      .select("*")
      .eq("id_plan", id)
      .single()

    if (error && error.code !== "PGRST116") throw error
    return row ? new Plan(row) : null
  }

  static async findByFilters(filters = {}) {
    let query = supabaseAdmin.from("planes").select("*")

    if (filters.objetivo) query = query.eq("objetivo", filters.objetivo)
    if (filters.duracion_min) query = query.gte("duracion_dias", filters.duracion_min)
    if (filters.duracion_max) query = query.lte("duracion_dias", filters.duracion_max)

    query = query.order("created_at", { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return (data || []).map((r) => new Plan(r))
  }

  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabaseAdmin
      .from("planes")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return (data || []).map((r) => new Plan(r))
  }

  async getEjercicios() {
    // 1) Traer detalles del plan
    const { data: detalles, error: e1 } = await supabaseAdmin
      .from("planes_detalles")
      .select("*")
      .eq("plan_id", this.id_plan)
      .order("dia_semana", { ascending: true })
      .order("orden", { ascending: true })

    if (e1) throw e1
    if (!detalles || detalles.length === 0) return []

    // 2) Traer ejercicios en bloque
    const ids = [...new Set(detalles.map((d) => d.ejercicio_id))]
    const { data: exRows, error: e2 } = await supabaseAdmin
      .from("ejercicios")
      .select("*")
      .in("id_ejercicio", ids)

    if (e2) throw e2
    const exById = Object.fromEntries((exRows || []).map((e) => [e.id_ejercicio, e]))

    // 3) Combinar
    return detalles.map((d) => ({
      ...d,
      ejercicio_nombre: exById[d.ejercicio_id]?.nombre || null,
      ejercicio_descripcion: exById[d.ejercicio_id]?.descripcion || null,
      tipo_ejercicio: exById[d.ejercicio_id]?.tipo_ejercicio || null,
    }))
  }

  async getFullPlan() {
    const ejercicios = await this.getEjercicios()
    return { ...this, ejercicios }
  }

  async update(updateData) {
    const payload = { ...updateData }
    delete payload.id_plan

    const { data: row, error } = await supabaseAdmin
      .from("planes")
      .update(payload)
      .eq("id_plan", this.id_plan)
      .select()
      .single()

    if (error) throw error
    Object.assign(this, row)
    return this
  }

  async delete() {
    // Eliminar detalles primero
    const { error: e1 } = await supabaseAdmin
      .from("planes_detalles")
      .delete()
      .eq("plan_id", this.id_plan)

    if (e1) throw e1

    const { error: e2 } = await supabaseAdmin
      .from("planes")
      .delete()
      .eq("id_plan", this.id_plan)

    if (e2) throw e2
    return true
  }
}

class PlanDetalle {
  static async create(data) {
    const { data: row, error } = await supabaseAdmin
      .from("planes_detalles")
      .insert({
        plan_id: data.plan_id,
        ejercicio_id: data.ejercicio_id,
        series: data.series,
        repeticiones: data.repeticiones,
        dia_semana: data.dia_semana,
        orden: data.orden,
      })
      .select()
      .single()

    if (error) throw error
    return row
  }

  static async findByPlanId(planId) {
    const { data, error } = await supabaseAdmin
      .from("planes_detalles")
      .select("*")
      .eq("plan_id", planId)
      .order("dia_semana", { ascending: true })
      .order("orden", { ascending: true })

    if (error) throw error
    return data || []
  }
}

module.exports = { Plan, PlanDetalle }
