import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate, useParams } from "react-router-dom";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

function SmallButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, ...props }) {
  return (
    <button
      {...props}
      className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function Chip({ children }) {
  return <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{children}</span>;
}

function StatusBadge({ status }) {
  const label =
    status === "draft"
      ? "Draft"
      : status === "wip"
      ? "Work in progress"
      : status === "published"
      ? "Published"
      : status;

  return <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{label}</span>;
}

function isValidUrl(u) {
  if (!u) return true;
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

function Block({ label, value, placeholder = "—" }) {
  return (
    <div className="text-sm text-zinc-700 md:col-span-2">
      <span className="font-medium">{label}:</span>
      <div className="mt-2 whitespace-pre-wrap rounded-xl border bg-zinc-50 p-3 text-sm text-zinc-700">
        {value?.trim?.() ? value.trim() : placeholder}
      </div>
    </div>
  );
}

/**
 * Generic table editor for rows with:
 * about, authors, publication_url, notes
 */
function ContributionTable({ title, subtitle, rows, loading, error, userId, onAdd, onUpdate, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [draft, setDraft] = useState({ about: "", authors: "", publication_url: "", notes: "" });

  useEffect(() => {
    if (!adding && !editingId) setDraft({ about: "", authors: "", publication_url: "", notes: "" });
  }, [adding, editingId]);

  function startAdd() {
    setAdding(true);
    setEditingId(null);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setAdding(false);
    setDraft({
      about: row.about ?? "",
      authors: row.authors ?? "",
      publication_url: row.publication_url ?? "",
      notes: row.notes ?? "",
    });
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setDraft({ about: "", authors: "", publication_url: "", notes: "" });
  }

  async function saveNew() {
    if (!draft.about.trim()) return;
    if (!isValidUrl(draft.publication_url.trim())) return;
    await onAdd({
      about: draft.about.trim(),
      authors: draft.authors.trim() || null,
      publication_url: draft.publication_url.trim() || null,
      notes: draft.notes.trim() || null,
    });
    cancel();
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!draft.about.trim()) return;
    if (!isValidUrl(draft.publication_url.trim())) return;
    await onUpdate(editingId, {
      about: draft.about.trim(),
      authors: draft.authors.trim() || null,
      publication_url: draft.publication_url.trim() || null,
      notes: draft.notes.trim() || null,
    });
    cancel();
  }

  const canSubmit = !!userId;

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
        </div>

        <div className="flex gap-2">
          {canSubmit ? (
            <PrimaryButton type="button" onClick={startAdd} disabled={adding || !!editingId}>
              Add row
            </PrimaryButton>
          ) : (
            <div className="text-sm text-zinc-500">
              <Link className="underline hover:no-underline" to="/login">
                Sign in
              </Link>{" "}
              to contribute
            </div>
          )}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {adding || editingId ? (
        <div className="mt-4 rounded-2xl border p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-zinc-700">About *</div>
              <textarea
                rows={2}
                value={draft.about}
                onChange={(e) => setDraft((p) => ({ ...p, about: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-700">Authors</div>
              <input
                value={draft.authors}
                onChange={(e) => setDraft((p) => ({ ...p, authors: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>

            <label className="block">
              <div className="text-sm font-medium text-zinc-700">Publication URL</div>
              <input
                value={draft.publication_url}
                onChange={(e) => setDraft((p) => ({ ...p, publication_url: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
              {draft.publication_url && !isValidUrl(draft.publication_url) ? (
                <div className="mt-1 text-xs text-red-600">Please enter a valid URL.</div>
              ) : null}
            </label>

            <label className="block md:col-span-2">
              <div className="text-sm font-medium text-zinc-700">Notes</div>
              <textarea
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft((p) => ({ ...p, notes: e.target.value }))}
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SmallButton type="button" onClick={cancel}>
              Cancel
            </SmallButton>
            <PrimaryButton type="button" onClick={adding ? saveNew : saveEdit}>
              Save
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-zinc-600">
              <th className="border-b py-2 pr-3">About</th>
              <th className="border-b py-2 pr-3">Authors</th>
              <th className="border-b py-2 pr-3">Publication URL</th>
              <th className="border-b py-2 pr-3">Notes</th>
              <th className="border-b py-2 pr-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="py-3 text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-zinc-500">
                  No entries yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const canEdit = userId && r.created_by === userId;
                return (
                  <tr key={r.id} className="align-top">
                    <td className="border-b py-3 pr-3">{r.about}</td>
                    <td className="border-b py-3 pr-3">{r.authors ?? "—"}</td>
                    <td className="border-b py-3 pr-3">
                      {r.publication_url ? (
                        <a
                          className="underline hover:no-underline"
                          href={r.publication_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border-b py-3 pr-3">{r.notes ?? "—"}</td>
                    <td className="border-b py-3 pr-3">
                      {canEdit ? (
                        <div className="flex gap-2">
                          <SmallButton type="button" onClick={() => startEdit(r)}>
                            Edit
                          </SmallButton>
                          <SmallButton type="button" onClick={() => onDelete(r.id)}>
                            Delete
                          </SmallButton>
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [userId, setUserId] = useState(null);

  const [test, setTest] = useState(null);
  const [abilities, setAbilities] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [modalities, setModalities] = useState([]);
  const [populations, setPopulations] = useState([]);

  const [versions, setVersions] = useState([]);
  const [related, setRelated] = useState([]);

  const [loading, setLoading] = useState(true);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(true);

  const [err, setErr] = useState("");
  const [versionsErr, setVersionsErr] = useState("");
  const [relatedErr, setRelatedErr] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
  }, []);

  async function loadCore() {
    setErr("");
    setLoading(true);

    // IMPORTANT CHANGE:
    // Join profiles_public instead of profiles so contact_email is only returned when:
    // - viewer is logged in (auth.uid exists)
    // - contributor enabled contact_via_email = true
    const testRes = await supabase
      .from("tests")
      .select(
        "id,name,authors,year,age_min,age_max,original_citation,doi,source_url,access_notes,use_cases,notes,status,owner_id,profiles:profiles_public(user_id,display_name,orcid,contact_email)"
      )
      .eq("id", id)
      .single();

    if (testRes.error) {
      setErr(testRes.error.message);
      setLoading(false);
      return;
    }

    setTest(testRes.data);

    const [joinA, joinP, joinM, joinPop, abilRes, platRes, modRes, popRes] = await Promise.all([
      supabase.from("test_abilities").select("ability_id").eq("test_id", id),
      supabase.from("test_platforms").select("platform_id").eq("test_id", id),
      supabase.from("test_modalities").select("modality_id").eq("test_id", id),
      supabase.from("test_population_types").select("population_type_id").eq("test_id", id),

      supabase.from("abilities").select("id,label"),
      supabase.from("platforms").select("id,label"),
      supabase.from("modalities").select("id,label"),
      supabase.from("population_types").select("id,label"),
    ]);

    const aMap = new Map((abilRes.data ?? []).map((x) => [x.id, x.label]));
    const pMap = new Map((platRes.data ?? []).map((x) => [x.id, x.label]));
    const mMap = new Map((modRes.data ?? []).map((x) => [x.id, x.label]));
    const popMap = new Map((popRes.data ?? []).map((x) => [x.id, x.label]));

    setAbilities((joinA.data ?? []).map((j) => aMap.get(j.ability_id)).filter(Boolean));
    setPlatforms((joinP.data ?? []).map((j) => pMap.get(j.platform_id)).filter(Boolean));
    setModalities((joinM.data ?? []).map((j) => mMap.get(j.modality_id)).filter(Boolean));
    setPopulations((joinPop.data ?? []).map((j) => popMap.get(j.population_type_id)).filter(Boolean));

    setLoading(false);
  }

  async function loadVersions() {
    setVersionsErr("");
    setVersionsLoading(true);

    const res = await supabase
      .from("test_versions")
      .select("id,test_id,created_by,about,authors,publication_url,notes,created_at,updated_at")
      .eq("test_id", id)
      .order("created_at", { ascending: false });

    if (res.error) setVersionsErr(res.error.message);
    else setVersions(res.data ?? []);
    setVersionsLoading(false);
  }

  async function loadRelated() {
    setRelatedErr("");
    setRelatedLoading(true);

    const res = await supabase
      .from("test_related_works")
      .select("id,test_id,created_by,about,authors,publication_url,notes,created_at,updated_at")
      .eq("test_id", id)
      .order("created_at", { ascending: false });

    if (res.error) setRelatedErr(res.error.message);
    else setRelated(res.data ?? []);
    setRelatedLoading(false);
  }

  useEffect(() => {
    (async () => {
      await Promise.all([loadCore(), loadVersions(), loadRelated()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const contributor = useMemo(() => {
    const p = test?.profiles;

    const orcid = p?.orcid ? String(p.orcid).trim() : "";
    const orcidUrl = orcid ? `https://orcid.org/${orcid}` : null;

    // IMPORTANT CHANGE:
    // In profiles_public, contact_email is already null unless allowed and viewer is logged in.
    // We also require userId in the UI, so logged-out users never see email.
    const email = p?.contact_email ? String(p.contact_email).trim() : "";
    const showEmail = !!userId && !!email;

    const name = p?.display_name?.trim()
      ? p.display_name.trim()
      : orcid
      ? `ORCID ${orcid}`
      : "Contributor";

    return { name, orcid, orcidUrl, showEmail, email };
  }, [test, userId]);

  const adapted = useMemo(() => {
    return (populations ?? []).some((p) => String(p).toLowerCase() !== "general population");
  }, [populations]);

  // contribution CRUD
  async function addVersion(payload) {
    setVersionsErr("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setVersionsErr("Please sign in to contribute.");

    const res = await supabase.from("test_versions").insert({ test_id: id, created_by: u.user.id, ...payload });
    if (res.error) setVersionsErr(res.error.message);
    await loadVersions();
  }

  async function updateVersion(rowId, payload) {
    setVersionsErr("");
    const res = await supabase.from("test_versions").update(payload).eq("id", rowId);
    if (res.error) setVersionsErr(res.error.message);
    await loadVersions();
  }

  async function deleteVersion(rowId) {
    if (!confirm("Delete this row?")) return;
    setVersionsErr("");
    const res = await supabase.from("test_versions").delete().eq("id", rowId);
    if (res.error) setVersionsErr(res.error.message);
    await loadVersions();
  }

  async function addRelated(payload) {
    setRelatedErr("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setRelatedErr("Please sign in to contribute.");

    const res = await supabase.from("test_related_works").insert({ test_id: id, created_by: u.user.id, ...payload });
    if (res.error) setRelatedErr(res.error.message);
    await loadRelated();
  }

  async function updateRelated(rowId, payload) {
    setRelatedErr("");
    const res = await supabase.from("test_related_works").update(payload).eq("id", rowId);
    if (res.error) setRelatedErr(res.error.message);
    await loadRelated();
  }

  async function deleteRelated(rowId) {
    if (!confirm("Delete this row?")) return;
    setRelatedErr("");
    const res = await supabase.from("test_related_works").delete().eq("id", rowId);
    if (res.error) setRelatedErr(res.error.message);
    await loadRelated();
  }

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-zinc-600">Loading…</p>
      </Card>
    );
  }

  if (err) {
    return (
      <Card>
        <p className="text-sm text-red-600">{err}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-zinc-900">{test.name}</h1>
            <StatusBadge status={test.status} />
            {adapted ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Adapted</span>
            ) : null}
          </div>

          <p className="mt-1 text-sm text-zinc-600">
            {(test.authors ?? "—")}
            {test.year ? ` (${test.year})` : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
            <span>Added by</span>
            {contributor.orcidUrl ? (
              <a className="underline hover:no-underline" href={contributor.orcidUrl} target="_blank" rel="noreferrer">
                {contributor.name}
              </a>
            ) : (
              <span>{contributor.name}</span>
            )}

            {contributor.showEmail ? (
              <>
                <span className="text-zinc-300">•</span>
                <a className="underline hover:no-underline" href={`mailto:${contributor.email}`}>
                  {contributor.email}
                </a>
              </>
            ) : null}

            {/* Optional hint for logged-out users */}
            {!userId ? (
              <>
                <span className="text-zinc-300">•</span>
                <span>
                  <Link className="underline hover:no-underline" to="/login">
                    Sign in
                  </Link>{" "}
                  to view contact email (if shared)
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2">
          <SmallButton type="button" onClick={() => navigate(-1)}>
            Back
          </SmallButton>

          {userId && test.owner_id === userId ? (
            <Link
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              to={`/edit/${test.id}`}
            >
              Edit core entry
            </Link>
          ) : null}
        </div>
      </div>

      {/* CORE FIELDS */}
      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="text-sm text-zinc-700">
            <span className="font-medium">Age:</span> {test.age_min ?? "?"}–{test.age_max ?? "?"}
          </div>

          <div className="text-sm text-zinc-700">
            <span className="font-medium">Status:</span>{" "}
            {test.status === "draft" ? "Draft" : test.status === "wip" ? "Work in progress" : "Published"}
          </div>

          <div className="text-sm text-zinc-700 md:col-span-2">
            <span className="font-medium">Ability:</span>{" "}
            {abilities.length ? (
              <span className="inline-flex flex-wrap gap-2">{abilities.map((l) => <Chip key={l}>{l}</Chip>)}</span>
            ) : (
              "—"
            )}
          </div>

          <div className="text-sm text-zinc-700 md:col-span-2">
            <span className="font-medium">Platform:</span>{" "}
            {platforms.length ? (
              <span className="inline-flex flex-wrap gap-2">{platforms.map((l) => <Chip key={l}>{l}</Chip>)}</span>
            ) : (
              "—"
            )}
          </div>

          <div className="text-sm text-zinc-700 md:col-span-2">
            <span className="font-medium">Sensory modality:</span>{" "}
            {modalities.length ? (
              <span className="inline-flex flex-wrap gap-2">{modalities.map((l) => <Chip key={l}>{l}</Chip>)}</span>
            ) : (
              "—"
            )}
          </div>

          <div className="text-sm text-zinc-700 md:col-span-2">
            <span className="font-medium">Population type:</span>{" "}
            {populations.length ? (
              <span className="inline-flex flex-wrap gap-2">{populations.map((l) => <Chip key={l}>{l}</Chip>)}</span>
            ) : (
              "—"
            )}
          </div>

          {test.doi ? (
            <div className="text-sm text-zinc-700 md:col-span-2">
              <span className="font-medium">DOI:</span>{" "}
              <a
                className="underline hover:no-underline"
                href={`https://doi.org/${String(test.doi).trim()}`}
                target="_blank"
                rel="noreferrer"
              >
                {String(test.doi).trim()}
              </a>
            </div>
          ) : (
            <div className="text-sm text-zinc-700 md:col-span-2">
              <span className="font-medium">DOI:</span> —
            </div>
          )}

          {test.source_url ? (
            <div className="text-sm text-zinc-700 md:col-span-2">
              <span className="font-medium">Source URL:</span>{" "}
              <a className="underline hover:no-underline" href={test.source_url} target="_blank" rel="noreferrer">
                {test.source_url}
              </a>
            </div>
          ) : (
            <div className="text-sm text-zinc-700 md:col-span-2">
              <span className="font-medium">Source URL:</span> —
            </div>
          )}

          <Block label="Original citation" value={test.original_citation ?? ""} />
          <Block label="Access notes" value={test.access_notes ?? ""} />
          <Block label="Example use cases" value={test.use_cases ?? ""} />
          <Block label="Notes" value={test.notes ?? ""} />
        </div>
      </Card>

      {/* COMMUNITY TABLES */}
      <ContributionTable
        title="Other test versions"
        subtitle="Community-contributed versions, adaptations, or alternate implementations."
        rows={versions}
        loading={versionsLoading}
        error={versionsErr}
        userId={userId}
        onAdd={addVersion}
        onUpdate={updateVersion}
        onDelete={deleteVersion}
      />

      <ContributionTable
        title="Inspired / related work"
        subtitle="Community-contributed papers, tasks, datasets, or related instruments."
        rows={related}
        loading={relatedLoading}
        error={relatedErr}
        userId={userId}
        onAdd={addRelated}
        onUpdate={updateRelated}
        onDelete={deleteRelated}
      />
    </div>
  );
}
