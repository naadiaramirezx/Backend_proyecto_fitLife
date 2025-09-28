const db = require("../../config/database")

class Route {
  constructor(data) {
    this.id_ruta = data.id_ruta
    this.nombre = data.nombre
    this.descripcion = data.descripcion
    this.distancia_km = data.distancia_km
    this.duracion_minutos = data.duracion_minutos
    this.dificultad = data.dificultad // facil, medio, dificil
    this.tipo_actividad = data.tipo_actividad // caminar, correr, ciclismo, senderismo
    this.coordenadas = data.coordenadas
    this.elevacion_metros = data.elevacion_metros
    this.ubicacion = data.ubicacion
    this.calorias_estimadas = data.calorias_estimadas
    this.tags = data.tags
    this.es_publica = data.es_publica
    this.calificacion_promedio = data.calificacion_promedio
    this.created_at = data.created_at
    this.updated_at = data.updated_at
  }

  // Create a new route
  static async create(routeData) {
    const query = `
      INSERT INTO rutas_ejercicio (nombre, descripcion, distancia_km, duracion_minutos, dificultad, tipo_actividad, 
                         coordenadas, elevacion_metros, ubicacion, calorias_estimadas, tags, es_publica)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `

    const values = [
      routeData.nombre,
      routeData.descripcion,
      routeData.distancia_km,
      routeData.duracion_minutos,
      routeData.dificultad,
      routeData.tipo_actividad,
      JSON.stringify(routeData.coordenadas),
      routeData.elevacion_metros,
      routeData.ubicacion,
      routeData.calorias_estimadas,
      JSON.stringify(routeData.tags || []),
      routeData.es_publica || true,
    ]

    const result = await db.query(query, values)
    return new Route(result.rows[0])
  }

  // Get route by ID
  static async findById(id) {
    const query = "SELECT * FROM rutas_ejercicio WHERE id_ruta = $1"
    const result = await db.query(query, [id])

    if (result.rows.length === 0) {
      return null
    }

    return new Route(result.rows[0])
  }

  // Get recommended routes for user
  static async getRecommendedRoutes(userId, preferences = {}) {
    const {
      tipo_actividad = "correr",
      dificultad = "medio",
      max_distance_km = 10,
      ubicacion = null,
      limit = 10,
    } = preferences

    let query = `
      SELECT r.*, 
             COALESCE(AVG(rr.calificacion), 0) as calificacion_promedio_calculada,
             COUNT(rr.id_resena) as cantidad_resenas
      FROM rutas_ejercicio r
      LEFT JOIN resenas_rutas rr ON r.id_ruta = rr.id_ruta
      WHERE r.es_publica = true
        AND r.tipo_actividad = $1
        AND r.dificultad = $2
        AND r.distancia_km <= $3
    `

    const values = [tipo_actividad, dificultad, max_distance_km]
    let paramCount = 3

    if (ubicacion) {
      paramCount++
      query += ` AND r.ubicacion ILIKE $${paramCount}`
      values.push(`%${ubicacion}%`)
    }

    query += `
      GROUP BY r.id_ruta
      ORDER BY calificacion_promedio_calculada DESC, r.created_at DESC
      LIMIT $${paramCount + 1}
    `
    values.push(limit)

    const result = await db.query(query, values)
    return result.rows.map((row) => new Route(row))
  }

