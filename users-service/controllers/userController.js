const User = require("../models/User")
const { supabaseAdmin } = require("../../config/supabaseClient")

class UserController {
  async register(req, res) {
    try {
      const { email, password, nombre, ap_paterno, ap_materno, telefono, peso, altura } = req.body

      // Validación de campos requeridos
      if (!email || !password || !nombre || !ap_paterno) {
        return res.status(400).json({
          success: false,
          message: "Email, contraseña, nombre y apellido paterno son requeridos",
        })
      }

      // Validar longitud de contraseña
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "La contraseña debe tener al menos 8 caracteres",
        })
      }

      // Validar datos de salud si se proporcionan
      if (altura && (altura < 100 || altura > 250)) {
        return res.status(400).json({
          success: false,
          message: "La estatura debe estar entre 100 y 250 cm",
        })
      }

      if (peso && (peso < 30 || peso > 300)) {
        return res.status(400).json({
          success: false,
          message: "El peso debe estar entre 30 y 300 kg",
        })
      }

      const { data: existingUserAuth } = await supabaseAdmin.auth.admin.listUsers()
      const userExists = existingUserAuth.users.find((u) => u.email === email)

      if (userExists) {
        return res.status(409).json({
          success: false,
          message: "El usuario ya existe con este correo electrónico",
        })
      }

      const userData = {
        correo: email,
        password: password,
        nombre: nombre,
        ap_paterno: ap_paterno,
        ap_materno: ap_materno || "",
        telefono: telefono || "",
        peso: peso,
        altura: altura,
      }

      const user = await User.create(userData)

      res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          user: user?.toPublicJSON(),
        },
      })
    } catch (error) {
      console.error("Error en registro:", error)

      if (error.message?.includes("User already registered")) {
        return res.status(409).json({
          success: false,
          message: "El correo electrónico ya está registrado",
        })
      }

      res.status(500).json({
        success: false,
        message: error.message || "Error interno del servidor",
      })
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email y contraseña son requeridos",
        })
      }

      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (authError) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        })
      }

      if (!authData.user) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        })
      }

      const user = await User.findByUserId(authData.user.id)

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado en el sistema",
        })
      }

      res.status(200).json({
        success: true,
        message: "Inicio de sesión exitoso",
        data: {
          user: user.toPublicJSON(),
          session: {
            access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
            expires_at: authData.session?.expires_at,
          },
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

  async updateProfile(req, res) {
    try {
      const perfilId = req.user.perfilId
      const updates = req.body

      const user = await User.findById(perfilId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      // Validar datos de salud si se actualizan
      if (updates.altura && (updates.altura < 100 || updates.altura > 250)) {
        return res.status(400).json({
          success: false,
          message: "La estatura debe estar entre 100 y 250 cm",
        })
      }

      if (updates.peso && (updates.peso < 30 || updates.peso > 300)) {
        return res.status(400).json({
          success: false,
          message: "El peso debe estar entre 30 y 300 kg",
        })
      }

      const updatedUser = await user.update(updates)

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

  async getProfile(req, res) {
    try {
      const perfilId = req.user.perfilId

      const user = await User.findById(perfilId)
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

  async getHealthAnalysis(req, res) {
    try {
      const perfilId = req.user.perfilId

      const user = await User.findById(perfilId)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      const healthAnalysis = {
        hasHealthData: !!(user.peso && user.altura),
        bmi: null,
        healthStatus: "unknown",
        recommendations: [],
      }

      if (user.peso && user.altura) {
        const bmi = user.peso / Math.pow(user.altura / 100, 2)
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
            nombre: `${user.nombre} ${user.ap_paterno}`,
            peso: user.peso,
            altura: user.altura,
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

  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "El email es requerido",
        })
      }

      // Verificar si el usuario existe
      const user = await User.findByEmail(email)
      if (!user) {
        // Por seguridad, no revelamos si el email existe o no
        return res.status(200).json({
          success: true,
          message: "Si el email existe, se ha enviado un enlace de recuperación",
        })
      }

      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password`,
      })

      if (error) {
        console.error("Error solicitando recuperación:", error)
        return res.status(400).json({
          success: false,
          message: "Error al enviar email de recuperación",
        })
      }

      res.status(200).json({
        success: true,
        message: "Si el email existe, se ha enviado un enlace de recuperación",
      })
    } catch (error) {
      console.error("Error en recuperación de contraseña:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token y nueva contraseña son requeridos",
        })
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "La nueva contraseña debe tener al menos 8 caracteres",
        })
      }

      // Verificar el token
      const { data: { user }, error: tokenError } = await supabaseAdmin.auth.getUser(token)
      
      if (tokenError || !user) {
        return res.status(401).json({
          success: false,
          message: "Token inválido o expirado",
        })
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error("Error actualizando contraseña:", updateError)
        return res.status(400).json({
          success: false,
          message: "Error al actualizar la contraseña",
        })
      }

      res.status(200).json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      })
    } catch (error) {
      console.error("Error en reset de contraseña:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user.userId

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "La contraseña actual y nueva son requeridas",
        })
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "La nueva contraseña debe tener al menos 8 caracteres",
        })
      }

      // Verificar contraseña actual
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword,
      })

      if (signInError) {
        return res.status(401).json({
          success: false,
          message: "La contraseña actual es incorrecta",
        })
      }

      // Actualizar contraseña
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )

      if (updateError) {
        console.error("Error actualizando contraseña:", updateError)
        return res.status(400).json({
          success: false,
          message: "Error al actualizar la contraseña",
        })
      }

      res.status(200).json({
        success: true,
        message: "Contraseña actualizada exitosamente",
      })
    } catch (error) {
      console.error("Error cambiando contraseña:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }
}

module.exports = new UserController()