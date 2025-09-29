const Device = require("../models/Device")
const { HealthData, SleepData, DailyActivity } = require("../models/HealthData")

class WearableController {
  // Registrar nuevo dispositivo
  async registerDevice(req, res) {
    try {
      const { userId, deviceId, name, brand, model, type, capabilities } = req.body

      if (!userId || !deviceId || !name || !brand || !model || !type) {
        return res.status(400).json({
          success: false,
          message: "Todos los campos requeridos deben ser proporcionados",
        })
      }

      // Verificar si el dispositivo ya existe
      const existingDevice = await Device.findOne({ deviceId })
      if (existingDevice) {
        return res.status(409).json({
          success: false,
          message: "El dispositivo ya está registrado",
        })
      }

      const device = new Device({
        userId,
        deviceId,
        name,
        brand,
        model,
        type,
        capabilities: capabilities || [],
      })

      await device.save()

      res.status(201).json({
        success: true,
        message: "Dispositivo registrado exitosamente",
        data: { device },
      })
    } catch (error) {
      console.error("Error registrando dispositivo:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener dispositivos del usuario
  async getUserDevices(req, res) {
    try {
      const { userId } = req.params

      const devices = await Device.find({
        userId,
        isActive: true,
      }).sort({ createdAt: -1 })

      res.status(200).json({
        success: true,
        data: { devices },
      })
    } catch (error) {
      console.error("Error obteniendo dispositivos:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF08: Sincronizar datos automáticamente
  async syncDeviceData(req, res) {
    try {
      const { deviceId } = req.params
      const { healthData } = req.body

      const device = await Device.findOne({ deviceId })
      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Dispositivo no encontrado",
        })
      }

      // Actualizar estado de conexión
      device.connectionStatus = "syncing"
      device.lastSync = new Date()
      await device.save()

      // Procesar y almacenar datos de salud
      const processedData = []

      for (const data of healthData) {
        const healthRecord = new HealthData({
          userId: device.userId,
          deviceId,
          timestamp: new Date(data.timestamp),
          dataType: data.type,
          value: data.value,
          unit: data.unit,
          quality: data.quality || "good",
          metadata: data.metadata || {},
        })

        await healthRecord.save()
        processedData.push(healthRecord)

        // Procesar datos específicos
        await this.processSpecificData(device.userId, deviceId, data)
      }

      // Actualizar estado de conexión
      device.connectionStatus = "connected"
      await device.save()

      res.status(200).json({
        success: true,
        message: "Datos sincronizados exitosamente",
        data: {
          processedRecords: processedData.length,
          lastSync: device.lastSync,
        },
      })
    } catch (error) {
      console.error("Error sincronizando datos:", error)

      // Actualizar estado de error en el dispositivo
      try {
        await Device.findOneAndUpdate({ deviceId: req.params.deviceId }, { connectionStatus: "error" })
      } catch (updateError) {
        console.error("Error actualizando estado del dispositivo:", updateError)
      }

      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Procesar datos específicos por tipo
  async processSpecificData(userId, deviceId, data) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    switch (data.type) {
      case "steps":
      case "calories":
      case "distance":
        await this.updateDailyActivity(userId, deviceId, today, data)
        break

      case "sleep":
        await this.processSleepData(userId, deviceId, data)
        break

      case "heart_rate":
        await this.processHeartRateData(userId, deviceId, today, data)
        break
    }
  }

  // Actualizar actividad diaria
  async updateDailyActivity(userId, deviceId, date, data) {
    let dailyActivity = await DailyActivity.findOne({ userId, date })

    if (!dailyActivity) {
      dailyActivity = new DailyActivity({ userId, deviceId, date })
    }

    switch (data.type) {
      case "steps":
        dailyActivity.steps = Math.max(dailyActivity.steps, data.value)
        break
      case "calories":
        dailyActivity.caloriesBurned = Math.max(dailyActivity.caloriesBurned, data.value)
        break
      case "distance":
        dailyActivity.distance = Math.max(dailyActivity.distance, data.value)
        break
    }

    // Verificar logros
    this.checkAchievements(dailyActivity)

    await dailyActivity.save()
  }

  // Procesar datos de sueño
  async processSleepData(userId, deviceId, data) {
    const sleepDate = new Date(data.timestamp)
    sleepDate.setHours(0, 0, 0, 0)

    let sleepData = await SleepData.findOne({ userId, date: sleepDate })

    if (!sleepData) {
      sleepData = new SleepData({
        userId,
        deviceId,
        date: sleepDate,
      })
    }

    // Actualizar datos de sueño
    Object.assign(sleepData, data.value)
    await sleepData.save()
  }

  // Procesar datos de ritmo cardíaco
  async processHeartRateData(userId, deviceId, date, data) {
    let dailyActivity = await DailyActivity.findOne({ userId, date })

    if (!dailyActivity) {
      dailyActivity = new DailyActivity({ userId, deviceId, date })
    }

    // Actualizar estadísticas de ritmo cardíaco
    if (!dailyActivity.averageHeartRate) {
      dailyActivity.averageHeartRate = data.value
    } else {
      dailyActivity.averageHeartRate = Math.round((dailyActivity.averageHeartRate + data.value) / 2)
    }

    if (!dailyActivity.maxHeartRate || data.value > dailyActivity.maxHeartRate) {
      dailyActivity.maxHeartRate = data.value
    }

    if (data.metadata && data.metadata.activity === "resting") {
      dailyActivity.restingHeartRate = data.value
    }

    await dailyActivity.save()
  }

  // Verificar logros
  checkAchievements(dailyActivity) {
    const achievements = []

    if (dailyActivity.steps >= dailyActivity.goals.steps) {
      achievements.push("steps_goal")
    }
    if (dailyActivity.distance >= dailyActivity.goals.distance) {
      achievements.push("distance_goal")
    }
    if (dailyActivity.caloriesBurned >= dailyActivity.goals.calories) {
      achievements.push("calories_goal")
    }

    dailyActivity.achievements = [...new Set([...dailyActivity.achievements, ...achievements])]
  }

  // Obtener datos de salud del usuario
  async getHealthData(req, res) {
    try {
      const { userId } = req.params
      const { dataType, startDate, endDate, limit = 100 } = req.query

      const query = { userId }

      if (dataType) {
        query.dataType = dataType
      }

      if (startDate || endDate) {
        query.timestamp = {}
        if (startDate) query.timestamp.$gte = new Date(startDate)
        if (endDate) query.timestamp.$lte = new Date(endDate)
      }

      const healthData = await HealthData.find(query).sort({ timestamp: -1 }).limit(Number.parseInt(limit))

      res.status(200).json({
        success: true,
        data: { healthData },
      })
    } catch (error) {
      console.error("Error obteniendo datos de salud:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Obtener actividad diaria
  async getDailyActivity(req, res) {
    try {
      const { userId } = req.params
      const { date, startDate, endDate } = req.query

      const query = { userId }

      if (date) {
        const targetDate = new Date(date)
        targetDate.setHours(0, 0, 0, 0)
        query.date = targetDate
      } else if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }

      const activities = await DailyActivity.find(query).sort({ date: -1 })

      res.status(200).json({
        success: true,
        data: { activities },
      })
    } catch (error) {
      console.error("Error obteniendo actividad diaria:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // RF10: Detectar valores anormales
  async checkAnomalousValues(req, res) {
    try {
      const { userId } = req.params

      // Obtener datos recientes del usuario
      const recentData = await HealthData.find({
        userId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // últimas 24 horas
      }).sort({ timestamp: -1 })

      const anomalies = []

      // Verificar ritmo cardíaco anormal
      const heartRateData = recentData.filter((d) => d.dataType === "heart_rate")
      for (const hr of heartRateData) {
        if (hr.value > 180 || hr.value < 40) {
          anomalies.push({
            type: "heart_rate_anomaly",
            value: hr.value,
            timestamp: hr.timestamp,
            severity: hr.value > 200 || hr.value < 35 ? "high" : "medium",
            message: `Ritmo cardíaco ${hr.value > 180 ? "elevado" : "bajo"} detectado: ${hr.value} bpm`,
          })
        }
      }

      // Verificar temperatura corporal anormal
      const tempData = recentData.filter((d) => d.dataType === "temperature")
      for (const temp of tempData) {
        if (temp.value > 38.5 || temp.value < 35.0) {
          anomalies.push({
            type: "temperature_anomaly",
            value: temp.value,
            timestamp: temp.timestamp,
            severity: temp.value > 39.5 || temp.value < 34.0 ? "high" : "medium",
            message: `Temperatura corporal ${temp.value > 38.5 ? "elevada" : "baja"} detectada: ${temp.value}°C`,
          })
        }
      }

      // Verificar saturación de oxígeno baja
      const oxygenData = recentData.filter((d) => d.dataType === "blood_oxygen")
      for (const oxygen of oxygenData) {
        if (oxygen.value < 95) {
          anomalies.push({
            type: "oxygen_anomaly",
            value: oxygen.value,
            timestamp: oxygen.timestamp,
            severity: oxygen.value < 90 ? "high" : "medium",
            message: `Saturación de oxígeno baja detectada: ${oxygen.value}%`,
          })
        }
      }

      res.status(200).json({
        success: true,
        data: {
          anomalies,
          hasAnomalies: anomalies.length > 0,
        },
      })
    } catch (error) {
      console.error("Error verificando valores anómalos:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }

  // Actualizar configuración del dispositivo
  async updateDeviceSettings(req, res) {
    try {
      const { deviceId } = req.params
      const { settings } = req.body

      const device = await Device.findOneAndUpdate({ deviceId }, { $set: { settings } }, { new: true })

      if (!device) {
        return res.status(404).json({
          success: false,
          message: "Dispositivo no encontrado",
        })
      }

      res.status(200).json({
        success: true,
        message: "Configuración actualizada exitosamente",
        data: { device },
      })
    } catch (error) {
      console.error("Error actualizando configuración:", error)
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      })
    }
  }
}

module.exports = new WearableController()
