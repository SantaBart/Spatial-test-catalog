import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Catalog() {
  const [tests, setTests] = useState([]);
  const [abilityMap, setAbilityMap] = useState(new Map()); // ability_id -> {label, slug}
  const [testAbilities, setTestAbilities] = useState(new Map()); // test_id -> [ability_id]
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [abilityFilter, setAbilityFilter] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");

      // 1) Load published tests
      const testsRes = await supabase
        .from("tests")
        .select("id,name,authors,year,age_min,age_max,source_url,access_notes")
        .eq("status", "published")
        .order("name", { ascending: true });

      if (testsRes.error) {
        setErr(testsRes.error.message);
        return;
      }

      const rows = testsRes.data ?? [];
      setTests(rows);

      if (rows.length === 0) {
        setAbilityMap(new Map());
        setTestAbilities(new Map());
        return;
      }

      const testIds = rows.map((t) => t.id);

      // 2) Load join rows for these tests
      const joinRes = await supabase
        .from("test_abilities")
        .select("test_id,ability_id")
        .in("test_id", testIds);

      if (joinRes.error) {
        setErr(joinRes.error.message);
        return;
      }

      const joins = joinRes.data ?? [];
      const abilityIds = Array.from(new Set(joins.map((j) => j.ability_id)));

      // Build test -> abilities map
      const ta = new Map();
      for (const j of joins) {
        if (!ta.has(j.test_id)) ta.set(j.test_id, []);
        ta.get(j.test_id).push(j.ability_id);
      }
      setTestAbilities(ta);

      if (abilityIds.length === 0) {
        setAbilityMap(new Map());
        return;
      }

      // 3) Load ability labels
      const abilRes = await supabase
        .from("abilities")
        .select("id,label,slug")
        .in("id", abilityIds);

      if (abilRes.error) {
        setErr(abilRes.error.message);
        return;
      }

      const am = new Map();
      for (const a of abilRes.data ?? []) am.set(a.id, { label: a.label, slug: a.slug });
      setAbilityMap(am);
    })();
  }, []);

  const allAbilityOptions = useMemo(() => {
    // from abilityMap (only abilities currently used by published tests)
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
    return ids
      .map((aid) => abilityMap.get(aid)?.label)
      .filter(Boolean);
  }

  return (
    <div>
      <h2>Spatial Tests Catalog</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input
          placeholder="Search by name or author…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 8, minWidth: 280 }}
        />
        <select value={abilityFilter} onChange={(e) => setAbilityFilter(e.target.value)} style={{ padding: 8 }}>
          <option value="">All abilities</option>
          {allAbilityOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}
      {!err && filtered.length === 0 && <p>No results.</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((t) => {
          const labels = labelsForTest(t.id);
          return (
            <div key={t.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ opacity: 0.8 }}>
                    {t.authors ? t.authors : "—"}{t.year ? ` (${t.year})` : ""}
                  </div>

                  <div style={{ marginTop: 6, fontSize: 14 }}>
                    <b>Ability:</b> {labels.length ? labels.join(", ") : "—"}
                  </div>

                  <div style={{ fontSize: 14 }}>
                    <b>Age:</b> {t.age_min ?? "?"}–{t.age_max ?? "?"}
                  </div>

                  {t.access_notes && (
                    <div style={{ marginTop: 6, fontSize: 14 }}>
                      <b>Access:</b> {t.access_notes}
                    </div>
                  )}
                </div>

                {t.source_url && (
                  <div>
                    <a href={t.source_url} target="_blank" rel="noreferrer">
                      Source link
                    </a>
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
