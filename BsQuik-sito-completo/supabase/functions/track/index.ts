// Edge Function "track": riceve un click o una visita e la salva in Supabase.
// - Il paese viene letto dall'header di Cloudflare (cf-ipcountry). L'indirizzo IP NON viene salvato.
// - Accetta solo link di una lista fissa e solo dai siti elencati in ALLOWED_ORIGINS.
// Deploy:  supabase functions deploy track --no-verify-jwt
// Segreto: supabase secrets set ALLOWED_ORIGINS=https://bsquik.github.io
import { createClient } from "jsr:@supabase/supabase-js@2";

const LINKS = new Set([
  "youtube", "twitch", "tiktok", "discord", "whatsapp", "reddit", "instagram",
  "website", "subscribe", "share", "classic", "newsite",
]);
const PAGES = new Set(["nuovo", "classico"]);
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",").map((s) => s.trim()).filter(Boolean);

// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono già presenti dentro le Edge Functions.
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

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

  const raw = (req.headers.get("cf-ipcountry") ?? "").toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1" ? raw : "ZZ"; // ZZ = sconosciuto

  const { error } = await admin.from("events").insert({ kind, link, page, country, visitor, lang });
  if (error) console.error("insert fallito:", error.message);
  return new Response(null, { status: error ? 500 : 204, headers: cors });
});
