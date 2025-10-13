// models/Exercise.js
const { supabaseAdmin } = require("../../config/supabaseClient")

class Exercise {
  constructor(row) {
    this.id_ejercicio   = row.id_ejercicio
    this.nombre         = row.nombre
    this.descripcion    = row.descripcion
    this.tipo_ejercicio = row.tipo_ejercicio
    this.created_at     = row.created_at
  }

  static async create(data) {
    const { data: rows, error } = await supabaseAdmin
      .from("ejercicios")
      .insert({
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo_ejercicio: data.tipo_ejercicio,
      })
      .select()
      .single()

    if (error) throw error
    return new Exercise(rows)
  }

  static async findById(id) {
    const { data: row, error } = await supabaseAdmin
      .from("ejercicios")
      .select("*")
      .eq("id_ejercicio", id)
      .single()

    if (error && error.code !== "PGRST116") throw error
    return row ? new Exercise(row) : null
  }

  static async findByType(tipo) {
    const { data, error } = await supabaseAdmin
      .from("ejercicios")
      .select("*")
      .eq("tipo_ejercicio", tipo)
      .order("nombre", { ascending: true })

    if (error) throw error
    return (data || []).map((r) => new Exercise(r))
  }

  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabaseAdmin
      .from("ejercicios")
      .select("*")
      .order("nombre", { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return (data || []).map((r) => new Exercise(r))
  }

  async update(updateData) {
    const payload = { ...updateData }
    delete payload.id_ejercicio

    const { data: row, error } = await supabaseAdmin
      .from("ejercicios")
      .update(payload)
      .eq("id_ejercicio", this.id_ejercicio)
      .select()
      .single()

    if (error) throw error
    Object.assign(this, row)
    return this
  }

  async delete() {
    const { error } = await supabaseAdmin
      .from("ejercicios")
      .delete()
      .eq("id_ejercicio", this.id_ejercicio)

    if (error) throw error
    return true
  }
}

module.exports = Exercise
