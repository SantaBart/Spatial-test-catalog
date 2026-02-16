import React from "react";

function Card({ children }) {
  return <div className="rounded-2xl border bg-white p-5 shadow-sm">{children}</div>;
}

export default function About() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">About the Spatial Test Catalog</h1>
        <p className="mt-2 text-sm text-zinc-600">
          A searchable catalog of spatial cognition assessments. Anyone can browse. Verified researchers (ORCID sign-in)
          can contribute and maintain entries.
        </p>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-zinc-900">How to use the catalog</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li>Use the search bar to find tests by name or author.</li>
          <li>Filter by ability category and age range to match your target population.</li>
          <li>Open the source link for the official publication or landing page.</li>
          <li>Check access notes for licensing, author contact, or availability.</li>
          <li>Use “Added by” attribution to contact the contributor (ORCID link; email only if they opted in).</li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-zinc-900">Contributing</h2>
        <div className="mt-3 space-y-2 text-sm text-zinc-700">
          <p>
            To add or edit entries, sign in with ORCID. Your ORCID iD is stored automatically for attribution and to
            reduce impersonation.
          </p>
          <p>
            Please do not upload copyrighted materials. Instead, provide links (DOI/publisher page) and notes on how to
            access materials (e.g., contact authors, OSF link, commercial source).
          </p>
            <p>
            You can also contribute inspired work and other versions of the spatial tests by selecting an entry and adding your input to the tables below.
          </p>
          <p>
            Each catalog entry has one of three statuses:
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
              <li><b>Draft</b> – Visible only to the author.</li>
              <li><b>Work in progress</b> – Visible to registered (ORCID-signed-in) users.</li>
              <li><b>Published </b>– Publicly visible to all visitors.</li>
            </ul>
            </p>
            <p>
              This allows contributors to develop and refine entries before making them fully public.
          </p>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-semibold text-zinc-900">Catalog overview</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-700">
          <li><b>Cataog</b>: view and search the spatial test catalog</li>
          <li><b>Contact</b>: conact form </li>
          <li><b>My entries</b>: view and edit your entries</li>
          <li><b>Add</b>: add a new entry</li>
          <li><b>profile</b>: view and edit your profile</li>
        </ul>
      </Card>

       <Card>
        <h1 className="text-base font-semibold text-zinc-900">In case of any questions or conflicts about your contributions or the contributions of others, please reach out to us using the contact form.</h1>
      </Card>
    </div>
  );
}
