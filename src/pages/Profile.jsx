import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

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

function normalizeOrcid(value) {
  // keep digits/X and hyphens, force ORCID style groups
  const raw = (value || "").trim().replace(/[^0-9Xx-]/g, "").toUpperCase();
  const digits = raw.replace(/-/g, "");
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  if (digits.length <= 12) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
}

function isValidOrcid(value) {
  // basic format check only (not checksum)
  return /^(\d{4}-){3}[\dX]{4}$/.test((value || "").trim());
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

// Try hard to extract ORCID iD from the Supabase user object
function extractOrcidFromUser(user) {
  const meta = user?.user_metadata ?? {};
  const identities = user?.identities ?? [];

  // Common OIDC field
  const sub = meta?.sub;
  if (typeof sub === "string" && sub.includes("-")) return sub;

  // Sometimes custom mapping
  if (typeof meta?.orcid === "string" && meta.orcid.includes("-")) return meta.orcid;

  // Try identities payload
  for (const id of identities) {
    const im = id?.identity_data ?? {};
    if (typeof im?.sub === "string" && im.sub.includes("-")) return im.sub;
    if (typeof im?.orcid === "string" && im.orcid.includes("-")) return im.orcid;
  }

  // Nothing found
  return "";
}

function extractDisplayNameFromUser(user) {
  const meta = user?.user_metadata ?? {};
  const identities = user?.identities ?? [];

  // Try common OIDC name fields
  const fromMeta = pickFirst(meta.name, meta.full_name, meta.preferred_username);

  if (fromMeta) return fromMeta;

  // Try identities
  for (const id of identities) {
    const im = id?.identity_data ?? {};
    const fromId = pickFirst(im.name, im.full_name, im.preferred_username);
    if (fromId) return fromId;
  }

  return "";
}

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    display_name: "",
    affiliation: "",
    orcid: "",
    contact_email: "",
    contact_via_orcid: true,
    contact_via_email: false,
  });

  const [orcidLocked, setOrcidLocked] = useState(false);

  useEffect(() => {
    (async () => {
      setErr("");
      setMsg("");
      setLoading(true);

      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUser(data.user);

      // Extract from ORCID login session (best effort)
      const orcidFromAuthRaw = extractOrcidFromUser(data.user);
      const orcidFromAuth = orcidFromAuthRaw ? normalizeOrcid(orcidFromAuthRaw) : "";
      const displayFromAuth = extractDisplayNameFromUser(data.user);

      // load profile row
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("user_id,display_name,affiliation,orcid,contact_email,contact_via_orcid,contact_via_email")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }

      // Prefer DB values if present, otherwise fill from ORCID session
      const finalOrcid = normalizeOrcid(profile?.orcid ?? orcidFromAuth ?? "");
      const finalDisplay = profile?.display_name ?? displayFromAuth ?? "";

      setForm({
        display_name: finalDisplay,
        affiliation: profile?.affiliation ?? "",
        orcid: finalOrcid,
        contact_email: profile?.contact_email ?? "",
        contact_via_orcid: profile?.contact_via_orcid ?? true,
        contact_via_email: profile?.contact_via_email ?? false,
      });

      // Lock ORCID if we got it from auth (prevents mismatch)
      setOrcidLocked(!!orcidFromAuth);

      setLoading(false);
    })();
  }, [navigate]);

  function update(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const orcidPreview = useMemo(() => {
    const v = (form.orcid || "").trim();
    if (!v) return null;
    return isValidOrcid(v) ? `https://orcid.org/${v}` : null;
  }, [form.orcid]);

  async function save(e) {
    e.preventDefault();
    if (!user) return;

    setErr("");
    setMsg("");
    setSaving(true);

    try {
      const cleanOrcid = (form.orcid || "").trim();

      if (cleanOrcid && !isValidOrcid(cleanOrcid)) {
        throw new Error("ORCID must be in the format 0000-0000-0000-0000 (last group can end with X).");
      }

      // If ORCID is locked, always re-derive from current auth session (prevents tampering)
      let finalOrcid = cleanOrcid || null;
      if (orcidLocked) {
        const { data } = await supabase.auth.getUser();
        const fromAuth = normalizeOrcid(extractOrcidFromUser(data?.user));
        finalOrcid = fromAuth && isValidOrcid(fromAuth) ? fromAuth : finalOrcid;
      }

      const payload = {
        user_id: user.id,
        display_name: form.display_name.trim() || null,
        affiliation: form.affiliation.trim() || null,
        orcid: finalOrcid,
        contact_email: form.contact_email.trim() || null,
        contact_via_orcid: !!form.contact_via_orcid,
        contact_via_email: !!form.contact_via_email,
      };

      const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "user_id" });
      if (error) throw error;

      setMsg("Profile saved.");
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
          <h1 className="text-2xl font-semibold text-zinc-900">Profile</h1>
          <p className="mt-1 text-sm text-zinc-600">
            This information is used for attribution (“Added by…”) and optional contact.
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

      {msg && (
        <Card>
          <p className="text-sm text-green-700">{msg}</p>
        </Card>
      )}

      <form onSubmit={save} className="space-y-4">
        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Display name" hint="Shown publicly as the contributor name (recommended).">
              <input
                value={form.display_name}
                onChange={(e) => update("display_name", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="e.g., Santa Bart"
              />
              <div className="mt-2 text-xs text-zinc-500">
                Tip: ORCID sometimes doesn’t provide a public name via OpenID; you can set it here.
              </div>
            </Field>

            <Field label="Affiliation" hint="Optional, helps people understand your context.">
              <input
                value={form.affiliation}
                onChange={(e) => update("affiliation", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="e.g., University of Latvia"
              />
            </Field>

            <Field
              label="ORCID iD"
              hint={
                orcidLocked
                  ? "This ORCID iD was verified via ORCID sign-in and is locked."
                  : "Format: 0000-0000-0000-0000 (last character can be X)."
              }
            >
              <input
                value={form.orcid}
                onChange={(e) => update("orcid", normalizeOrcid(e.target.value))}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-50"
                placeholder="0000-0000-0000-0000"
                disabled={orcidLocked}
              />
              <div className="mt-2 text-xs text-zinc-500">
                {form.orcid ? (
                  orcidPreview ? (
                    <>
                      Public ORCID link:{" "}
                      <a className="underline hover:no-underline" href={orcidPreview} target="_blank" rel="noreferrer">
                        {orcidPreview}
                      </a>
                    </>
                  ) : (
                    <span className="text-red-600">ORCID format looks incorrect.</span>
                  )
                ) : (
                  <span>Tip: ORCID is used to identify you as a contributor.</span>
                )}
              </div>
            </Field>

            <Field
              label="Contact email (optional)"
              hint="Only shown publicly if you enable 'Allow contact via email' below."
            >
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => update("contact_email", e.target.value)}
                className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="you@university.edu"
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-zinc-900">Contact preferences</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Choose what you want to share publicly for other researchers.
          </p>

          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-2xl border p-3 hover:bg-zinc-50">
              <input
                type="checkbox"
                checked={form.contact_via_email}
                onChange={(e) => update("contact_via_email", e.target.checked)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-zinc-900">Allow contact via email</div>
                <div className="text-sm text-zinc-600">
                  Show your email publicly for direct contact. (Optional)
                </div>
              </div>
            </label>

            {form.contact_via_email && !form.contact_email && (
              <div className="text-sm text-red-600">
                You enabled email contact but didn’t provide an email address.
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
