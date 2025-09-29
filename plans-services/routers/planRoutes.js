const express = require("express")
const planController = require("../controllers/planController")

const router = express.Router()

// Rutas para usuarios
router.post("/personalized", planController.createPersonalizedPlan)
router.get("/user/:userId", planController.getUserPlans)
router.post("/workout/start", planController.startWorkout)
router.put("/workout/complete", planController.completeWorkout)
router.get("/", planController.getAllPlans)

// Rutas para administradores/entrenadores
router.post("/", planController.createPlan)
router.put("/:planId", planController.updatePlan)
router.delete("/:planId", planController.deletePlan)

module.exports = router
