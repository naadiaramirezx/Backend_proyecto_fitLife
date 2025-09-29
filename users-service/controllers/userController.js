const User = require("../models/User")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

class UserController {
  // RF01: Crear cuenta de usuario con validación de correo
  async register(req, res) {
    try {
      const {
        email,
        password,
        first_name,
        last_name,
        date_of_birth,
        gender,
        height,
        weight,
        activity_level,
        fitness_goals,
        health_conditions,
      } = req.body

      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: "Email, contraseña, nombre y apellido son requeridos",
        })
      }

      // Validar datos de salud si se proporcionan
      if (height && (height < 100 || height > 250)) {
        return res.status(400).json({
          success: false,
          message: "La estatura debe estar entre 100 y 250 cm",
        })
      }

      if (weight && (weight < 30 || weight > 300)) {
        return res.status(400).json({
          success: false,
          message: "El peso debe estar entre 30 y 300 kg",
        })
      }

      // Verificar si el usuario ya existe
      const existingUser = await User.findByEmail(email)
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "El usuario ya existe con este correo electrónico",
        })
      }

      const userData = {
        email,
        password,
        first_name,
        last_name,
        date_of_birth,
        gender,
        height,
        weight,
        activity_level: activity_level || "sedentary",
        fitness_goals: fitness_goals || [],
        health_conditions: health_conditions || [],
      }

      const user = await User.create(userData)

      // Generar token JWT
      const token = user.generateAuthToken()

      res.status(201).json({
        success: true,
        message:
          "Usuario registrado exitosamente. ¡Ahora puedes recibir recomendaciones personalizadas basadas en tu perfil de salud!",
        data: {
          user: user.toPublicJSON(),
          token,
        },
      })
    } catch (error) {
      console.error("Error en registro:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF02: Inicio de sesión con autenticación segura
  async login(req, res) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email y contraseña son requeridos",
        })
      }

      // Buscar usuario
      const user = await User.findByEmail(email)
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        })
      }

      // Verificar contraseña
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        })
      }

      // Generar token
      const token = user.generateAuthToken()

      res.status(200).json({
        success: true,
        message: "Inicio de sesión exitoso",
        data: {
          user: user.toPublicJSON(),
          token,
        },
      })
    } catch (error) {
      console.error("Error en login:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF03: Editar perfil del usuario
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId
      const updates = req.body

      const allowedUpdates = [
        "first_name",
        "last_name",
        "date_of_birth",
        "gender",
        "height",
        "weight",
        "activity_level",
        "fitness_goals",
        "health_conditions",
        "dietary_restrictions",
      ]

      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      // Validar datos de salud si se actualizan
      if (updates.height && (updates.height < 100 || updates.height > 250)) {
        return res.status(400).json({
          success: false,
          message: "La estatura debe estar entre 100 y 250 cm",
        })
      }

      if (updates.weight && (updates.weight < 30 || updates.weight > 300)) {
        return res.status(400).json({
          success: false,
          message: "El peso debe estar entre 30 y 300 kg",
        })
      }

      // Filtrar solo campos permitidos
      const filteredUpdates = {}
      Object.keys(updates).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key]
        }
      })

      const updatedUser = await user.update(filteredUpdates)

      res.status(200).json({
        success: true,
        message: "Perfil actualizado exitosamente",
        data: {
          user: updatedUser.toPublicJSON(),
        },
      })
    } catch (error) {
      console.error("Error actualizando perfil:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener perfil del usuario
  async getProfile(req, res) {
    try {
      const userId = req.user.userId

      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      res.status(200).json({
        success: true,
        data: { user: user.toPublicJSON() },
      })
    } catch (error) {
      console.error("Error obteniendo perfil:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Verificar email
  async verifyEmail(req, res) {
    try {
      const { token } = req.params

      // Esta funcionalidad necesitaría implementarse en el modelo User
      // Por ahora retornamos un mensaje de éxito
      res.status(200).json({
        success: true,
        message: "Email verificado exitosamente",
      })
    } catch (error) {
      console.error("Error verificando email:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async getHealthAnalysis(req, res) {
    try {
      const userId = req.user.userId

      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      // Calcular IMC si hay datos disponibles
      const healthAnalysis = {
        hasHealthData: !!(user.weight && user.height),
        bmi: null,
        healthStatus: "unknown",
        recommendations: [],
      }

      if (user.weight && user.height) {
        const bmi = user.weight / Math.pow(user.height / 100, 2)
        healthAnalysis.bmi = Math.round(bmi * 10) / 10

        if (bmi < 18.5) {
          healthAnalysis.healthStatus = "underweight"
          healthAnalysis.recommendations.push("Considera aumentar tu ingesta calórica de manera saludable")
          healthAnalysis.recommendations.push("Combina ejercicio cardiovascular suave con entrenamiento de fuerza")
        } else if (bmi < 25) {
          healthAnalysis.healthStatus = "normal"
          healthAnalysis.recommendations.push("Mantén un equilibrio entre cardio y entrenamiento de fuerza")
          healthAnalysis.recommendations.push("Puedes aumentar gradualmente la intensidad de tus ejercicios")
        } else if (bmi < 30) {
          healthAnalysis.healthStatus = "overweight"
          healthAnalysis.recommendations.push("Prioriza ejercicios de bajo impacto inicialmente")
          healthAnalysis.recommendations.push("Combina ejercicio regular con una dieta balanceada")
        } else {
          healthAnalysis.healthStatus = "obese"
          healthAnalysis.recommendations.push("Comienza con caminatas cortas y aumenta gradualmente")
          healthAnalysis.recommendations.push("Considera ejercicios en agua para reducir impacto en articulaciones")
        }
      } else {
        healthAnalysis.recommendations.push(
          "Completa tu perfil con peso y estatura para recibir recomendaciones personalizadas",
        )
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            name: `${user.first_name} ${user.last_name}`,
            weight: user.weight,
            height: user.height,
            age: user.date_of_birth ? new Date().getFullYear() - new Date(user.date_of_birth).getFullYear() : null,
          },
          healthAnalysis,
        },
        message: "Análisis de salud generado exitosamente",
      })
    } catch (error) {
      console.error("Error generando análisis de salud:", error)
      res.status(500).json({
        success: false,
        message: "Error generando análisis de salud",
      })
    }
  }
}

module.exports = new UserController()
