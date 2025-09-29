//Ya no veo nada y aun falta ingles :c
const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const { createProxyMiddleware } = require("http-proxy-middleware")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Configuración de seguridad
app.use(helmet())

// Configuración de CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  }),
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
  message: {
    error: "Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.",
  },
})
app.use(limiter)

// Middleware para parsing JSON
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true }))

// Configuración de servicios (URLs de los microservicios)
const services = {
  users: process.env.USERS_SERVICE_URL || "http://localhost:3001",
  plans: process.env.PLANS_SERVICE_URL || "http://localhost:3002",
  nutrition: process.env.NUTRITION_SERVICE_URL || "http://localhost:3003",
  wearables: process.env.WEARABLES_SERVICE_URL || "http://localhost:3004",
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || "http://localhost:3005",
  routes: process.env.ROUTES_SERVICE_URL || "http://localhost:3006",
}

// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check del API Gateway
app.get("/health", (req, res) => {
  res.status(200).json({
    service: "fitlife-api-gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  })
})

// Health check de todos los servicios
app.get("/health/services", async (req, res) => {
  const serviceHealth = {}

  for (const [serviceName, serviceUrl] of Object.entries(services)) {
    try {
      const response = await fetch(`${serviceUrl}/health`)
      const data = await response.json()
      serviceHealth[serviceName] = {
        status: response.ok ? "healthy" : "unhealthy",
        url: serviceUrl,
        response: data,
      }
    } catch (error) {
      serviceHealth[serviceName] = {
        status: "unreachable",
        url: serviceUrl,
        error: error.message,
      }
    }
  }

  const allHealthy = Object.values(serviceHealth).every((service) => service.status === "healthy")

  res.status(allHealthy ? 200 : 503).json({
    gateway: "fitlife-api-gateway",
    status: allHealthy ? "healthy" : "degraded",
    services: serviceHealth,
    timestamp: new Date().toISOString(),
  })
})

// Configuración de proxies para cada microservicio
const proxyOptions = {
  changeOrigin: true,
  timeout: 30000,
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error(`Proxy error for ${req.path}:`, err.message)
    res.status(503).json({
      success: false,
      message: "Servicio temporalmente no disponible",
      error: "SERVICE_UNAVAILABLE",
    })
  },
  onProxyReq: (proxyReq, req, res) => {
    // Agregar headers adicionales si es necesario
    proxyReq.setHeader("X-Forwarded-Host", req.get("Host"))
    proxyReq.setHeader("X-Forwarded-Proto", req.protocol)
  },
}

// Rutas de proxy para cada microservicio
app.use(
  "/api/users",
  createProxyMiddleware({
    target: services.users,
    ...proxyOptions,
    pathRewrite: {
      "^/api/users": "/api/users",
    },
  }),
)

app.use(
  "/api/plans",
  createProxyMiddleware({
    target: services.plans,
    ...proxyOptions,
    pathRewrite: {
      "^/api/plans": "/api/plans",
    },
  }),
)

app.use(
  "/api/nutrition",
  createProxyMiddleware({
    target: services.nutrition,
    ...proxyOptions,
    pathRewrite: {
      "^/api/nutrition": "/api/nutrition",
    },
  }),
)

app.use(
  "/api/wearables",
  createProxyMiddleware({
    target: services.wearables,
    ...proxyOptions,
    pathRewrite: {
      "^/api/wearables": "/api/wearables",
    },
  }),
)

app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: services.notifications,
    ...proxyOptions,
    pathRewrite: {
      "^/api/notifications": "/api/notifications",
    },
  }),
)

app.use(
  "/api/routes",
  createProxyMiddleware({
    target: services.routes,
    ...proxyOptions,
    pathRewrite: {
      "^/api/routes": "/api/routes",
    },
  }),
)

