require("dotenv").config()
const { createClient } = require("@supabase/supabase-js")

// Validate environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error("Falta la variable de entorno SUPABASE_URL")
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("Falta la variable de entorno SUPABASE_ANON_KEY")
}

// Create Supabase client
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
})

module.exports = { supabaseAdmin }
