import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({ meta: [{ title: "Billing — Admin" }] }),
  component: () => (
    <AdminShell title="Billing">
      <Outlet />
    </AdminShell>
  ),
});
