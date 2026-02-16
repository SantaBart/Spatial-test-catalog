import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

export default function Contact() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  const [subject, setSubject] = useState("Spatial Test Catalog");
  const [message, setMessage] = useState(
    "My message:"
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUserEmail(data.user.email ?? "");
      setLoading(false);
    })();
  }, [navigate]);

  const mailtoHref = useMemo(() => {
    const to = "santa.bartusevica@lu.lv";
    const s = encodeURIComponent(subject || "");
    const body = encodeURIComponent(
      `${message || ""}\n\n---\nFrom: ${userEmail || "unknown"}\nSent via catalog.mindcave.lv`
    );
    return `mailto:${to}?subject=${s}&body=${body}`;
  }, [subject, message, userEmail]);

  if (loading) {
    return (
      <Card>
        <p className="text-sm text-zinc-600">Loading…</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Contact</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This page is available only to registered users. Clicking the button will open your email app.
        </p>
      </div>

      <Card>
        <label className="block">
          <div className="text-sm font-medium text-zinc-700">Subject</div>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </label>

        <label className="block mt-4">
          <div className="text-sm font-medium text-zinc-700">Message</div>
          <textarea
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-900/10"
          />
        </label>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <a
            href={mailtoHref}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 text-center"
          >
            Send message (opens your email app)
          </a>
        </div>

        <div className="mt-3 text-xs text-zinc-500">
          Tip: If nothing happens, you may need to set a default email application on your device.
        </div>
      </Card>
    </div>
  );
}
