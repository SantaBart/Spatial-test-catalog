import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithOrcid() {
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
    provider: "keycloak",
    options: {
    scopes: "openid",
    redirectTo: `${window.location.origin}/`,
  },
});


    // If this succeeds, browser will redirect away (to ORCID), so msg usually won't show.
    setLoading(false);
    if (error) setMsg(error.message);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in with your verified ORCID iD to contribute to the catalog.
      </p>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm space-y-4">
        <button
          type="button"
          onClick={signInWithOrcid}
          disabled={loading}
          className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Redirecting…" : "Sign in with ORCID"}
        </button>

        {msg ? (
          <div className="rounded-xl border bg-zinc-50 p-3 text-sm text-zinc-700">
            {msg}
          </div>
        ) : null}

        <div className="text-xs text-zinc-500">
          You don’t need an account to browse. ORCID sign-in is only required to add or edit entries.
        </div>
      </div>
    </div>
  );
}
