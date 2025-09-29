const jwt = require("jsonwebtoken")
const User = require("../models/User")

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "")

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token de acceso requerido",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fitlife_secret_key")

    const user = await User.findById(decoded.userId).select("-password")
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Token inválido",
      })
    }

    req.user = decoded
    req.userDoc = user
    next()
  } catch (error) {
    console.error("Error en autenticación:", error)
    res.status(401).json({
      success: false,
      message: "Token inválido",
    })
  }
}

module.exports = authMiddleware
