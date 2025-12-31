import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

import Layout from "./components/Layout.jsx";
import Catalog from "./pages/Catalog";
import Login from "./pages/Login";
import MyEntries from "./pages/MyEntries";
import EditTest from "./pages/EditTest";

export default function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <Layout user={user} onSignOut={signOut}>
      <Routes>
        <Route path="/" element={<Catalog />} />
        <Route path="/login" element={<Login />} />
        <Route path="/my" element={<MyEntries />} />
        <Route path="/edit" element={<EditTest mode="new" />} />
        <Route path="/edit/:id" element={<EditTest mode="edit" />} />
      </Routes>
    </Layout>
  );
}
