import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = request.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user }
    } = await userClient.auth.getUser();

    if (!user) {
      return json({ error: "Nao autenticado." }, 401);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("staff_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      return json({ error: "Somente administradores podem gerenciar equipe." }, 403);
    }

    const payload = await request.json();
    const action = payload.action;
    const staff = payload.staff ?? {};

    if (!staff.id && !staff.password && action === "upsert") {
      return json({ error: "Senha inicial obrigatoria para novo usuario." }, 400);
    }

    if (action === "toggle-active") {
      const { data: updated, error } = await adminClient
        .from("staff_profiles")
        .update({ is_active: Boolean(staff.isActive) })
        .eq("id", staff.id)
        .select("*")
        .single();

      if (error) {
        return json({ error: error.message }, 400);
      }

      return json({ staff: updated });
    }

    if (action === "reset-password") {
      if (!staff.id || !staff.password) {
        return json({ error: "Usuario e nova senha sao obrigatorios." }, 400);
      }

      const { error } = await adminClient.auth.admin.updateUserById(staff.id, {
        password: staff.password
      });

      if (error) {
        return json({ error: error.message }, 400);
      }

      const { data: updated, error: fetchError } = await adminClient
        .from("staff_profiles")
        .select("*")
        .eq("id", staff.id)
        .single();

      if (fetchError) {
        return json({ error: fetchError.message }, 400);
      }

      return json({ staff: updated });
    }

    if (action !== "upsert") {
      return json({ error: "Acao invalida." }, 400);
    }

    let authUserId = staff.id;

    if (staff.id) {
      const updatePayload: Record<string, unknown> = {
        email: staff.email,
        user_metadata: {
          full_name: staff.fullName
        }
      };

      if (staff.password) {
        updatePayload.password = staff.password;
      }

      const { error } = await adminClient.auth.admin.updateUserById(staff.id, updatePayload);
      if (error) {
        return json({ error: error.message }, 400);
      }
    } else {
      const { data, error } = await adminClient.auth.admin.createUser({
        email: staff.email,
        password: staff.password,
        email_confirm: true,
        user_metadata: {
          full_name: staff.fullName
        }
      });

      if (error || !data.user) {
        return json({ error: error?.message ?? "Falha ao criar usuario." }, 400);
      }

      authUserId = data.user.id;
    }

    const { data: savedStaff, error: saveError } = await adminClient
      .from("staff_profiles")
      .upsert(
        {
          id: authUserId,
          email: staff.email,
          full_name: staff.fullName,
          role: staff.role,
          barber_id: staff.role === "barber" ? staff.barberId : null,
          is_active: Boolean(staff.isActive ?? true)
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();

    if (saveError) {
      return json({ error: saveError.message }, 400);
    }

    return json({ staff: savedStaff });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
