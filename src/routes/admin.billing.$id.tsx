import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/billing/$id")({
  head: () => ({ meta: [{ title: "Invoice — Admin" }] }),
  component: () => (
    <AdminShell title="Billing">
      <Outlet />
    </AdminShell>
  ),
});
