import React, { useEffect, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { supabase } from "./supabaseClient";

import Catalog from "./pages/Catalog";
import Login from "./pages/Login";
import MyEntries from "./pages/MyEntries";
import EditTest from "./pages/EditTest";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link to="/" style={{ fontWeight: 700, textDecoration: "none" }}>Spatial Tests Catalog</Link>
          <Link to="/" style={{ textDecoration: "none" }}>Catalog</Link>
          {user && <Link to="/my" style={{ textDecoration: "none" }}>My entries</Link>}
          {user && <Link to="/edit" style={{ textDecoration: "none" }}>Add new</Link>}
        </div>

        <div>
          {!user ? (
            <Link to="/login">Login</Link>
          ) : (
            <button onClick={signOut}>Sign out</button>
          )}
        </div>
      </header>

      <hr style={{ margin: "16px 0" }} />

      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my" element={<MyEntries />} />
        <Route path="/edit" element={<EditTest mode="new" />} />
        <Route path="/edit/:id" element={<EditTest mode="edit" />} />
      </Routes>
    </div>
  );
}
