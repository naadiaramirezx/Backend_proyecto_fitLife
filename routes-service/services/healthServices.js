const db = require("../../config/database")

class HealthService {
  static async getUserHealthData(perfilId) {
    const query = `
      SELECT 
        p.id_perfil,
        p.nombres,
        p.ap_paterno,
        p.ap_materno,
        p.telefono,
        mc.peso,
        mc.altura,
        mc.fecha as fecha_medicion
      FROM perfil_id p
      LEFT JOIN mediciones_corporales mc ON p.id_perfil = mc.perfil_id
      WHERE p.id_perfil = $1
        AND mc.fecha = (
          SELECT MAX(fecha) 
          FROM mediciones_corporales mc2 
          WHERE mc2.perfil_id = p.id_perfil
        )
    `

    const result = await db.query(query, [perfilId])
    return result.rows[0] || null
  }

  // Calcular IMC (Índice de Masa Corporal)
  static calculateBMI(weight, height) {
    if (!weight || !height) return null
    // height en cm, convertir a metros
    const heightInMeters = height / 100
    return weight / (heightInMeters * heightInMeters)
  }

  // Clasificar estado de salud basado en IMC
  static classifyHealthStatus(bmi) {
    if (!bmi) return "desconocido"

    if (bmi < 18.5) return "bajo_peso"
    if (bmi < 25) return "normal"
    if (bmi < 30) return "sobrepeso"
    return "obesidad"
  }

  static async generateHealthAnalysis(perfilId) {
    const userData = await this.getUserHealthData(perfilId)

    if (!userData) {
      return {
        error: "No se encontraron datos del usuario",
        perfilId,
      }
    }

    const bmi = this.calculateBMI(userData.peso, userData.altura)
    const healthStatus = this.classifyHealthStatus(bmi)

    const analysis = {
      perfilId: userData.id_perfil,
      nombre: `${userData.nombres} ${userData.ap_paterno}`,
      mediciones: {
        peso: userData.peso,
        altura: userData.altura,
        fechaMedicion: userData.fecha_medicion,
      },
      imc: bmi ? Math.round(bmi * 10) / 10 : null,
      estadoSalud: healthStatus,
      nivelFitnessRecomendado: this.getRecommendedFitnessLevel(bmi),
      distanciaMaximaRecomendada: this.getMaxRecommendedDistance(bmi),
      dificultadRecomendada: this.getRecommendedDifficulty(bmi),
      recomendaciones: this.generateHealthRecommendations(healthStatus, bmi),
      actividadesRecomendadas: this.getRecommendedActivities(healthStatus),
    }

    return analysis
  }

  // Determinar nivel de fitness recomendado basado en salud
  static getRecommendedFitnessLevel(bmi) {
    const healthStatus = this.classifyHealthStatus(bmi)

    switch (healthStatus) {
      case "bajo_peso":
        return "principiante" // Ejercicio suave para ganar masa
      case "normal":
        return "intermedio" // Nivel normal
      case "sobrepeso":
        return "principiante" // Reducir intensidad inicialmente
      case "obesidad":
        return "principiante" // Comenzar muy suave
      default:
        return "principiante"
    }
  }

  // Calcular distancia máxima recomendada
  static getMaxRecommendedDistance(bmi) {
    const healthStatus = this.classifyHealthStatus(bmi)

    const distanceMap = {
      bajo_peso: 3,
      normal: 6,
      sobrepeso: 4,
      obesidad: 2,
      desconocido: 3,
    }

    return distanceMap[healthStatus] || 3
  }

  // Obtener dificultad recomendada
  static getRecommendedDifficulty(bmi) {
    const healthStatus = this.classifyHealthStatus(bmi)

    // Para personas con sobrepeso u obesidad, siempre empezar fácil
    if (healthStatus === "sobrepeso" || healthStatus === "obesidad") {
      return "facil"
    }

    if (healthStatus === "normal") {
      return "medio"
    }

    return "facil"
  }

