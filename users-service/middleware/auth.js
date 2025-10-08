const { supabaseAdmin } = require("../../config/supabaseClient")
const User = require("../models/User")

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization")
    const token = authHeader?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      })
    }

    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return res.status(401).json({
        success: false,
        message: "Token inválido o expirado",
      })
    }

    const user = await User.findByUserId(authUser.id)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Usuario no encontrado",
      })
    }

    req.user = {
      userId: authUser.id,
      email: user.correo,
      perfilId: user.id_perfil,
    }
    req.userDoc = user

    next()
  } catch (error) {
    console.error("Error en autenticación:", error)

    res.status(401).json({
      success: false,
      message: "Error de autenticación",
    })
  }
}

module.exports = authMiddleware
