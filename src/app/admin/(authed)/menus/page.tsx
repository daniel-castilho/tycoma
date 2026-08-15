import Link from "next/link";
import { content } from "@/app/_lib/modules";
import { deleteMenuAction, saveMenuAction } from "@/app/admin/_actions/menus";
import { DataTable } from "@/app/admin/(authed)/_components/data-table";
import { EmptyState } from "@/app/admin/(authed)/_components/empty-state";
import type { Menu } from "@/modules/content/domain/types";

export default async function MenusPage() {
  const menus = await content.listMenus();

  return (
    <>
      <h2>Navigation menus</h2>
      <p className="lead">Build the menus shown on the public site.</p>

      <DataTable<Menu>
        rows={menus}
        rowKey={(m) => m.id}
        columns={[
          { header: "Name", cell: (m) => <Link href={`/admin/menus/${m.id}`}>{m.name}</Link> },
          { header: "Slug", cell: (m) => m.slug },
          {
            header: "",
            cell: (m) => (
              <form action={deleteMenuAction}>
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className="btn-danger">
                  Delete
                </button>
              </form>
            ),
          },
        ]}
        empty={<EmptyState title="No menus yet" description="Create one with the form below." />}
      />

      <details style={{ marginTop: "1rem" }}>
        <summary style={{ cursor: "pointer", color: "var(--accent)" }}>+ New menu</summary>
        <form
          action={saveMenuAction}
          style={{ marginTop: "0.5rem", padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "0.4rem" }}
        >
          <div className="form-stack" style={{ gap: "0.5rem", maxWidth: "20rem" }}>
            <input className="btn-secondary" name="name" placeholder="Menu name (e.g. Main)" required />
            <button type="submit" className="btn-primary">
              Create menu
            </button>
          </div>
        </form>
      </details>
    </>
  );
}