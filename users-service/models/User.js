const { supabase, supabaseAdmin } = require("../../config/supabaseClient")

class User {
  constructor(userData) {
    this.id_perfil = userData.id_perfil
    this.user_id = userData.user_id
    this.correo = userData.correo
    this.nombre = userData.nombre
    this.ap_paterno = userData.ap_paterno
    this.ap_materno = userData.ap_materno
    this.telefono = userData.telefono
    this.peso = userData.peso
    this.altura = userData.altura
    this.created_at = userData.created_at
  }

  toPublicJSON() {
    return {
      id: this.id_perfil,
      user_id: this.user_id,
      email: this.correo,
      perfil: {
        id: this.id_perfil,
        nombre: this.nombre,
        ap_paterno: this.ap_paterno,
        ap_materno: this.ap_materno,
        telefono: this.telefono,
      },
      mediciones: {
        peso: this.peso,
        altura: this.altura,
      },
      created_at: this.created_at,
    }
  }

  async update(updates) {
    try {
      const allowedFields = {
        nombre: updates.nombre,
        ap_paterno: updates.ap_paterno,
        ap_materno: updates.ap_materno,
        telefono: updates.telefono,
      }

      const fieldsToUpdate = {}
      Object.keys(allowedFields).forEach((key) => {
        if (allowedFields[key] !== undefined) {
          fieldsToUpdate[key] = allowedFields[key]
        }
      })

      if (Object.keys(fieldsToUpdate).length === 0 && !updates.peso && !updates.altura) {
        return this
      }

      if (Object.keys(fieldsToUpdate).length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("perfiles")
          .update(fieldsToUpdate)
          .eq("id_perfil", this.id_perfil)
          .select()
          .single()

        if (profileError) throw profileError

        Object.assign(this, profileData)
      }

      if (updates.peso || updates.altura) {
        const peso = updates.peso || this.peso
        const altura = updates.altura || this.altura

        const { error: measurementError } = await supabase.from("mediciones_corporales").insert({
          perfil_id: this.id_perfil,
          peso: peso,
          altura: altura,
          fecha: new Date().toISOString().split("T")[0],
        })

        if (measurementError) throw measurementError

        this.peso = peso
        this.altura = altura
      }

      return this
    } catch (error) {
      console.error("Error actualizando usuario:", error)
      throw error
    }
  }

  static async create(userData) {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userData.correo)) {
        throw new Error("Formato de email inválido")
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.correo,
        password: userData.password,
        email_confirm: true,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("No se pudo crear el usuario en Supabase Auth")

      const authUserId = authData.user.id

      const { data: profileData, error: profileError } = await supabase
        .from("perfiles")
        .insert({
          user_id: authUserId,
          nombre: userData.nombre,
          ap_paterno: userData.ap_paterno,
          ap_materno: userData.ap_materno || "",
          telefono: userData.telefono || "",
        })
        .select()
        .single()

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        throw profileError
      }

      const perfilId = profileData.id_perfil

      if (userData.peso && userData.altura) {
        const { error: measurementError } = await supabase.from("mediciones_corporales").insert({
          perfil_id: perfilId,
          peso: userData.peso,
          altura: userData.altura,
          fecha: new Date().toISOString().split("T")[0],
        })

        if (measurementError) console.error("Error insertando mediciones:", measurementError)
      }

      const completeUser = await User.findByUserId(authUserId)
      return completeUser
    } catch (error) {
      console.error("Error creando usuario:", error)
      throw error
    }
  }

  static async findByUserId(userId) {
    try {
      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (perfilError) {
        if (perfilError.code === "PGRST116") return null
        throw perfilError
      }

      if (!perfil) return null

      // Obtener email del usuario de auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)

      // Obtener última medición
      const { data: mediciones } = await supabase
        .from("mediciones_corporales")
        .select("peso, altura")
        .eq("perfil_id", perfil.id_perfil)
        .order("fecha", { ascending: false })
        .limit(1)
        .single()

      const userData = {
        ...perfil,
        correo: authUser.user?.email,
        peso: mediciones?.peso,
        altura: mediciones?.altura,
      }

      return new User(userData)
    } catch (error) {
      console.error("Error buscando usuario por user_id:", error)
      throw error
    }
  }

  static async findByEmail(correo) {
    try {
      // Buscar en Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

      if (authError) throw authError

      const authUser = authUsers.users.find((u) => u.email === correo)
      if (!authUser) return null

      // Buscar perfil asociado
      return await User.findByUserId(authUser.id)
    } catch (error) {
      console.error("Error buscando usuario por email:", error)
      throw error
    }
  }

  static async findById(id_perfil) {
    try {
      const { data: perfil, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id_perfil", id_perfil)
        .single()

      if (perfilError) {
        if (perfilError.code === "PGRST116") return null
        throw perfilError
      }

      if (!perfil) return null

      // Obtener email del usuario de auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(perfil.user_id)

      // Obtener última medición
      const { data: mediciones } = await supabase
        .from("mediciones_corporales")
        .select("peso, altura")
        .eq("perfil_id", perfil.id_perfil)
        .order("fecha", { ascending: false })
        .limit(1)
        .single()

      const userData = {
        ...perfil,
        correo: authUser.user?.email,
        peso: mediciones?.peso,
        altura: mediciones?.altura,
      }

      return new User(userData)
    } catch (error) {
      console.error("Error buscando usuario por ID:", error)
      throw error
    }
  }
}

module.exports = User
