const express = require("express")
const RouteController = require("../controllers/routeController")
const auth = require("../middleware/auth")

const router = express.Router()

// Public routes
router.get("/search", RouteController.searchRoutes)
router.get("/:id", RouteController.getRouteById)

// Protected routes (require authentication)
router.use(auth) // Apply auth middleware to all routes below

router.get("/recommended", RouteController.getRecommendedRoutes)
router.get("/personalized/me", RouteController.getPersonalizedRoutes)
router.get("/health-analysis", RouteController.getHealthAnalysis)
router.post("/", RouteController.createRoute)
router.post("/activity/start", RouteController.startRouteActivity)
router.put("/activity/:id/complete", RouteController.completeRouteActivity)
router.get("/history/me", RouteController.getUserRouteHistory)
router.get("/stats/me", RouteController.getUserRouteStats)

module.exports = router
