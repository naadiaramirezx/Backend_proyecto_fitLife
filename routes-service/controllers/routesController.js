const Route = require("../models/Route")
const UserRoute = require("../models/UserRoute")
const HealthService = require("../services/healthService")

class RouteController {
  // Get recommended routes for user
  static async getRecommendedRoutes(req, res) {
    try {
      const userId = req.user?.id
      const { activity_type = "walking", limit = 10 } = req.query

      // Obtener perfil de salud del usuario
      const userQuery = `
        SELECT weight, height, 
               EXTRACT(YEAR FROM AGE(date_of_birth)) as age,
               activity_level, fitness_goals, health_conditions
        FROM users WHERE id = $1
      `
      const userResult = await require("../../config/database").query(userQuery, [userId])

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      const userProfile = userResult.rows[0]
      const healthRecommendations = HealthService.generateHealthRecommendations(userProfile)

      const preferences = {
        activity_type: userProfile.weight >= 80 ? "walking" : activity_type, // Priorizar caminar para personas con más peso
        difficulty: healthRecommendations.recommendedDifficulty,
        max_distance: healthRecommendations.maxDistance,
        limit: Number.parseInt(limit),
      }

      const routes = await Route.getRecommendedRoutes(userId, preferences)

      res.status(200).json({
        success: true,
        data: {
          routes,
          healthProfile: {
            bmi: healthRecommendations.bmi,
            healthStatus: healthRecommendations.healthStatus,
            fitnessLevel: healthRecommendations.fitnessLevel,
            recommendations: healthRecommendations.tips,
          },
        },
        message: "Rutas recomendadas basadas en tu estado de salud",
      })
    } catch (error) {
      console.error("Error getting health-based recommended routes:", error)
      res.status(500).json({
        success: false,
        message: "Error retrieving recommended routes",
        error: error.message,
      })
    }
  }

  // Get personalized routes based on user profile
  static async getPersonalizedRoutes(req, res) {
    try {
      const userId = req.user.id

      const routes = await Route.getPersonalizedRoutes(userId)

      res.status(200).json({
        success: true,
        data: routes,
        message: "Personalized routes retrieved successfully",
      })
    } catch (error) {
      console.error("Error getting personalized routes:", error)
      res.status(500).json({
        success: false,
        message: "Error retrieving personalized routes",
        error: error.message,
      })
    }
  }

  // Search routes
  static async searchRoutes(req, res) {
    try {
      const {
        activity_type,
        difficulty,
        min_distance,
        max_distance,
        location,
        tags,
        limit = 20,
        offset = 0,
      } = req.query

      const criteria = {
        activity_type,
        difficulty,
        min_distance: min_distance ? Number.parseFloat(min_distance) : undefined,
        max_distance: max_distance ? Number.parseFloat(max_distance) : undefined,
        location,
        tags: tags ? tags.split(",") : undefined,
        limit: Number.parseInt(limit),
        offset: Number.parseInt(offset),
      }

      const routes = await Route.search(criteria)

      res.status(200).json({
        success: true,
        data: routes,
        message: "Routes retrieved successfully",
      })
    } catch (error) {
      console.error("Error searching routes:", error)
      res.status(500).json({
        success: false,
        message: "Error searching routes",
        error: error.message,
      })
    }
  }

  // Get route by ID
  static async getRouteById(req, res) {
    try {
      const { id } = req.params
      const route = await Route.findById(id)

      if (!route) {
        return res.status(404).json({
          success: false,
          message: "Route not found",
        })
      }

      res.status(200).json({
        success: true,
        data: route,
        message: "Route retrieved successfully",
      })
    } catch (error) {
      console.error("Error getting route:", error)
      res.status(500).json({
        success: false,
        message: "Error retrieving route",
        error: error.message,
      })
    }
  }

  // Create new route
  static async createRoute(req, res) {
    try {
      const userId = req.user.id
      const routeData = {
        ...req.body,
        created_by: userId,
      }

      const route = await Route.create(routeData)

      res.status(201).json({
        success: true,
        data: route,
        message: "Route created successfully",
      })
    } catch (error) {
      console.error("Error creating route:", error)
      res.status(500).json({
        success: false,
        message: "Error creating route",
        error: error.message,
      })
    }
  }

  // Start route activity
  static async startRouteActivity(req, res) {
    try {
      const userId = req.user.id
      const { route_id, notes } = req.body

      const userRoute = await UserRoute.create({
        user_id: userId,
        route_id,
        status: "in_progress",
        start_time: new Date(),
        notes,
      })

      res.status(201).json({
        success: true,
        data: userRoute,
        message: "Route activity started successfully",
      })
    } catch (error) {
      console.error("Error starting route activity:", error)
      res.status(500).json({
        success: false,
        message: "Error starting route activity",
        error: error.message,
      })
    }
  }

  // Complete route activity
  static async completeRouteActivity(req, res) {
    try {
      const { id } = req.params
      const completionData = req.body

      const userRoute = await UserRoute.findById(id)
      if (!userRoute) {
        return res.status(404).json({
          success: false,
          message: "Route activity not found",
        })
      }

      if (userRoute.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized to complete this route activity",
        })
      }

      const completedRoute = await userRoute.completeActivity(completionData)

      res.status(200).json({
        success: true,
        data: completedRoute,
        message: "Route activity completed successfully",
      })
    } catch (error) {
      console.error("Error completing route activity:", error)
      res.status(500).json({
        success: false,
        message: "Error completing route activity",
        error: error.message,
      })
    }
  }

  // Get user's route history
  static async getUserRouteHistory(req, res) {
    try {
      const userId = req.user.id
      const { limit = 20, offset = 0 } = req.query

      const history = await UserRoute.getUserRouteHistory(userId, Number.parseInt(limit), Number.parseInt(offset))

      res.status(200).json({
        success: true,
        data: history,
        message: "Route history retrieved successfully",
      })
    } catch (error) {
      console.error("Error getting route history:", error)
      res.status(500).json({
        success: false,
        message: "Error retrieving route history",
        error: error.message,
      })
    }
  }

  // Get user's route statistics
  static async getUserRouteStats(req, res) {
    try {
      const userId = req.user.id
      const stats = await UserRoute.getUserRouteStats(userId)

      res.status(200).json({
        success: true,
        data: stats,
        message: "Route statistics retrieved successfully",
      })
    } catch (error) {
      console.error("Error getting route statistics:", error)
      res.status(500).json({
        success: false,
        message: "Error retrieving route statistics",
        error: error.message,
      })
    }
  }

  // New endpoint for health analysis
  static async getHealthAnalysis(req, res) {
    try {
      const userId = req.user.id

      const userQuery = `
        SELECT weight, height, 
               EXTRACT(YEAR FROM AGE(date_of_birth)) as age,
               activity_level, fitness_goals, health_conditions,
               first_name, last_name
        FROM users WHERE id = $1
      `
      const userResult = await require("../../config/database").query(userQuery, [userId])

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        })
      }

      const userProfile = userResult.rows[0]
      const healthAnalysis = HealthService.generateHealthRecommendations(userProfile)

      res.status(200).json({
        success: true,
        data: {
          user: {
            name: `${userProfile.first_name} ${userProfile.last_name}`,
            weight: userProfile.weight,
            height: userProfile.height,
            age: userProfile.age,
          },
          healthAnalysis,
        },
        message: "Análisis de salud generado exitosamente",
      })
    } catch (error) {
      console.error("Error generating health analysis:", error)
      res.status(500).json({
        success: false,
        message: "Error generating health analysis",
        error: error.message,
      })
    }
  }
}

module.exports = RouteController
