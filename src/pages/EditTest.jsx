import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-zinc-700">{label}</div>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
      </div>
      {right ? <div className="text-sm text-zinc-600">{right}</div> : null}
    </div>
  );
}

async function syncJoinTable({ table, testId, idCol, selectedIds }) {
  // Fetch existing
  const existingRes = await supabase.from(table).select(idCol).eq("test_id", testId);
  if (existingRes.error) throw existingRes.error;

  const existing = new Set((existingRes.data ?? []).map((r) => r[idCol]));

  const toInsert = [];
  for (const vid of selectedIds) if (!existing.has(vid)) toInsert.push({ test_id: testId, [idCol]: vid });

  const toDelete = [];
  for (const vid of existing) if (!selectedIds.has(vid)) toDelete.push(vid);

  if (toInsert.length > 0) {
    const ins = await supabase.from(table).insert(toInsert);
    if (ins.error) throw ins.error;
  }

  if (toDelete.length > 0) {
    const del = await supabase.from(table).delete().eq("test_id", testId).in(idCol, toDelete);
    if (del.error) throw del.error;
  }
}

export default function EditTest({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();

  // auth + profile
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ui state
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  // vocabularies
  const [abilities, setAbilities] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [populations, setPopulations] = useState([]);

  // selections
  const [selectedAbilityIds, setSelectedAbilityIds] = useState(new Set());
  const [selectedPlatformIds, setSelectedPlatformIds] = useState(new Set());
  const [selectedModalityIds, setSelectedModalityIds] = useState(new Set());
  const [selectedPopulationIds, setSelectedPopulationIds] = useState(new Set());

  const [form, setForm] = useState({
    name: "",
    age_min: "",
    age_max: "",
    authors: "",
    year: "",
    original_citation: "",
    doi: "",
    source_url: "",
    access_notes: "",
    use_cases: "",
    notes: "",
    status: "draft",
  });

  // auth + profile load
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUser(data.user);

      setProfileLoading(true);
      const { data: p, error } = await supabase
        .from("profiles")
        .select("user_id, orcid, display_name")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!error) setProfile(p ?? null);
      setProfileLoading(false);
    })();
  }, [navigate]);

  const hasOrcid = !!profile?.orcid;

  // vocab fetch
  useEffect(() => {
    (async () => {
      const [a, p, m, pop] = await Promise.all([
        supabase.from("abilities").select("id,slug,label,description").order("label", { ascending: true }),
        supabase.from("platforms").select("id,slug,label,description").order("label", { ascending: true }),
        supabase.from("modalities").select("id,label").order("label", { ascending: true }),
        supabase.from("population_types").select("id,label").order("label", { ascending: true }),
      ]);

      if (a.error) setErr(a.error.message);
      else setAbilities(a.data ?? []);

      if (p.error) setErr((prev) => prev || p.error.message);
      else setPlatforms(p.data ?? []);

      if (m.error) setErr((prev) => prev || m.error.message);
      else setModalities(m.data ?? []);

      if (pop.error) setErr((prev) => prev || pop.error.message);
      else setPopulations(pop.data ?? []);
    })();
  }, []);

  // load existing test (edit mode)
  useEffect(() => {
    if (mode !== "edit" || !id) return;

    (async () => {
      setErr("");
      setLoading(true);

      const { data: row, error: testErr } = await supabase.from("tests").select("*").eq("id", id).single();

      if (testErr) {
        setErr(testErr.message);
        setLoading(false);
        return;
      }

      setForm({
        name: row.name ?? "",
        age_min: row.age_min ?? "",
        age_max: row.age_max ?? "",
        authors: row.authors ?? "",
        year: row.year ?? "",
        original_citation: row.original_citation ?? "",
        doi: row.doi ?? "",
        source_url: row.source_url ?? "",
        access_notes: row.access_notes ?? "",
        use_cases: row.use_cases ?? "",
        notes: row.notes ?? "",
        status: row.status ?? "draft",
      });

      const [joinA, joinP, joinM, joinPop] = await Promise.all([
        supabase.from("test_abilities").select("ability_id").eq("test_id", id),
        supabase.from("test_platforms").select("platform_id").eq("test_id", id),
        supabase.from("test_modalities").select("modality_id").eq("test_id", id),
        supabase.from("test_population_types").select("population_type_id").eq("test_id", id),
      ]);

      if (!joinA.error) setSelectedAbilityIds(new Set((joinA.data ?? []).map((j) => j.ability_id)));
      if (!joinP.error) setSelectedPlatformIds(new Set((joinP.data ?? []).map((j) => j.platform_id)));
      if (!joinM.error) setSelectedModalityIds(new Set((joinM.data ?? []).map((j) => j.modality_id)));
      if (!joinPop.error) setSelectedPopulationIds(new Set((joinPop.data ?? []).map((j) => j.population_type_id)));

      setLoading(false);
    })();
  }, [mode, id]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(setter, idToToggle) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(idToToggle)) next.delete(idToToggle);
      else next.add(idToToggle);
      return next;
    });
  }

  const selectedCount = useMemo(() => selectedAbilityIds.size, [selectedAbilityIds]);

  async function save(e) {
    e.preventDefault();
    if (!user) return;

    setErr("");
    setSaving(true);

    try {
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        age_min: form.age_min === "" ? null : Number(form.age_min),
        age_max: form.age_max === "" ? null : Number(form.age_max),
        authors: form.authors || null,
        year: form.year === "" ? null : Number(form.year),
        original_citation: form.original_citation || null,
        doi: form.doi || null,
        source_url: form.source_url || null,
        access_notes: form.access_notes || null,
        use_cases: form.use_cases || null,
        notes: form.notes || null,
        status: form.status, // draft | wip | published
      };

      const testRes =
        mode === "new"
          ? await supabase.from("tests").insert(payload).select("id").single()
          : await supabase.from("tests").update(payload).eq("id", id).select("id").single();

      if (testRes.error) throw testRes.error;

      const testId = testRes.data.id;

      // Sync all join tables
      await syncJoinTable({ table: "test_abilities", testId, idCol: "ability_id", selectedIds: selectedAbilityIds });
      await syncJoinTable({ table: "test_platforms", testId, idCol: "platform_id", selectedIds: selectedPlatformIds });
      await syncJoinTable({ table: "test_modalities", testId, idCol: "modality_id", selectedIds: selectedModalityIds });
      await syncJoinTable({
        table: "test_population_types",
        testId,
        idCol: "population_type_id",
        selectedIds: selectedPopulationIds,
      });

      navigate("/my");
    } catch (e2) {
      setErr(e2.message ?? String(e2));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-zinc-600">Loading…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{mode === "new" ? "Add new test" : "Edit test"}</h1>
          <p className="mt-1 text-sm text-zinc-600">Add metadata + access information. Do not upload copyrighted materials.</p>
        </div>
        <button onClick={() => navigate(-1)} className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-zinc-50">
          Back
        </button>
      </div>

      {err ? (
        <Card>
          <p className="text-sm text-red-600">{err}</p>
        </Card>
      ) : null}

      {!profileLoading && !hasOrcid ? (
        <Card>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-zinc-900">ORCID required</div>
            <p className="text-sm text-zinc-600">To create or edit tests, please sign in with ORCID (and ensure your profile has an ORCID iD).</p>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Go to Profile
            </button>
          </div>
        </Card>
      ) : null}

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name *">
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              >
                <option value="draft">draft</option>
                <option value="wip">work in progress</option>
                <option value="published">published</option>
              </select>
            </Field>

            <Field label="Authors *">
              <input
                value={form.authors}
                onChange={(e) => update("authors", e.target.value)}
                required
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Year">
              <input
                value={form.year}
                onChange={(e) => update("year", e.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Age min">
              <input
                value={form.age_min}
                onChange={(e) => update("age_min", e.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Age max">
              <input
                value={form.age_max}
                onChange={(e) => update("age_max", e.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Ability categories"
            subtitle="Choose from the controlled vocabulary."
            right={
              <>
                Selected: <span className="font-medium text-zinc-900">{selectedCount}</span>
              </>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {abilities.map((a) => (
              <label key={a.id} className="flex gap-3 rounded-2xl border p-3 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedAbilityIds.has(a.id)}
                  onChange={() => toggle(setSelectedAbilityIds, a.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-zinc-900">{a.label}</div>
                  {a.description ? <div className="mt-1 text-sm text-zinc-600">{a.description}</div> : null}
                  <div className="mt-1 text-xs text-zinc-500">{a.slug}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Platform"
            subtitle="Select how the test is administered."
            right={
              <>
                Selected: <span className="font-medium text-zinc-900">{selectedPlatformIds.size}</span>
              </>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {platforms.map((p) => (
              <label key={p.id} className="flex gap-3 rounded-2xl border p-3 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedPlatformIds.has(p.id)}
                  onChange={() => toggle(setSelectedPlatformIds, p.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-zinc-900">{p.label}</div>
                  {p.description ? <div className="mt-1 text-sm text-zinc-600">{p.description}</div> : null}
                  <div className="mt-1 text-xs text-zinc-500">{p.slug}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Sensory modality"
            subtitle="Select the sensory modality/modalities used by the task."
            right={
              <>
                Selected: <span className="font-medium text-zinc-900">{selectedModalityIds.size}</span>
              </>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {modalities.map((m) => (
              <label key={m.id} className="flex gap-3 rounded-2xl border p-3 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedModalityIds.has(m.id)}
                  onChange={() => toggle(setSelectedModalityIds, m.id)}
                  className="mt-1"
                />
                <div className="font-medium text-zinc-900">{m.label}</div>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Population type"
            subtitle="Select populations the test has been adapted for / validated in."
            right={
              <>
                Selected: <span className="font-medium text-zinc-900">{selectedPopulationIds.size}</span>
              </>
            }
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {populations.map((p) => (
              <label key={p.id} className="flex gap-3 rounded-2xl border p-3 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedPopulationIds.has(p.id)}
                  onChange={() => toggle(setSelectedPopulationIds, p.id)}
                  className="mt-1"
                />
                <div className="font-medium text-zinc-900">{p.label}</div>
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs text-zinc-500">
            Tip: if you select anything other than “General population”, the entry will be labeled as “Adapted”.
          </div>
        </Card>

        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="DOI">
              <input
                value={form.doi}
                onChange={(e) => update("doi", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Source URL" hint="Publisher page / DOI resolver / official landing page.">
              <input
                value={form.source_url}
                onChange={(e) => update("source_url", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>
          </div>

          <div className="mt-4 grid gap-4">
            <Field label="Original citation *">
              <textarea
                value={form.original_citation}
                onChange={(e) => update("original_citation", e.target.value)}
                required
                rows={3}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Access notes" hint="e.g., contact author, commercial, appendix, open materials.">
              <textarea
                value={form.access_notes}
                onChange={(e) => update("access_notes", e.target.value)}
                rows={2}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Example use cases (optional)" hint="This can be legacy text; you also have community tables on the detail page.">
              <textarea
                value={form.use_cases}
                onChange={(e) => update("use_cases", e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/my")}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || profileLoading || !hasOrcid}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : !hasOrcid ? "Add ORCID to Save" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
