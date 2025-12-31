import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";

export default function EditTest({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // abilities vocabulary from DB
  const [abilities, setAbilities] = useState([]); // {id, slug, label, description}
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

  // Load current user
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

  // Load abilities list (controlled vocabulary)
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

  // Load test + selected abilities when editing
  useEffect(() => {
    if (mode !== "edit" || !id) return;

    (async () => {
      setErr("");

      // Load test row
      const { data: row, error: testErr } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .single();

      if (testErr) {
        setErr(testErr.message);
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

      // Load join rows for this test
      const { data: joins, error: joinErr } = await supabase
        .from("test_abilities")
        .select("ability_id")
        .eq("test_id", id);

      if (joinErr) {
        setErr(joinErr.message);
        return;
      }

      setSelectedAbilityIds(new Set((joins ?? []).map((j) => j.ability_id)));
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
      // 1) Insert/update test row
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

      // 2) Update join table rows to match selectedAbilityIds
      // Fetch existing joins for this test (so we can diff)
      const existingRes = await supabase
        .from("test_abilities")
        .select("ability_id")
        .eq("test_id", testId);

      if (existingRes.error) throw existingRes.error;

      const existing = new Set((existingRes.data ?? []).map((r) => r.ability_id));

      const toInsert = [];
      for (const aid of selectedAbilityIds) {
        if (!existing.has(aid)) toInsert.push({ test_id: testId, ability_id: aid });
      }

      const toDelete = [];
      for (const aid of existing) {
        if (!selectedAbilityIds.has(aid)) toDelete.push(aid);
      }

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

  return (
    <div>
      <h2>{mode === "new" ? "Add new test" : "Edit test"}</h2>
      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <form onSubmit={save} style={{ display: "grid", gap: 12, maxWidth: 780 }}>
        <label>
          Name *
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            style={{ width: "100%", padding: 8 }}
          />
        </label>

        <fieldset style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <legend style={{ padding: "0 6px" }}>
            Ability categories (choose from list) — selected: {selectedCount}
          </legend>

          {abilities.length === 0 ? (
            <p style={{ margin: 0, opacity: 0.8 }}>Loading abilities…</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {abilities.map((a) => (
                <label key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    type="checkbox"
                    checked={selectedAbilityIds.has(a.id)}
                    onChange={() => toggleAbility(a.id)}
                    style={{ marginTop: 3 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.label}</div>
                    {a.description && <div style={{ fontSize: 13, opacity: 0.8 }}>{a.description}</div>}
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{a.slug}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}>
            Age min
            <input value={form.age_min} onChange={(e) => update("age_min", e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>
          <label style={{ flex: 1 }}>
            Age max
            <input value={form.age_max} onChange={(e) => update("age_max", e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 2 }}>
            Authors
            <input value={form.authors} onChange={(e) => update("authors", e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>
          <label style={{ flex: 1 }}>
            Year
            <input value={form.year} onChange={(e) => update("year", e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>
        </div>

        <label>
          Original citation
          <textarea value={form.original_citation} onChange={(e) => update("original_citation", e.target.value)} style={{ width: "100%", padding: 8 }} rows={3} />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1 }}>
            DOI
            <input value={form.doi} onChange={(e) => update("doi", e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>
          <label style={{ flex: 2 }}>
            Source URL
            <input value={form.source_url} onChange={(e) => update("source_url", e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>
        </div>

        <label>
          Access notes (e.g., contact author / commercial / appendix / open materials)
          <input value={form.access_notes} onChange={(e) => update("access_notes", e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Example use cases
          <textarea value={form.use_cases} onChange={(e) => update("use_cases", e.target.value)} style={{ width: "100%", padding: 8 }} rows={3} />
        </label>

        <label>
          Notes
          <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} style={{ width: "100%", padding: 8 }} rows={3} />
        </label>

        <label>
          Status
          <select value={form.status} onChange={(e) => update("status", e.target.value)} style={{ padding: 8 }}>
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>

        <button disabled={saving}>{saving ? "Saving..." : "Save"}</button>
      </form>
    </div>
  );
}
