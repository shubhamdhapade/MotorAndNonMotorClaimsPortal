import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEMO_USERS = [
  { email: "admin@motorclaims.com", password: "admin123", role: "SYSTEM_ADMIN" },
  { email: "fnol1@motorclaims.com", password: "admin123", role: "FNOL_ASSISTANT" },
  { email: "assessor1@motorclaims.com", password: "admin123", role: "ASSESSOR_ASSISTANT" },
  { email: "approver1@motorclaims.com", password: "admin123", role: "APPROVALS_ASSISTANT" },
  { email: "payments1@motorclaims.com", password: "admin123", role: "PAYMENTS_ASSISTANT" },
  { email: "closure1@motorclaims.com", password: "admin123", role: "CLOSURE_ASSISTANT" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results = [];

    for (const user of DEMO_USERS) {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const exists = existingUsers.users.some(u => u.email === user.email);

      if (exists) {
        results.push({ email: user.email, status: "already_exists" });
        continue;
      }

      // Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        results.push({ email: user.email, status: "error", error: authError.message });
        continue;
      }

      results.push({ email: user.email, status: "created", userId: authData.user.id });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