  // Get personalized routes based on user profile and history
  static async getPersonalizedRoutes(perfilId) {
    const query = `
      WITH perfil_salud AS (
        SELECT 
          p.id_perfil,
          p.nombres,
          p.ap_paterno,
          mc.peso,
          mc.altura,
          -- Calcular IMC usando las mediciones más recientes
          CASE 
            WHEN mc.peso IS NOT NULL AND mc.altura IS NOT NULL AND mc.altura > 0
            THEN mc.peso / POWER((mc.altura / 100.0), 2)
            ELSE NULL 
          END as imc,
          -- Determinar nivel de fitness basado en IMC
          CASE 
            WHEN mc.peso IS NULL OR mc.altura IS NULL THEN 'principiante'
            WHEN mc.peso / POWER((mc.altura / 100.0), 2) >= 30 THEN 'principiante'  -- Obesidad
            WHEN mc.peso / POWER((mc.altura / 100.0), 2) >= 25 THEN 'principiante'  -- Sobrepeso
            ELSE 'intermedio'
          END as nivel_fitness_recomendado,
          -- Calcular distancia máxima recomendada
          CASE 
            WHEN mc.peso IS NULL OR mc.altura IS NULL THEN 3
            WHEN mc.peso / POWER((mc.altura / 100.0), 2) >= 30 THEN 2  -- Obesidad: máximo 2km
            WHEN mc.peso / POWER((mc.altura / 100.0), 2) >= 25 THEN 4  -- Sobrepeso: máximo 4km
            ELSE 6
          END as distancia_maxima_recomendada
        FROM perfil_id p
        LEFT JOIN mediciones_corporales mc ON p.id_perfil = mc.perfil_id
        WHERE p.id_perfil = $1
          AND mc.fecha = (
            SELECT MAX(fecha) 
            FROM mediciones_corporales mc2 
            WHERE mc2.perfil_id = p.id_perfil
          )
      ),
      historial_actividades AS (
        SELECT 
          ar.perfil_id,
          r.tipo_actividad,
          AVG(r.distancia_km) as distancia_promedio,
          COUNT(*) as cantidad_actividades,
          AVG(CASE WHEN ar.duracion_real_minutos IS NOT NULL THEN ar.duracion_real_minutos::numeric / r.duracion_minutos ELSE 1 END) as ratio_rendimiento
        FROM actividades_rutas ar
        JOIN rutas_ejercicio r ON ar.id_ruta = r.id_ruta
        WHERE ar.perfil_id = $1 
          AND ar.estado = 'completada' 
          AND ar.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY ar.perfil_id, r.tipo_actividad
      )
      SELECT DISTINCT r.*, 
             COALESCE(AVG(rr.calificacion), 0) as calificacion_promedio_calculada,
             COUNT(rr.id_resena) as cantidad_resenas,
             ps.imc,
             ps.nivel_fitness_recomendado,
             ps.distancia_maxima_recomendada,
             -- Puntuación de compatibilidad basada en salud
             CASE 
               WHEN r.dificultad = 'facil' AND ps.nivel_fitness_recomendado = 'principiante' THEN 5
               WHEN r.dificultad = 'medio' AND ps.nivel_fitness_recomendado = 'intermedio' THEN 5
               WHEN r.dificultad = 'dificil' AND ps.nivel_fitness_recomendado = 'avanzado' THEN 5
               WHEN r.dificultad = 'facil' AND ps.nivel_fitness_recomendado IN ('intermedio', 'avanzado') THEN 3
               WHEN r.dificultad = 'medio' AND ps.nivel_fitness_recomendado = 'principiante' THEN 1
               WHEN r.dificultad = 'dificil' AND ps.nivel_fitness_recomendado IN ('principiante', 'intermedio') THEN 0
               ELSE 2
             END as puntuacion_compatibilidad_salud,
             -- Puntuación por distancia apropiada
             CASE 
               WHEN r.distancia_km <= ps.distancia_maxima_recomendada * 0.5 THEN 3
               WHEN r.distancia_km <= ps.distancia_maxima_recomendada THEN 5
               WHEN r.distancia_km <= ps.distancia_maxima_recomendada * 1.2 THEN 2
               ELSE 0
             END as puntuacion_compatibilidad_distancia
      FROM rutas_ejercicio r
      CROSS JOIN perfil_salud ps
      LEFT JOIN historial_actividades ha ON r.tipo_actividad = ha.tipo_actividad
      LEFT JOIN resenas_rutas rr ON r.id_ruta = rr.id_ruta
      WHERE r.es_publica = true
        AND r.distancia_km <= ps.distancia_maxima_recomendada * 1.2
        -- Filtrar rutas muy difíciles para principiantes por salud
        AND NOT (r.dificultad = 'dificil' AND ps.nivel_fitness_recomendado = 'principiante')
        -- Priorizar actividades de bajo impacto para personas con sobrepeso/obesidad
        AND CASE 
          WHEN ps.imc >= 25 THEN r.tipo_actividad IN ('caminar', 'ciclismo')
          ELSE true
        END
      GROUP BY r.id_ruta, ps.imc, ps.nivel_fitness_recomendado, ps.distancia_maxima_recomendada
      ORDER BY 
        (puntuacion_compatibilidad_salud + puntuacion_compatibilidad_distancia) DESC,
        calificacion_promedio_calculada DESC, 
        r.created_at DESC
      LIMIT 15
    `

    const result = await db.query(query, [perfilId])
    return result.rows.map((row) => new Route(row))
  }

