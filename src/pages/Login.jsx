import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    setLoading(false);
    setMsg(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <div className="mx-auto max-w-md">

      <h1 className="text-2xl font-semibold text-zinc-900">Login</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Passwordless sign-in via email magic link.
      </p>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <form onSubmit={sendMagicLink} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Email</span>
            <input
              type="email"
              required
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>

          {msg && (
            <div className="rounded-xl border bg-zinc-50 p-3 text-sm text-zinc-700">
              {msg}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
