import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

export default function MyEntries() {
  const [tests, setTests] = useState([]);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/login");
        return;
      }

      const { data: rows, error } = await supabase
        .from("tests")
        .select("id,name,status,updated_at")
        .eq("owner_id", data.user.id)
        .order("updated_at", { ascending: false });

      if (error) setErr(error.message);
      else setTests(rows ?? []);
    })();
  }, [navigate]);

  return (
    <div>
      <h2>My entries</h2>
      <p><Link to="/edit">+ Add new test</Link></p>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {tests.map(t => (
          <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{t.name}</div>
              <div style={{ opacity: 0.8, fontSize: 14 }}>
                Status: {t.status} • Updated: {new Date(t.updated_at).toLocaleString()}
              </div>
            </div>
            <div>
              <Link to={`/edit/${t.id}`}>Edit</Link>
            </div>
          </div>
        ))}
      </div>

      {tests.length === 0 && !err && <p>You don’t have any entries yet.</p>}
    </div>
  );
}
