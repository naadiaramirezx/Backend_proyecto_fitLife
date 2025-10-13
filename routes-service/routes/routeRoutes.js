const express = require("express");
const RouteController = require("../controllers/routesController");
const verifyUser = require("../middleware/auth");

const router = express.Router();

// Públicas
router.get("/", RouteController.getAllRoutes);
router.get("/:id", RouteController.getRouteById);

// Protegidas
router.use(verifyUser);
router.post("/", RouteController.createRoute);
router.post("/activity/start", RouteController.startRouteActivity);
router.put("/activity/complete", RouteController.completeRouteActivity);
router.get("/history/me", RouteController.getUserRouteHistory);

module.exports = router;
