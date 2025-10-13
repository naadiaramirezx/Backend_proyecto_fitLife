// models/UserPlan.js
const { supabaseAdmin } = require("../../config/supabaseClient")

class UserPlan {
  constructor(row) {
    this.id_suscripcion = row.id_suscripcion
    this.plan_id        = row.plan_id
    this.perfil_id      = row.perfil_id
    this.id_estado      = row.id_estado
    this.fecha_inicio   = row.fecha_inicio
    this.fecha_fin      = row.fecha_fin
    this.created_at     = row.created_at
    // opcionalmente “plan_*” si los trae el select
    this.plan_nombre    = row.plan_nombre
    this.objetivo       = row.objetivo
    this.duracion_dias  = row.duracion_dias
  }

  static async create(data) {
    const { data: row, error } = await supabaseAdmin
      .from("suscripciones")
      .insert({
        plan_id: data.plan_id,
        perfil_id: data.perfil_id,
        id_estado: data.id_estado ?? 1,
        fecha_inicio: data.fecha_inicio,
        fecha_fin: data.fecha_fin,
      })
      .select()
      .single()

    if (error) throw error
    return new UserPlan(row)
  }

  static async findByUserId(perfilId, estado = null) {
    let query = supabaseAdmin
      .from("suscripciones")
      .select(`
        *,
        planes:plan_id ( id_plan, nombre, objetivo, duracion_dias )
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })

    if (estado) query = query.eq("id_estado", estado)

    const { data, error } = await query
    if (error) throw error

    const mapped = (data || []).map((row) => {
      const plan = row.planes || {}
      return new UserPlan({
        ...row,
        plan_nombre: plan.nombre,
        objetivo: plan.objetivo,
        duracion_dias: plan.duracion_dias,
      })
    })
    return mapped
  }

  static async findActiveByUserId(perfilId) {
    const { data, error } = await supabaseAdmin
      .from("suscripciones")
      .select(`
        *,
        planes:plan_id ( id_plan, nombre, objetivo, duracion_dias )
      `)
      .eq("perfil_id", perfilId)
      .eq("id_estado", 1)
      .order("created_at", { ascending: false })
      .limit(1)
    
    if (error) throw error
    if (!data || data.length === 0) return null

    const row = data[0]
    const plan = row.planes || {}
    return new UserPlan({
      ...row,
      plan_nombre: plan.nombre,
      objetivo: plan.objetivo,
      duracion_dias: plan.duracion_dias,
    })
  }

  async updateStatus(nuevoEstado) {
    const { data: row, error } = await supabaseAdmin
      .from("suscripciones")
      .update({ id_estado: nuevoEstado })
      .eq("id_suscripcion", this.id_suscripcion)
      .select()
      .single()

    if (error) throw error
    this.id_estado = row.id_estado
    return this
  }

  async getFullPlan() {
    // estado + plan (via relaciones)
    const { data: row, error } = await supabaseAdmin
      .from("suscripciones")
      .select(`
        *,
        plan:plan_id (*),
        estado:id_estado (*)
      `)
      .eq("id_suscripcion", this.id_suscripcion)
      .single()

    if (error) throw error
    return row
  }

  async getEjerciciosPorDia(diaSemana) {
    // asegurarnos de tener el plan_id (si no, recargar suscripción)
    let planId = this.plan_id
    if (!planId) {
      const { data: s, error } = await supabaseAdmin
        .from("suscripciones")
        .select("plan_id")
        .eq("id_suscripcion", this.id_suscripcion)
        .single()
      if (error) throw error
      planId = s?.plan_id
    }

    // detalles del día
    const { data: detalles, error: e1 } = await supabaseAdmin
      .from("planes_detalles")
      .select("*")
      .eq("plan_id", planId)
      .eq("dia_semana", diaSemana)
      .order("orden", { ascending: true })

    if (e1) throw e1
    if (!detalles || detalles.length === 0) return []

    // ejercicios del bloque
    const ids = [...new Set(detalles.map((d) => d.ejercicio_id))]
    const { data: exRows, error: e2 } = await supabaseAdmin
      .from("ejercicios")
      .select("*")
      .in("id_ejercicio", ids)

    if (e2) throw e2
    const exById = Object.fromEntries((exRows || []).map((e) => [e.id_ejercicio, e]))

    return detalles.map((d) => ({
      ...d,
      ejercicio_nombre: exById[d.ejercicio_id]?.nombre || null,
      ejercicio_descripcion: exById[d.ejercicio_id]?.descripcion || null,
      tipo_ejercicio: exById[d.ejercicio_id]?.tipo_ejercicio || null,
    }))
  }
}

module.exports = UserPlan
