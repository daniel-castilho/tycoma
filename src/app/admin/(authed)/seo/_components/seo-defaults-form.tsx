"use client";

import { useState } from "react";
import { saveSeoDefaultsAction } from "@/app/admin/_actions/seo";

function host(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function SeoDefaultsForm({
  baseUrl,
  initialTitle,
  initialDescription,
}: {
  baseUrl: string;
  initialTitle: string;
  initialDescription: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  return (
    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" }}>
      <form action={saveSeoDefaultsAction} className="form-stack" style={{ gap: "1rem" }}>
        <label className="field">
          <span>Default meta title</span>
          <input name="defaultMetaTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          <span className="hint">Used when a post or page has no custom meta title. Keep it under ~60 characters.</span>
        </label>
        <label className="field">
          <span>Default meta description</span>
          <textarea name="defaultMetaDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <span className="hint">Used when a post or page has no custom meta description. Keep it under ~160 characters.</span>
        </label>
        <button type="submit" className="btn-primary">
          Save SEO defaults
        </button>
      </form>

      <div>
        <p className="hint">Google preview</p>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "0.4rem",
          }}
        >
          <div style={{ color: "#202124", fontSize: "0.875rem" }}>{baseUrl}</div>
          <div style={{ color: "#1a0dab", fontSize: "1.1rem", fontWeight: 500, marginTop: "0.25rem" }}>
            {title.trim() || host(baseUrl)}
          </div>
          <div style={{ color: "#4d5156", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            {description.trim() || "Add a default meta description to see a preview here."}
          </div>
        </div>
      </div>
    </div>
  );
}