  static generateHealthRecommendations(healthStatus, bmi) {
    const recommendations = []

    switch (healthStatus) {
      case "bajo_peso":
        recommendations.push("Combina ejercicio cardiovascular suave con actividades para ganar masa muscular")
        recommendations.push("Enfócate en rutinas de fortalecimiento gradual")
        recommendations.push("Considera consultar con un nutricionista")
        break
      case "normal":
        recommendations.push("Mantén un equilibrio entre ejercicio cardiovascular y fortalecimiento")
        recommendations.push("Puedes aumentar gradualmente la intensidad de tus entrenamientos")
        recommendations.push("Excelente momento para establecer metas de fitness más ambiciosas")
        break
      case "sobrepeso":
        recommendations.push("Prioriza ejercicios de bajo impacto como caminar y ciclismo")
        recommendations.push("Combina el ejercicio con una alimentación balanceada")
        recommendations.push("Aumenta gradualmente la duración antes que la intensidad")
        break
      case "obesidad":
        recommendations.push("Comienza con caminatas cortas de 15-20 minutos")
        recommendations.push("Considera ejercicios en agua para reducir el impacto en las articulaciones")
        recommendations.push("Es importante consultar con un médico antes de iniciar cualquier programa")
        recommendations.push("Enfócate en crear hábitos sostenibles a largo plazo")
        break
      default:
        recommendations.push("Consulta con un profesional de la salud para una evaluación personalizada")
    }

    return recommendations
  }

  static getRecommendedActivities(healthStatus) {
    const activityMap = {
      bajo_peso: ["caminar", "ciclismo"],
      normal: ["caminar", "correr", "ciclismo", "senderismo"],
      sobrepeso: ["caminar", "ciclismo"],
      obesidad: ["caminar"],
      desconocido: ["caminar"],
    }

    return activityMap[healthStatus] || ["caminar"]
  }

  static async updateUserRecommendations(perfilId) {
    const analysis = await this.generateHealthAnalysis(perfilId)

    if (analysis.error) {
      return analysis
    }

    // Generar recomendaciones de rutas basadas en el análisis
    const routes = await db.query(
      `
      SELECT id_ruta, nombre, dificultad, tipo_actividad, distancia_km
      FROM rutas_ejercicio 
      WHERE es_publica = true 
        AND dificultad = $1
        AND tipo_actividad = ANY($2)
        AND distancia_km <= $3
      ORDER BY calificacion_promedio DESC
      LIMIT 10
    `,
      [analysis.dificultadRecomendada, analysis.actividadesRecomendadas, analysis.distanciaMaximaRecomendada],
    )

    // Insertar o actualizar recomendaciones
    for (const route of routes.rows) {
      const score = this.calculateRouteScore(analysis, route)

      await db.query(
        `
        INSERT INTO recomendaciones_rutas (perfil_id, id_ruta, puntuacion_recomendacion, razon_recomendacion, basado_en_imc)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (perfil_id, id_ruta) 
        DO UPDATE SET 
          puntuacion_recomendacion = EXCLUDED.puntuacion_recomendacion,
          razon_recomendacion = EXCLUDED.razon_recomendacion,
          fecha_recomendacion = NOW(),
          es_activa = true
      `,
        [perfilId, route.id_ruta, score, `Recomendada para tu IMC de ${analysis.imc}`],
      )
    }

    return {
      ...analysis,
      rutasRecomendadas: routes.rows.length,
    }
  }

  // Calcular puntuación de compatibilidad de ruta
  static calculateRouteScore(analysis, route) {
    let score = 50 // Base score

    // Ajustar por dificultad apropiada
    if (route.dificultad === analysis.dificultadRecomendada) {
      score += 30
    }

    // Ajustar por distancia apropiada
    if (route.distancia_km <= analysis.distanciaMaximaRecomendada) {
      score += 20
    }

    // Ajustar por actividad recomendada
    if (analysis.actividadesRecomendadas.includes(route.tipo_actividad)) {
      score += 20
    }

    return Math.min(100, Math.max(0, score))
  }
}

module.exports = HealthService
