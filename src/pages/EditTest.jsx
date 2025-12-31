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

export default function EditTest({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");

  const [abilities, setAbilities] = useState([]);
  const [selectedAbilityIds, setSelectedAbilityIds] = useState(new Set());

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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUser(data.user);
    })();
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("abilities")
        .select("id,slug,label,description")
        .order("label", { ascending: true });

      if (error) setErr(error.message);
      else setAbilities(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !id) return;

    (async () => {
      setErr("");
      setLoading(true);

      const { data: row, error: testErr } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();

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

      const { data: joins, error: joinErr } = await supabase
        .from("test_abilities")
        .select("ability_id")
        .eq("test_id", id);

      if (joinErr) {
        setErr(joinErr.message);
        setLoading(false);
        return;
      }

      setSelectedAbilityIds(new Set((joins ?? []).map((j) => j.ability_id)));
      setLoading(false);
    })();
  }, [mode, id]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAbility(abilityId) {
    setSelectedAbilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(abilityId)) next.delete(abilityId);
      else next.add(abilityId);
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
        status: form.status,
      };

      const testRes =
        mode === "new"
          ? await supabase.from("tests").insert(payload).select("id").single()
          : await supabase.from("tests").update(payload).eq("id", id).select("id").single();

      if (testRes.error) throw testRes.error;

      const testId = testRes.data.id;

      const existingRes = await supabase
        .from("test_abilities")
        .select("ability_id")
        .eq("test_id", testId);

      if (existingRes.error) throw existingRes.error;

      const existing = new Set((existingRes.data ?? []).map((r) => r.ability_id));

      const toInsert = [];
      for (const aid of selectedAbilityIds) if (!existing.has(aid)) toInsert.push({ test_id: testId, ability_id: aid });

      const toDelete = [];
      for (const aid of existing) if (!selectedAbilityIds.has(aid)) toDelete.push(aid);

      if (toInsert.length > 0) {
        const insRes = await supabase.from("test_abilities").insert(toInsert);
        if (insRes.error) throw insRes.error;
      }

      if (toDelete.length > 0) {
        const delRes = await supabase
          .from("test_abilities")
          .delete()
          .eq("test_id", testId)
          .in("ability_id", toDelete);

        if (delRes.error) throw delRes.error;
      }

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
          <h1 className="text-2xl font-semibold text-zinc-900">
            {mode === "new" ? "Add new test" : "Edit test"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Add metadata + access information. Do not upload copyrighted materials.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Back
        </button>
      </div>

      {err && (
        <Card>
          <p className="text-sm text-red-600">{err}</p>
        </Card>
      )}

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
                <option value="published">published</option>
              </select>
            </Field>

            <Field label="Authors">
              <input
                value={form.authors}
                onChange={(e) => update("authors", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Year">
              <input
                value={form.year}
                onChange={(e) => update("year", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Age min">
              <input
                value={form.age_min}
                onChange={(e) => update("age_min", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Age max">
              <input
                value={form.age_max}
                onChange={(e) => update("age_max", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">Ability categories</h2>
              <p className="mt-1 text-sm text-zinc-600">Choose from the controlled vocabulary.</p>
            </div>
            <div className="text-sm text-zinc-600">
              Selected: <span className="font-medium text-zinc-900">{selectedCount}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {abilities.map((a) => (
              <label key={a.id} className="flex gap-3 rounded-2xl border p-3 hover:bg-zinc-50">
                <input
                  type="checkbox"
                  checked={selectedAbilityIds.has(a.id)}
                  onChange={() => toggleAbility(a.id)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-zinc-900">{a.label}</div>
                  {a.description && <div className="mt-1 text-sm text-zinc-600">{a.description}</div>}
                  <div className="mt-1 text-xs text-zinc-500">{a.slug}</div>
                </div>
              </label>
            ))}
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
            <Field label="Original citation">
              <textarea
                value={form.original_citation}
                onChange={(e) => update("original_citation", e.target.value)}
                rows={3}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Access notes" hint="e.g., contact author, commercial, appendix, open materials.">
              <input
                value={form.access_notes}
                onChange={(e) => update("access_notes", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </Field>

            <Field label="Example use cases">
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
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
