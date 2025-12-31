import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  async function sendMagicLink(e) {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    setMsg(error ? error.message : "Check your email for the sign-in link.");
  }

  return (
    <div>
      <h2>Login (Magic Link)</h2>
      <form onSubmit={sendMagicLink} style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="email"
          required
          placeholder="you@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 8, minWidth: 280 }}
        />
        <button type="submit">Send link</button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
