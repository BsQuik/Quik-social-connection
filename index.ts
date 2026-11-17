import { createClient } from "jsr:@supabase/supabase-js@2";

const LINKS = new Set([
  "youtube", "twitch", "tiktok", "discord", "whatsapp", "reddit", "instagram",
  "website", "subscribe", "share", "classic", "newsite",
]);
const PAGES = new Set(["nuovo", "classico"]);
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function detectCountry(req: Request): Promise<string> {
  // 1. Prova prima gli header standard (Cloudflare / proxy)
  const headerCountry = (
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    ""
  ).trim().toUpperCase();

  if (/^[A-Z]{2}$/.test(headerCountry) && headerCountry !== "XX" && headerCountry !== "T1") {
    return headerCountry;
  }

  // 2. Fallback: estrae l'IP al volo (senza salvarlo) e chiede solo il codice paese
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim();
  if (!ip) return "ZZ";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://api.country.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const code = String(data?.country ?? "").trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(code)) return code;
    }
  } catch {
    // Se il servizio esterno è lento o non risponde, non blocca il salvataggio
  }

  return "ZZ";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const originOk = ALLOWED.length === 0 || ALLOWED.includes(origin);
  const cors = {
    "Access-Control-Allow-Origin": originOk && origin ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Vary": "Origin",
  };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST" || !originOk) return new Response(null, { status: 403, headers: cors });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400, headers: cors });
  }

  const kind = body.kind === "view" ? "view" : "click";
  const link = kind === "click" ? String(body.link ?? "") : null;
  if (kind === "click" && !LINKS.has(link!)) return new Response(null, { status: 400, headers: cors });

  const page = PAGES.has(String(body.page)) ? String(body.page) : "nuovo";
  const visitor = /^[0-9a-f-]{36}$/i.test(String(body.visitor ?? "")) ? String(body.visitor) : null;
  const lang = typeof body.lang === "string" ? body.lang.slice(0, 10) : null;
  const country = await detectCountry(req);

  const { error } = await admin.from("events").insert({ kind, link, page, country, visitor, lang });
  if (error) {
    console.error("insert fallito:", error.message);
    return new Response("Error", { status: 500, headers: cors });
  }

  return new Response(null, { status: 204, headers: cors });
});