// Ruta de información de la API
app.get("/api", (req, res) => {
  res.json({
    name: "FitLife API Gateway",
    version: "1.0.0",
    description: "API Gateway para la plataforma FitLife",
    services: {
      users: "/api/users",
      plans: "/api/plans",
      nutrition: "/api/nutrition",
      wearables: "/api/wearables",
      notifications: "/api/notifications",
      routes: "/api/routes",
    },
    documentation: "/api/docs",
    health: "/health",
  })
})

// Documentación básica de la API
app.get("/api/docs", (req, res) => {
  res.json({
    title: "FitLife API Documentation",
    version: "1.0.0",
    description: "Documentación de la API de FitLife",
    endpoints: {
      users: {
        base: "/api/users",
        endpoints: {
          "POST /api/users/register": "Registrar nuevo usuario",
          "POST /api/users/login": "Iniciar sesión",
          "GET /api/users/profile": "Obtener perfil del usuario",
          "PUT /api/users/profile": "Actualizar perfil del usuario",
        },
      },
      plans: {
        base: "/api/plans",
        endpoints: {
          "POST /api/plans/personalized": "Crear plan personalizado",
          "GET /api/plans/user/:userId": "Obtener planes del usuario",
          "POST /api/plans/workout/start": "Iniciar rutina",
          "PUT /api/plans/workout/complete": "Completar rutina",
        },
      },
      nutrition: {
        base: "/api/nutrition",
        endpoints: {
          "GET /api/nutrition/foods/search": "Buscar alimentos",
          "POST /api/nutrition/meal-plans": "Crear plan de comidas",
          "POST /api/nutrition/log": "Registrar consumo de alimentos",
          "GET /api/nutrition/recommendations/:userId": "Obtener recomendaciones",
        },
      },
      wearables: {
        base: "/api/wearables",
        endpoints: {
          "POST /api/wearables/devices": "Registrar dispositivo",
          "GET /api/wearables/devices/:userId": "Obtener dispositivos del usuario",
          "POST /api/wearables/sync/:deviceId": "Sincronizar datos",
          "GET /api/wearables/health-data/:userId": "Obtener datos de salud",
        },
      },
      notifications: {
        base: "/api/notifications",
        endpoints: {
          "POST /api/notifications/workout-reminder": "Enviar recordatorio de rutina",
          "POST /api/notifications/health-alert": "Enviar alerta de salud",
          "GET /api/notifications/user/:userId": "Obtener notificaciones del usuario",
          "GET /api/notifications/preferences/:userId": "Obtener preferencias",
        },
      },
      routes: {
        base: "/api/routes",
        endpoints: {
          "GET /api/routes/recommended": "Obtener rutas recomendadas",
          "GET /api/routes/personalized/me": "Obtener rutas personalizadas",
          "GET /api/routes/search": "Buscar rutas por criterios",
          "POST /api/routes": "Crear nueva ruta",
          "POST /api/routes/activity/start": "Iniciar actividad de ruta",
          "PUT /api/routes/activity/:id/complete": "Completar actividad de ruta",
          "GET /api/routes/history/me": "Obtener historial de rutas",
          "GET /api/routes/stats/me": "Obtener estadísticas de rutas",
        },
      },
    },
  })
})

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint no encontrado",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: "/api",
  })
})

// Middleware de manejo de errores global
app.use((error, req, res, next) => {
  console.error("Error global:", error)

  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  })
})

// Manejo de cierre graceful
process.on("SIGTERM", () => {
  console.log("SIGTERM recibido, cerrando servidor...")
  process.exit(0)
})

process.on("SIGINT", () => {
  console.log("SIGINT recibido, cerrando servidor...")
  process.exit(0)
})

app.listen(PORT, () => {
  console.log(`🚀 FitLife API Gateway ejecutándose en puerto ${PORT}`)
  console.log(`📚 Documentación disponible en: http://localhost:${PORT}/api/docs`)
  console.log(`❤️  Health check en: http://localhost:${PORT}/health`)
  console.log("\n🔗 Servicios configurados:")
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   ${name}: ${url}`)
  })
})

module.exports = app
