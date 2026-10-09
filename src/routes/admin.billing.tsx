import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Billing workspace — Medline Diagnostics Admin" }, { name: "description", content: "Billing workspace — Medline Diagnostics Admin. Private staff workspace." }, { property: "og:title", content: "Billing workspace — Medline Diagnostics Admin" }, { property: "og:description", content: "Billing workspace — Medline Diagnostics Admin. Private staff workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <AdminShell title="Billing">
      <Outlet />
    </AdminShell>
  ),
});
