import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

export default function Catalog() {
  const [tests, setTests] = useState([]);

  // abilities
  const [abilities, setAbilities] = useState([]); // full vocab for filter
  const [abilityMap, setAbilityMap] = useState(new Map()); // id -> {label, slug}
  const [testAbilities, setTestAbilities] = useState(new Map()); // test_id -> [ability_id]

  // platforms
  const [platforms, setPlatforms] = useState([]); // full vocab for filter
  const [platformMap, setPlatformMap] = useState(new Map()); // id -> {label, slug}
  const [testPlatforms, setTestPlatforms] = useState(new Map()); // test_id -> [platform_id]

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [abilityFilter, setAbilityFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  const [ageMinFilter, setAgeMinFilter] = useState("");
  const [ageMaxFilter, setAgeMaxFilter] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      // 1) Load vocabularies (for filter dropdowns)
      const [abilRes, platRes] = await Promise.all([
        supabase.from("abilities").select("id,label,slug").order("label", { ascending: true }),
        supabase.from("platforms").select("id,label,slug").order("label", { ascending: true }),
      ]);

      if (abilRes.error) {
        setErr(abilRes.error.message);
        setLoading(false);
        return;
      }
      if (platRes.error) {
        setErr(platRes.error.message);
        setLoading(false);
        return;
      }

      setAbilities(abilRes.data ?? []);
      setPlatforms(platRes.data ?? []);

      const am = new Map();
      for (const a of abilRes.data ?? []) am.set(a.id, { label: a.label, slug: a.slug });
      setAbilityMap(am);

      const pm = new Map();
      for (const p of platRes.data ?? []) pm.set(p.id, { label: p.label, slug: p.slug });
      setPlatformMap(pm);

      // 2) Load tests (+ contributor profile)
      // Requires FK / relationship so "profiles:profiles(...)" works.
      const testsRes = await supabase
        .from("tests")
        .select(
          "id,name,authors,year,age_min,age_max,source_url,access_notes,owner_id,profiles:profiles(user_id,display_name,orcid,contact_via_orcid,contact_via_email,contact_email)"
        )
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
        setTestAbilities(new Map());
        setTestPlatforms(new Map());
        setLoading(false);
        return;
      }

      const testIds = rows.map((t) => t.id);

      // 3) Load join tables for abilities + platforms
      const [joinARes, joinPRes] = await Promise.all([
        supabase.from("test_abilities").select("test_id,ability_id").in("test_id", testIds),
        supabase.from("test_platforms").select("test_id,platform_id").in("test_id", testIds),
      ]);

      if (joinARes.error) {
        setErr(joinARes.error.message);
        setLoading(false);
        return;
      }
      if (joinPRes.error) {
        setErr(joinPRes.error.message);
        setLoading(false);
        return;
      }

      const ta = new Map();
      for (const j of joinARes.data ?? []) {
        if (!ta.has(j.test_id)) ta.set(j.test_id, []);
        ta.get(j.test_id).push(j.ability_id);
      }
      setTestAbilities(ta);

      const tp = new Map();
      for (const j of joinPRes.data ?? []) {
        if (!tp.has(j.test_id)) tp.set(j.test_id, []);
        tp.get(j.test_id).push(j.platform_id);
      }
      setTestPlatforms(tp);

      setLoading(false);
    })();
  }, []);

