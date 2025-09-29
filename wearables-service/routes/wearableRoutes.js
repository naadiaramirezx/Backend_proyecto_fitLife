const express = require("express")
const wearableController = require("../Controllers/wearableController")

const router = express.Router()

// Rutas para dispositivos
router.post("/devices", wearableController.registerDevice)
router.get("/devices/:userId", wearableController.getUserDevices)
router.put("/devices/:deviceId/settings", wearableController.updateDeviceSettings)

// Rutas para sincronización de datos
router.post("/sync/:deviceId", wearableController.syncDeviceData)

// Rutas para obtener datos de salud
router.get("/health-data/:userId", wearableController.getHealthData)
router.get("/daily-activity/:userId", wearableController.getDailyActivity)

// Rutas para detección de anomalías
router.get("/anomalies/:userId", wearableController.checkAnomalousValues)

module.exports = router
