const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const authMiddleware = require("../middleware/auth")

router.post("/register", userController.register)
router.post("/login", userController.login)
router.get("/profile", authMiddleware, userController.getProfile)
router.put("/profile", authMiddleware, userController.updateProfile)
router.get("/health-analysis", authMiddleware, userController.getHealthAnalysis)

module.exports = router