function overlapsAgeRange(testAgeMin, testAgeMax, filterMin, filterMax) {
  const toNumOr = (v, fallback) => {
    if (v == null || v === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const tMin = toNumOr(testAgeMin, 0);
  const tMax = toNumOr(testAgeMax, Infinity);

  // check filterMin only if provided
  if (filterMin != null) {
    const fMin = Number(filterMin);
    if (!Number.isFinite(fMin)) return false;
    if (fMin < tMin || fMin > tMax) return false;
  }

  // check filterMax only if provided
  if (filterMax != null) {
    const fMax = Number(filterMax);
    if (!Number.isFinite(fMax)) return false;
    if (fMax < tMin || fMax > tMax) return false;
  }

  return true;
}


  function labelsForTestAbilities(testId) {
    const ids = testAbilities.get(testId) ?? [];
    return ids.map((aid) => abilityMap.get(aid)?.label).filter(Boolean);
  }

  function labelsForTestPlatforms(testId) {
    const ids = testPlatforms.get(testId) ?? [];
    return ids.map((pid) => platformMap.get(pid)?.label).filter(Boolean);
  }

  const filtered = useMemo(() => {
    const fMin = ageMinFilter === "" ? null : Number(ageMinFilter);
    const fMax = ageMaxFilter === "" ? null : Number(ageMaxFilter);

    const filterMin = fMin != null && fMax != null && fMin > fMax ? fMax : fMin;
    const filterMax = fMin != null && fMax != null && fMin > fMax ? fMin : fMax;

    const qLower = q.trim().toLowerCase();

    return tests.filter((t) => {
      const matchesQ =
        !qLower ||
        t.name?.toLowerCase().includes(qLower) ||
        (t.authors ?? "").toLowerCase().includes(qLower);

      const aIds = testAbilities.get(t.id) ?? [];
      const matchesAbility = !abilityFilter || aIds.includes(abilityFilter);

      const pIds = testPlatforms.get(t.id) ?? [];
      const matchesPlatform = !platformFilter || pIds.includes(platformFilter);

      const matchesAge = overlapsAgeRange(t.age_min, t.age_max, filterMin, filterMax);

      return matchesQ && matchesAbility && matchesPlatform && matchesAge;
    });
  }, [tests, q, abilityFilter, platformFilter, ageMinFilter, ageMaxFilter, testAbilities, testPlatforms]);

  function clearFilters() {
    setQ("");
    setAbilityFilter("");
    setPlatformFilter("");
    setAgeMinFilter("");
    setAgeMaxFilter("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Spatial Tests Catalog</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Search by name/author, ability, platform, and age range.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:items-end">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Search</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="Search by test name or author…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Ability</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={abilityFilter}
              onChange={(e) => setAbilityFilter(e.target.value)}
            >
              <option value="">All abilities</option>
              {abilities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Platform</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="">All platforms</option>
              {platforms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Age min</label>
            <input
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="e.g., 6"
              value={ageMinFilter}
              onChange={(e) => setAgeMinFilter(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-zinc-700">Age max</label>
            <input
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="e.g., 12"
              value={ageMaxFilter}
              onChange={(e) => setAgeMaxFilter(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Clear filters
            </button>
          </div>

          <div className="md:col-span-6 mt-2 text-xs text-zinc-500">
            Showing <span className="font-medium text-zinc-900">{filtered.length}</span> result(s)
            {ageMinFilter || ageMaxFilter ? (
              <span> • tests with unknown age bounds are hidden while filtering by age.</span>
            ) : null}
          </div>
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
          const abilityLabels = labelsForTestAbilities(t.id);
          const platformLabels = labelsForTestPlatforms(t.id);

          const p = t.profiles;

          // ORCID should show up anyways (if present)
          const orcid = p?.orcid ? String(p.orcid).trim() : "";
          const orcidUrl = orcid ? `https://orcid.org/${orcid}` : null;

          // email only if opted-in + provided
          const showEmail = !!p?.contact_via_email && !!p?.contact_email;
          const email = showEmail ? String(p.contact_email).trim() : "";

          const contributorName = p?.display_name?.trim()
            ? p.display_name.trim()
            : orcid
              ? `ORCID ${orcid}`
              : "Contributor";

          return (
            <div key={t.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link to={`/tests/${t.id}`} className="text-lg font-semibold text-zinc-900 hover:underline">
                     {t.name}
                  </Link>
                  <p className="mt-1 text-sm text-zinc-600">
                    {(t.authors ?? "—")}{t.year ? ` (${t.year})` : ""}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>Added by</span>

                    {orcidUrl ? (
                      <a
                        className="underline hover:no-underline"
                        href={orcidUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="Open ORCID profile"
                      >
                        {contributorName}
                      </a>
                    ) : (
                      <span>{contributorName}</span>
                    )}

                    {showEmail ? (
                      <>
                        <span className="text-zinc-300">•</span>
                        <a
                          className="underline hover:no-underline"
                          href={`mailto:${email}`}
                          title="Email contributor"
                        >
                          {email}
                        </a>
                      </>
                    ) : null}
                  </div>
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

              <div className="mt-4 space-y-3 text-sm">
                <div className="text-zinc-700">
                  <span className="font-medium">Ability:</span>{" "}
                  {abilityLabels.length ? (
                    <span className="inline-flex flex-wrap gap-2">
                      {abilityLabels.map((l) => (
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
                  <span className="font-medium">Platform:</span>{" "}
                  {platformLabels.length ? (
                    <span className="inline-flex flex-wrap gap-2">
                      {platformLabels.map((l) => (
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
