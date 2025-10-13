// routes/planRoutes.js
const express = require("express")
const router = express.Router()
const planController = require("../controllers/planControllers")

// RF04: Crear plan personalizado
router.post("/personalized", planController.createPersonalizedPlan)

// RF05: Consultar rutinas del usuario
router.get("/user/:perfil_id", planController.getUserPlans)

// Ejercicios del día (por suscripción)
router.get("/today/:suscripcion_id", planController.getTodayWorkout)

// RF07: CRUD de planes (admin)
router.post("/", planController.createPlan)
router.put("/:planId", planController.updatePlan)
router.delete("/:planId", planController.deletePlan)

// Listado de planes + ejercicios
router.get("/", planController.getAllPlans)
router.get("/exercises", planController.getAllExercises)

module.exports = router
