require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Validar variables de entorno
if (!process.env.SUPABASE_URL) {
  throw new Error("Falta la variable de entorno SUPABASE_URL");
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("Falta la variable de entorno SUPABASE_ANON_KEY");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("⚠️ No se encontró SUPABASE_SERVICE_ROLE_KEY — se usará la anon key como admin fallback");
}

// Cliente normal (para operaciones seguras, con anon key)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
  },
});

// Cliente admin (para crear/borrar usuarios de auth)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

module.exports = { supabase, supabaseAdmin };
