import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ORCID_BASE = "https://orcid.org"; // if your client is sandbox -> https://sandbox.orcid.org

serve(async (req) => {
  const url = new URL(req.url);

  const marker = "/realms/orcid/protocol/openid-connect";
  const idx = url.pathname.indexOf(marker);
  if (idx === -1) return new Response("Not found", { status: 404 });

  const endpoint = url.pathname.slice(idx + marker.length); // "/auth" | "/token" | "/userinfo"

  // ✅ AUTH: redirect to ORCID with only valid ORCID params
  if (endpoint === "/auth") {
    const qp = url.searchParams;

    // Keep only what ORCID actually supports
    const client_id = qp.get("client_id") ?? "";
    const redirect_uri = qp.get("redirect_uri") ?? "";
    const response_type = qp.get("response_type") ?? "code";
    const scope = qp.get("scope") ?? "openid";
    const state = qp.get("state") ?? "";

    // ORCID is picky: scope must be space-separated, not plus-separated
    // (URLSearchParams usually handles this, but we normalize anyway)
    const normalizedScope = scope.replace(/\+/g, " ");

    const authorize = new URL(ORCID_BASE + "/oauth/authorize");
    authorize.searchParams.set("client_id", client_id);
    authorize.searchParams.set("redirect_uri", redirect_uri);
    authorize.searchParams.set("response_type", response_type);
    authorize.searchParams.set("scope", "openid");
    if (state) authorize.searchParams.set("state", state);

    // ORCID sometimes wants prompt=login to avoid stuck sessions (optional)
    // authorize.searchParams.set("prompt", "login");

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorize.toString(),
        "Cache-Control": "no-store",
      },
    });
  }

  // TOKEN + USERINFO: proxy to ORCID endpoints
  let targetPath = "";
  if (endpoint === "/token") targetPath = "/oauth/token";
  else if (endpoint === "/userinfo") targetPath = "/oauth/userinfo";
  else return new Response("Not found", { status: 404 });

  const target = new URL(ORCID_BASE + targetPath);
  target.search = url.search;

  const resp = await fetch(target.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
    redirect: "follow",
  });

  return new Response(resp.body, {
    status: resp.status,
    headers: resp.headers,
  });
});
