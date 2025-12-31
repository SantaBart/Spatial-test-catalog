import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm">{children}</div>;
}

export default function MyEntries() {
  const [tests, setTests] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      const u = data.user;

      if (!u) {
        navigate("/login");
        return;
      }

      const { data: rows, error } = await supabase
        .from("tests")
        .select("id,name,status,updated_at")
        .eq("owner_id", u.id)
        .order("updated_at", { ascending: false });

      setLoading(false);

      if (error) setErr(error.message);
      else setTests(rows ?? []);
    })();
  }, [navigate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">My entries</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Drafts are private. Published entries appear in the public catalog.
          </p>
        </div>

        <Link
          to="/edit"
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          + Add new test
        </Link>
      </div>

      {err && (
        <Card>
          <p className="text-sm text-red-600">{err}</p>
        </Card>
      )}

      {loading && (
        <Card>
          <p className="text-sm text-zinc-600">Loading…</p>
        </Card>
      )}

      {!loading && !err && tests.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-600">You don’t have any entries yet.</p>
        </Card>
      )}

      <div className="grid gap-3">
        {tests.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border bg-white p-4 shadow-sm flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 truncate">{t.name}</div>
              <div className="mt-1 text-sm text-zinc-600">
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                  {t.status}
                </span>
                <span className="ml-2">
                  Updated {new Date(t.updated_at).toLocaleString()}
                </span>
              </div>
            </div>

            <Link
              to={`/edit/${t.id}`}
              className="shrink-0 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
