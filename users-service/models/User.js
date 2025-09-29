const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const dbConnection = require("../../config/database")

class User {
  constructor(userData) {
    this.id_usuario = userData.id_usuario
    this.correo = userData.correo
    this.password = userData.password
    this.perfil_id = userData.perfil_id
    this.is_active = userData.is_active
    this.created_at = userData.created_at
    this.updated_at = userData.updated_at
  }

  // Crear nuevo usuario
  static async create(userData) {
    try {
      // Hash password
      const salt = await bcrypt.genSalt(12)
      const hashedPassword = await bcrypt.hash(userData.password, salt)

      const profileQuery = `
        INSERT INTO perfil_id (nombres, ap_paterno, ap_materno, telefono)
        VALUES ($1, $2, $3, $4)
        RETURNING id_perfil
      `

      const profileValues = [
        userData.nombres,
        userData.ap_paterno || "",
        userData.ap_materno || "",
        userData.telefono || "",
      ]

      const profileResult = await dbConnection.query(profileQuery, profileValues)
      const perfilId = profileResult.rows[0].id_perfil

      const userQuery = `
        INSERT INTO usuarios (correo, password, perfil_id, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `

      const userValues = [userData.correo, hashedPassword, perfilId, true]

      const userResult = await dbConnection.query(userQuery, userValues)

      if (userData.peso && userData.altura) {
        const measurementQuery = `
          INSERT INTO mediciones_corporales (perfil_id, peso, altura, fecha)
          VALUES ($1, $2, $3, NOW())
        `
        await dbConnection.query(measurementQuery, [perfilId, userData.peso, userData.altura])
      }

      return new User(userResult.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar usuario por email
  static async findByEmail(correo) {
    try {
      const query = `
        SELECT u.*, p.nombres, p.ap_paterno, p.ap_materno, p.telefono
        FROM usuarios u
        JOIN perfil_id p ON u.perfil_id = p.id_perfil
        WHERE u.correo = $1 AND u.is_active = true
      `
      const result = await dbConnection.query(query, [correo])

      if (result.rows.length === 0) {
        return null
      }

      return new User(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Buscar usuario por ID
  static async findById(id_usuario) {
    try {
      const query = `
        SELECT u.*, p.nombres, p.ap_paterno, p.ap_materno, p.telefono
        FROM usuarios u
        JOIN perfil_id p ON u.perfil_id = p.id_perfil
        WHERE u.id_usuario = $1 AND u.is_active = true
      `
      const result = await dbConnection.query(query, [id_usuario])

      if (result.rows.length === 0) {
        return null
      }

      return new User(result.rows[0])
    } catch (error) {
      throw error
    }
  }

  // Actualizar usuario
  async update(updateData) {
    try {
      const fields = []
      const values = []
      let paramCount = 1

      // Construir query dinámicamente
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined && key !== "id_usuario") {
          fields.push(`${key} = $${paramCount}`)
          values.push(updateData[key])
          paramCount++
        }
      })

      if (fields.length === 0) {
        return this
      }

      values.push(this.id_usuario) // Para el WHERE clause

      const query = `
        UPDATE usuarios 
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE id_usuario = $${paramCount}
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

  // Eliminar usuario (soft delete)
  async delete() {
    try {
      const query = "UPDATE usuarios SET is_active = false, updated_at = NOW() WHERE id_usuario = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id_usuario])

      if (result.rows.length > 0) {
        this.is_active = false
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Comparar contraseña
  async comparePassword(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password)
  }

  // Generar token JWT
  generateAuthToken() {
    return jwt.sign(
      {
        userId: this.id_usuario,
        email: this.correo,
        perfilId: this.perfil_id,
      },
      process.env.JWT_SECRET || "fitlife_secret_key",
      { expiresIn: "7d" },
    )
  }

  // Verificar email
  async verifyEmail() {
    try {
      const query = "UPDATE usuarios SET correo_verified = true, updated_at = NOW() WHERE id_usuario = $1 RETURNING *"
      const result = await dbConnection.query(query, [this.id_usuario])

      if (result.rows.length > 0) {
        this.correo_verified = true
      }

      return this
    } catch (error) {
      throw error
    }
  }

  // Obtener todos los usuarios (para admin)
  static async findAll(limit = 50, offset = 0) {
    try {
      const query = `
        SELECT u.*, p.nombres, p.ap_paterno, p.ap_materno, p.telefono
        FROM usuarios u
        JOIN perfil_id p ON u.perfil_id = p.id_perfil
        WHERE u.is_active = true 
        ORDER BY u.created_at DESC 
        LIMIT $1 OFFSET $2
      `
      const result = await dbConnection.query(query, [limit, offset])

      return result.rows.map((row) => new User(row))
    } catch (error) {
      throw error
    }
  }

  // Contar usuarios activos
  static async count() {
    try {
      const query = "SELECT COUNT(*) FROM usuarios WHERE is_active = true"
      const result = await dbConnection.query(query)

      return Number.parseInt(result.rows[0].count)
    } catch (error) {
      throw error
    }
  }

  // Método para obtener datos públicos del usuario (sin password)
  toPublicJSON() {
    const { password, ...publicData } = this
    return publicData
  }

  // Método para obtener las últimas mediciones corporales
  async getLatestMeasurements() {
    try {
      const query = `
        SELECT peso, altura, fecha
        FROM mediciones_corporales
        WHERE perfil_id = $1
        ORDER BY fecha DESC
        LIMIT 1
      `
      const result = await dbConnection.query(query, [this.perfil_id])
      return result.rows[0] || null
    } catch (error) {
      throw error
    }
  }
}

module.exports = User
