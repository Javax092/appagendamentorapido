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

async function sendWhatsappMessage({
  businessPhoneNumberId,
  token,
  recipient,
  message
}: {
  businessPhoneNumberId: string;
  token: string;
  recipient: string;
  message: string;
}) {
  const response = await fetch(`https://graph.facebook.com/v22.0/${businessPhoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: {
        preview_url: false,
        body: message
      }
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Falha ao enviar mensagem.");
  }

  return payload?.messages?.[0]?.id ?? "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const whatsappToken = Deno.env.get("WHATSAPP_TOKEN") ?? "";
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") ?? "";
    const limit = Math.max(1, Math.min(Number((await request.json().catch(() => ({}))).limit ?? 20), 50));

    if (!whatsappToken || !phoneNumberId) {
      return json({
        processed: 0,
        provider: "official_whatsapp_pending",
        error: "Defina WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID na funcao."
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: queuedItems, error } = await adminClient
      .from("appointment_notifications")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(limit);

    if (error) {
      return json({ error: error.message }, 400);
    }

    const results = [];

    for (const item of queuedItems ?? []) {
      try {
        await adminClient
          .from("appointment_notifications")
          .update({
            status: "processing",
            last_attempt_at: new Date().toISOString(),
            attempt_count: (item.attempt_count ?? 0) + 1,
            business_number: Deno.env.get("WHATSAPP_BUSINESS_NUMBER") ?? item.business_number ?? "5592986202729"
          })
          .eq("id", item.id);

        const providerMessageId = await sendWhatsappMessage({
          businessPhoneNumberId: phoneNumberId,
          token: whatsappToken,
          recipient: String(item.recipient).replace(/\D/g, ""),
          message: item.message_template
        });

        await adminClient
          .from("appointment_notifications")
          .update({
            status: "sent",
            provider: "meta_whatsapp_cloud_api",
            provider_message_id: providerMessageId,
            sent_at: new Date().toISOString(),
            last_error: ""
          })
          .eq("id", item.id);

        results.push({ id: item.id, status: "sent" });
      } catch (sendError) {
        await adminClient
          .from("appointment_notifications")
          .update({
            status: "failed",
            provider: "meta_whatsapp_cloud_api",
            last_error: sendError instanceof Error ? sendError.message : "Falha ao enviar"
          })
          .eq("id", item.id);

        results.push({
          id: item.id,
          status: "failed",
          error: sendError instanceof Error ? sendError.message : "Falha ao enviar"
        });
      }
    }

    return json({
      processed: results.length,
      provider: "meta_whatsapp_cloud_api",
      results
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});
