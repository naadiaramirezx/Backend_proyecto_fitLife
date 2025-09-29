const express = require("express")
const userController = require("../controllers/userController")
const authMiddleware = require("../middleware/auth")

const router = express.Router()

// Rutas públicas
router.post("/register", userController.register)
router.post("/login", userController.login)
router.get("/verify-email/:token", userController.verifyEmail)

// Rutas protegidas (requieren autenticación)
router.use(authMiddleware) // Aplicar middleware a todas las rutas siguientes

router.get("/profile", userController.getProfile)
router.put("/profile", userController.updateProfile)
router.get("/health-analysis", userController.getHealthAnalysis)

module.exports = router
