const { supabaseAdmin } = require("../../config/supabaseClient");

class RouteController {
  // Crear ruta (solo admin)
  static async createRoute(req, res) {
    try {
      const { nombre, descripcion, distancia_km, duracion_minutos, dificultad, tipo_actividad, ubicacion } = req.body;

      const { data, error } = await supabaseAdmin
        .from("rutas_ejercicio")
        .insert([{ nombre, descripcion, distancia_km, duracion_minutos, dificultad, tipo_actividad, ubicacion }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, message: "Ruta creada exitosamente", data });
    } catch (error) {
      console.error("Error creando ruta:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Obtener todas las rutas públicas
  static async getAllRoutes(req, res) {
    try {
      const { data, error } = await supabaseAdmin
        .from("rutas_ejercicio")
        .select("*")
        .eq("es_publica", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Error obteniendo rutas:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Obtener una ruta específica
  static async getRouteById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabaseAdmin
        .from("rutas_ejercicio")
        .select("*")
        .eq("id_ruta", id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ success: false, message: "Ruta no encontrada" });

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Error obteniendo ruta:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Registrar inicio de actividad (usuario logueado)
  static async startRouteActivity(req, res) {
    try {
      const userId = req.user.id;
      const { id_ruta } = req.body;

      // Buscar perfil vinculado al usuario autenticado
      const { data: perfil, error: perfilError } = await supabaseAdmin
        .from("perfiles")
        .select("id_perfil")
        .eq("user_id", userId)
        .single();

      if (perfilError || !perfil)
        return res.status(404).json({ success: false, message: "Perfil no encontrado" });

      const { data, error } = await supabaseAdmin
        .from("actividades_rutas")
        .insert([{ perfil_id: perfil.id_perfil, id_ruta, estado: "iniciada" }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({ success: true, message: "Actividad iniciada", data });
    } catch (error) {
      console.error("Error iniciando actividad:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Completar actividad (finalizar ruta)
  static async completeRouteActivity(req, res) {
    try {
      const { id_actividad, duracion_real_min, distancia_real_km, calorias_quemadas } = req.body;

      const { data, error } = await supabaseAdmin
        .from("actividades_rutas")
        .update({
          estado: "completada",
          duracion_real_min,
          distancia_real_km,
          calorias_quemadas,
          fecha_fin: new Date().toISOString(),
        })
        .eq("id_actividad", id_actividad)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({ success: true, message: "Ruta completada exitosamente", data });
    } catch (error) {
      console.error("Error completando ruta:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }

  // Historial de rutas del usuario
  static async getUserRouteHistory(req, res) {
    try {
      const userId = req.user.id;
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("id_perfil")
        .eq("user_id", userId)
        .single();

      const { data, error } = await supabaseAdmin
        .from("actividades_rutas")
        .select("*, rutas_ejercicio(nombre, tipo_actividad, distancia_km, dificultad)")
        .eq("perfil_id", perfil.id_perfil)
        .order("fecha_inicio", { ascending: false });

      if (error) throw error;

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Error obteniendo historial:", error);
      res.status(500).json({ success: false, message: "Error interno del servidor" });
    }
  }
}

module.exports = RouteController;
