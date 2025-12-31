import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

export default function Catalog() {
  const [tests, setTests] = useState([]);
  const [abilityMap, setAbilityMap] = useState(new Map());
  const [testAbilities, setTestAbilities] = useState(new Map());
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [abilityFilter, setAbilityFilter] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      const testsRes = await supabase
        .from("tests")
        .select("id,name,authors,year,age_min,age_max,source_url,access_notes")
        .eq("status", "published")
        .order("name", { ascending: true });

      if (testsRes.error) {
        setErr(testsRes.error.message);
        setLoading(false);
        return;
      }

      const rows = testsRes.data ?? [];
      setTests(rows);

      if (rows.length === 0) {
        setAbilityMap(new Map());
        setTestAbilities(new Map());
        setLoading(false);
        return;
      }

      const testIds = rows.map((t) => t.id);

      const joinRes = await supabase
        .from("test_abilities")
        .select("test_id,ability_id")
        .in("test_id", testIds);

      if (joinRes.error) {
        setErr(joinRes.error.message);
        setLoading(false);
        return;
      }

      const joins = joinRes.data ?? [];
      const abilityIds = Array.from(new Set(joins.map((j) => j.ability_id)));

      const ta = new Map();
      for (const j of joins) {
        if (!ta.has(j.test_id)) ta.set(j.test_id, []);
        ta.get(j.test_id).push(j.ability_id);
      }
      setTestAbilities(ta);

      if (abilityIds.length === 0) {
        setAbilityMap(new Map());
        setLoading(false);
        return;
      }

      const abilRes = await supabase
        .from("abilities")
        .select("id,label,slug")
        .in("id", abilityIds);

      if (abilRes.error) {
        setErr(abilRes.error.message);
        setLoading(false);
        return;
      }

      const am = new Map();
      for (const a of abilRes.data ?? []) am.set(a.id, { label: a.label, slug: a.slug });
      setAbilityMap(am);

      setLoading(false);
    })();
  }, []);

  const allAbilityOptions = useMemo(() => {
    const arr = Array.from(abilityMap.entries()).map(([id, v]) => ({ id, ...v }));
    arr.sort((a, b) => a.label.localeCompare(b.label));
    return arr;
  }, [abilityMap]);

  const filtered = useMemo(() => {
    return tests.filter((t) => {
      const matchesQ =
        !q ||
        t.name?.toLowerCase().includes(q.toLowerCase()) ||
        (t.authors ?? "").toLowerCase().includes(q.toLowerCase());

      const abilitiesForTest = testAbilities.get(t.id) ?? [];
      const matchesAbility = !abilityFilter || abilitiesForTest.includes(abilityFilter);

      return matchesQ && matchesAbility;
    });
  }, [tests, q, abilityFilter, testAbilities]);

  function labelsForTest(testId) {
    const ids = testAbilities.get(testId) ?? [];
    return ids.map((aid) => abilityMap.get(aid)?.label).filter(Boolean);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Spatial Tests Catalog</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Search spatial ability tests by name, author, and ability category. No materials are hosted.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Search</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Search by test name or author…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Ability category</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={abilityFilter}
              onChange={(e) => setAbilityFilter(e.target.value)}
            >
              <option value="">All abilities</option>
              {allAbilityOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Showing <span className="font-medium text-zinc-900">{filtered.length}</span> result(s)
        </div>
      </Card>

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

      {!loading && !err && filtered.length === 0 && (
        <Card>
          <p className="text-sm text-zinc-600">No results. Try clearing filters.</p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((t) => {
          const labels = labelsForTest(t.id);

          return (
            <div key={t.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-900 truncate">{t.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {(t.authors ?? "—")}{t.year ? ` (${t.year})` : ""}
                  </p>
                </div>

                {t.source_url && (
                  <a
                    href={t.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                  >
                    Source ↗
                  </a>
                )}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="text-zinc-700">
                  <span className="font-medium">Ability:</span>{" "}
                  {labels.length ? (
                    <span className="inline-flex flex-wrap gap-2">
                      {labels.map((l) => (
                        <span key={l} className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                          {l}
                        </span>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>

                <div className="text-zinc-700">
                  <span className="font-medium">Age:</span> {t.age_min ?? "?"}–{t.age_max ?? "?"}
                </div>

                {t.access_notes && (
                  <div className="text-zinc-700">
                    <span className="font-medium">Access:</span> {t.access_notes}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
