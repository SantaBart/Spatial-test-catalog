import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

function StatusBadge({ status }) {
  const label =
    status === "draft" ? "Draft" : status === "wip" ? "Work in progress" : status === "published" ? "Published" : status;

  return (
    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
      {label}
    </span>
  );
}

function overlapsAgeRange(testAgeMin, testAgeMax, filterMin, filterMax) {
  // Hide unknown-age tests only when age filters are used
  if (filterMin != null) {
    if (testAgeMax == null) return false;
    if (Number(testAgeMax) < filterMin) return false;
  }
  if (filterMax != null) {
    if (testAgeMin == null) return false;
    if (Number(testAgeMin) > filterMax) return false;
  }
  return true;
}

export default function Catalog() {
  const [tests, setTests] = useState([]);

  // vocabularies
  const [abilityMap, setAbilityMap] = useState(new Map()); // id -> label
  const [platformMap, setPlatformMap] = useState(new Map());
  const [modalityMap, setModalityMap] = useState(new Map());
  const [populationMap, setPopulationMap] = useState(new Map());

  // joins: test_id -> [vocab_id]
  const [testAbilities, setTestAbilities] = useState(new Map());
  const [testPlatforms, setTestPlatforms] = useState(new Map());
  const [testModalities, setTestModalities] = useState(new Map());
  const [testPopulations, setTestPopulations] = useState(new Map());

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "", draft, wip, published
  const [abilityFilter, setAbilityFilter] = useState(""); // single-select
  const [platformFilter, setPlatformFilter] = useState(""); // single-select
  const [modalityFilter, setModalityFilter] = useState(""); // single-select
  const [populationFilter, setPopulationFilter] = useState(""); // single-select
  const [adaptedOnly, setAdaptedOnly] = useState(false);

  const [ageMinFilter, setAgeMinFilter] = useState("");
  const [ageMaxFilter, setAgeMaxFilter] = useState("");

  useEffect(() => {
    (async () => {
      setErr("");
      setLoading(true);

      // Load tests (RLS decides what the current viewer can see)
      const testsRes = await supabase
        .from("tests")
        .select(
          "id,name,authors,year,age_min,age_max,source_url,access_notes,status,owner_id,profiles:profiles(user_id,display_name,orcid,contact_via_email,contact_email)"
        )
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
        setPlatformMap(new Map());
        setModalityMap(new Map());
        setPopulationMap(new Map());
        setTestAbilities(new Map());
        setTestPlatforms(new Map());
        setTestModalities(new Map());
        setTestPopulations(new Map());
        setLoading(false);
        return;
      }

      const testIds = rows.map((t) => t.id);

      // Load all vocab tables + join tables in parallel
      const [
        abilRes,
        platRes,
        modRes,
        popRes,
        joinARes,
        joinPRes,
        joinMRes,
        joinPopRes,
      ] = await Promise.all([
        supabase.from("abilities").select("id,label").order("label", { ascending: true }),
        supabase.from("platforms").select("id,label").order("label", { ascending: true }),
        supabase.from("modalities").select("id,label").order("label", { ascending: true }),
        supabase.from("population_types").select("id,label").order("label", { ascending: true }),

        supabase.from("test_abilities").select("test_id,ability_id").in("test_id", testIds),
        supabase.from("test_platforms").select("test_id,platform_id").in("test_id", testIds),
        supabase.from("test_modalities").select("test_id,modality_id").in("test_id", testIds),
        supabase.from("test_population_types").select("test_id,population_type_id").in("test_id", testIds),
      ]);

      // vocab maps
      const am = new Map((abilRes.data ?? []).map((a) => [a.id, a.label]));
      const pm = new Map((platRes.data ?? []).map((p) => [p.id, p.label]));
      const mm = new Map((modRes.data ?? []).map((m) => [m.id, m.label]));
      const pom = new Map((popRes.data ?? []).map((p) => [p.id, p.label]));

      setAbilityMap(am);
      setPlatformMap(pm);
      setModalityMap(mm);
      setPopulationMap(pom);

      // joins -> per-test arrays
      function buildJoinMap(rows, testKey, vocabKey) {
        const map = new Map();
        for (const r of rows ?? []) {
          const tid = r[testKey];
          const vid = r[vocabKey];
          if (!map.has(tid)) map.set(tid, []);
          map.get(tid).push(vid);
        }
        return map;
      }

      setTestAbilities(buildJoinMap(joinARes.data, "test_id", "ability_id"));
      setTestPlatforms(buildJoinMap(joinPRes.data, "test_id", "platform_id"));
      setTestModalities(buildJoinMap(joinMRes.data, "test_id", "modality_id"));
      setTestPopulations(buildJoinMap(joinPopRes.data, "test_id", "population_type_id"));

      // Surface any join/vocab errors (non-fatal)
      const nonFatal = [abilRes, platRes, modRes, popRes, joinARes, joinPRes, joinMRes, joinPopRes]
        .map((r) => r.error?.message)
        .filter(Boolean);

      if (nonFatal.length) setErr(nonFatal.join(" | "));

      setLoading(false);
    })();
  }, []);

  const abilityOptions = useMemo(() => {
    return Array.from(abilityMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [abilityMap]);

  const platformOptions = useMemo(() => {
    return Array.from(platformMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [platformMap]);

  const modalityOptions = useMemo(() => {
    return Array.from(modalityMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [modalityMap]);

  const populationOptions = useMemo(() => {
    return Array.from(populationMap.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [populationMap]);

  function labelsFromJoin(testId, joinMap, vocabMap) {
    const ids = joinMap.get(testId) ?? [];
    return ids.map((vid) => vocabMap.get(vid)).filter(Boolean);
  }

  function isAdapted(testId) {
    const labels = labelsFromJoin(testId, testPopulations, populationMap);
    // Adapted if there is any population tag other than "General population"
    return labels.some((l) => String(l).toLowerCase() !== "general population");
  }

  const filtered = useMemo(() => {
    const fMin = ageMinFilter === "" ? null : Number(ageMinFilter);
    const fMax = ageMaxFilter === "" ? null : Number(ageMaxFilter);

    const filterMin = fMin != null && fMax != null && fMin > fMax ? fMax : fMin;
    const filterMax = fMin != null && fMax != null && fMin > fMax ? fMin : fMax;

    const qLower = q.trim().toLowerCase();

    return tests.filter((t) => {
      // search
      const matchesQ =
        !qLower ||
        (t.name ?? "").toLowerCase().includes(qLower) ||
        (t.authors ?? "").toLowerCase().includes(qLower);

      // status
      const matchesStatus = !statusFilter || t.status === statusFilter;

      // age overlap
      const matchesAge = overlapsAgeRange(t.age_min, t.age_max, filterMin, filterMax);

      // single-select filters
      const aIds = testAbilities.get(t.id) ?? [];
      const pIds = testPlatforms.get(t.id) ?? [];
      const mIds = testModalities.get(t.id) ?? [];
      const popIds = testPopulations.get(t.id) ?? [];

      const matchesAbility = !abilityFilter || aIds.includes(abilityFilter);
      const matchesPlatform = !platformFilter || pIds.includes(platformFilter);
      const matchesModality = !modalityFilter || mIds.includes(modalityFilter);
      const matchesPopulation = !populationFilter || popIds.includes(populationFilter);

      const matchesAdapted = !adaptedOnly || isAdapted(t.id);

      return (
        matchesQ &&
        matchesStatus &&
        matchesAge &&
        matchesAbility &&
        matchesPlatform &&
        matchesModality &&
        matchesPopulation &&
        matchesAdapted
      );
    });
  }, [
    tests,
    q,
    statusFilter,
    abilityFilter,
    platformFilter,
    modalityFilter,
    populationFilter,
    adaptedOnly,
    ageMinFilter,
    ageMaxFilter,
    testAbilities,
    testPlatforms,
    testModalities,
    testPopulations,
    populationMap,
  ]);

  function clearFilters() {
    setQ("");
    setStatusFilter("");
    setAbilityFilter("");
    setPlatformFilter("");
    setModalityFilter("");
    setPopulationFilter("");
    setAdaptedOnly(false);
    setAgeMinFilter("");
    setAgeMaxFilter("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Spatial Tests Catalog</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Search spatial ability tests by name/author and filter by tags, age range, and status.
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

          <div>
            <label className="text-sm font-medium text-zinc-700">Status</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="draft">Draft</option>
              <option value="wip">Work in progress</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Ability</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={abilityFilter}
              onChange={(e) => setAbilityFilter(e.target.value)}
            >
              <option value="">All abilities</option>
              {abilityOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Platform</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="">All platforms</option>
              {platformOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Modality</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={modalityFilter}
              onChange={(e) => setModalityFilter(e.target.value)}
            >
              <option value="">All modalities</option>
              {modalityOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">Population</label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              value={populationFilter}
              onChange={(e) => setPopulationFilter(e.target.value)}
            >
              <option value="">All populations</option>
              {populationOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
              <div>
                <label className="text-sm font-medium text-zinc-700">Age min (filter)</label>
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="e.g., 6"
                  value={ageMinFilter}
                  onChange={(e) => setAgeMinFilter(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-700">Age max (filter)</label>
                <input
                  inputMode="numeric"
                  className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="e.g., 12"
                  value={ageMaxFilter}
                  onChange={(e) => setAgeMaxFilter(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>



              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 w-full rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              Showing <span className="font-medium text-zinc-900">{filtered.length}</span> result(s)
              {ageMinFilter || ageMaxFilter ? (
                <span> • Note: tests with unknown age bounds are hidden when you use age filters.</span>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {err ? (
        <Card>
          <p className="text-sm text-red-600">{err}</p>
        </Card>
      ) : null}

      {loading ? (
        <Card>
          <p className="text-sm text-zinc-600">Loading…</p>
        </Card>
      ) : null}

      {!loading && !err && filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-600">No results. Try clearing filters.</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((t) => {
          const abilityLabels = labelsFromJoin(t.id, testAbilities, abilityMap);
          const platformLabels = labelsFromJoin(t.id, testPlatforms, platformMap);
          const modalityLabels = labelsFromJoin(t.id, testModalities, modalityMap);
          const populationLabels = labelsFromJoin(t.id, testPopulations, populationMap);

          const adapted = populationLabels.some((l) => String(l).toLowerCase() !== "general population");

          return (
            <div key={t.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                     <Link to={`/tests/${t.id}`} className="text-lg font-semibold text-zinc-900 hover:underline">
                     {t.name}
                     </Link>
                    {t.status ? <StatusBadge status={t.status} /> : null}
                    {adapted ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                        Adapted
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-zinc-600">
                    {(t.authors ?? "—")}
                    {t.year ? ` (${t.year})` : ""}
                  </p>

                  <div className="mt-2 text-xs text-zinc-500">
                    <Link className="underline hover:no-underline" to={`/tests/${t.id}`}>
                      View details
                    </Link>
                  </div>
                </div>

                {t.source_url ? (
                  <a
                    href={t.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                  >
                    Source ↗
                  </a>
                ) : null}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="text-zinc-700">
                  <span className="font-medium">Ability:</span>{" "}
                  {abilityLabels.length ? abilityLabels.join(", ") : "—"}
                </div>

                <div className="text-zinc-700">
                  <span className="font-medium">Platform:</span>{" "}
                  {platformLabels.length ? platformLabels.join(", ") : "—"}
                </div>

                <div className="text-zinc-700">
                  <span className="font-medium">Modality:</span>{" "}
                  {modalityLabels.length ? modalityLabels.join(", ") : "—"}
                </div>

                <div className="text-zinc-700">
                  <span className="font-medium">Population:</span>{" "}
                  {populationLabels.length ? populationLabels.join(", ") : "—"}
                </div>

                <div className="text-zinc-700">
                  <span className="font-medium">Age:</span> {t.age_min ?? "?"}–{t.age_max ?? "?"}
                </div>

                {t.access_notes ? (
                  <div className="text-zinc-700">
                    <span className="font-medium">Access:</span> {t.access_notes}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
