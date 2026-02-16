// supabase/functions/send-contact-email/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") || "santa.bartusevica@lu.lv";
const FROM_EMAIL = Deno.env.get("CONTACT_FROM_EMAIL") || "Spatial Test Catalog <no-reply@yourdomain>";

serve(async (req) => {
  // CORS
  const origin = req.headers.get("origin") || "*";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Require logged-in user JWT to reduce spam
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization header" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { subject, message, senderEmail } = await req.json().catch(() => ({}));

  if (!subject?.trim() || !message?.trim()) {
    return new Response(JSON.stringify({ error: "Missing subject/message" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const safeSubject = subject.trim().slice(0, 200);
  const safeMessage = message.trim().slice(0, 6000);

  // Build email body
  const text = [
    `New message from Spatial Test Catalog contact form`,
    ``,
    `Sender: ${senderEmail || "unknown"}`,
    `Subject: ${safeSubject}`,
    ``,
    safeMessage,
  ].join("\n");

  // Send via Resend
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: `[Catalog] ${safeSubject}`,
      text,
      reply_to: senderEmail || undefined,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    return new Response(JSON.stringify({ error: "Email provider error", details: errText }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