  // Generate health-based recommendations
  static async generateHealthBasedRecommendations(perfilId) {
    const query = `
      INSERT INTO recomendaciones_rutas (perfil_id, id_ruta, puntuacion_recomendacion, razon_recomendacion, basado_en_imc)
      SELECT 
        $1 as perfil_id,
        r.id_ruta,
        calcular_recomendacion_salud($1, r.id_ruta) as puntuacion_recomendacion,
        CASE 
          WHEN calcular_recomendacion_salud($1, r.id_ruta) >= 80 THEN 'Excelente opción para tu estado de salud actual'
          WHEN calcular_recomendacion_salud($1, r.id_ruta) >= 60 THEN 'Buena opción, considera tu ritmo personal'
          WHEN calcular_recomendacion_salud($1, r.id_ruta) >= 40 THEN 'Opción moderada, evalúa tu condición física'
          ELSE 'Considera rutas más suaves para comenzar'
        END as razon_recomendacion,
        true as basado_en_imc
      FROM rutas_ejercicio r
      WHERE r.es_publica = true
        AND calcular_recomendacion_salud($1, r.id_ruta) > 30
      ON CONFLICT (perfil_id, id_ruta) 
      DO UPDATE SET 
        puntuacion_recomendacion = EXCLUDED.puntuacion_recomendacion,
        razon_recomendacion = EXCLUDED.razon_recomendacion,
        fecha_recomendacion = NOW(),
        es_activa = true
      RETURNING *
    `

    const result = await db.query(query, [perfilId])
    return result.rows
  }

  // Search routes by criteria
  static async search(criteria) {
    const {
      tipo_actividad,
      dificultad,
      distancia_min,
      distancia_max,
      ubicacion,
      tags,
      limit = 20,
      offset = 0,
    } = criteria

    let query = `
      SELECT r.*, 
             COALESCE(AVG(rr.calificacion), 0) as calificacion_promedio_calculada,
             COUNT(rr.id_resena) as cantidad_resenas
      FROM rutas_ejercicio r
      LEFT JOIN resenas_rutas rr ON r.id_ruta = rr.id_ruta
      WHERE r.es_publica = true
    `

    const values = []
    let paramCount = 0

    if (tipo_actividad) {
      paramCount++
      query += ` AND r.tipo_actividad = $${paramCount}`
      values.push(tipo_actividad)
    }

    if (dificultad) {
      paramCount++
      query += ` AND r.dificultad = $${paramCount}`
      values.push(dificultad)
    }

    if (distancia_min) {
      paramCount++
      query += ` AND r.distancia_km >= $${paramCount}`
      values.push(distancia_min)
    }

    if (distancia_max) {
      paramCount++
      query += ` AND r.distancia_km <= $${paramCount}`
      values.push(distancia_max)
    }

    if (ubicacion) {
      paramCount++
      query += ` AND r.ubicacion ILIKE $${paramCount}`
      values.push(`%${ubicacion}%`)
    }

    if (tags && tags.length > 0) {
      paramCount++
      query += ` AND r.tags::jsonb ?| $${paramCount}`
      values.push(tags)
    }

    query += `
      GROUP BY r.id_ruta
      ORDER BY calificacion_promedio_calculada DESC, r.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `
    values.push(limit, offset)

    const result = await db.query(query, values)
    return result.rows.map((row) => new Route(row))
  }

  // Update route
  async update(updateData) {
    const fields = []
    const values = []
    let paramCount = 0

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && key !== "id_ruta") {
        paramCount++
        fields.push(`${key} = $${paramCount}`)
        if (key === "coordenadas" || key === "tags") {
          values.push(JSON.stringify(updateData[key]))
        } else {
          values.push(updateData[key])
        }
      }
    })

    if (fields.length === 0) {
      return this
    }

    paramCount++
    values.push(this.id_ruta)

    const query = `
      UPDATE rutas_ejercicio 
      SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id_ruta = $${paramCount}
      RETURNING *
    `

    const result = await db.query(query, values)
    return new Route(result.rows[0])
  }

  // Delete route
  async delete() {
    const query = "DELETE FROM rutas_ejercicio WHERE id_ruta = $1"
    await db.query(query, [this.id_ruta])
    return true
  }
}

module.exports = Route
