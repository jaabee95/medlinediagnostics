import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ADMIN_PAGES = [
  { key: "dashboard",  label: "Dashboard",          path: "/admin" },
  { key: "profile",    label: "Diagnostic Profile", path: "/admin/profile" },
  { key: "slides",     label: "Homepage Slider",    path: "/admin/slides" },
  { key: "services",   label: "Services & Tests",   path: "/admin/services" },
  { key: "doctors",    label: "Doctors",            path: "/admin/doctors" },
  { key: "enquiries",  label: "Enquiries",          path: "/admin/enquiries" },
  { key: "reviews",    label: "Reviews",            path: "/admin/reviews" },
  { key: "users",      label: "Users",              path: "/admin/users" },
  { key: "account",    label: "Account",            path: "/admin/account" },
] as const;

export type PageKey = typeof ADMIN_PAGES[number]["key"];

export type AccessMap = Record<string, { view: boolean; edit: boolean }>;

export type AccessInfo = {
  isAdmin: boolean;
  isLoaded: boolean;
  can: (page: PageKey, action?: "view" | "edit") => boolean;
  map: AccessMap;
};

export function useAccess(userId: string | null | undefined): AccessInfo {
  const { data, isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["access", userId],
    queryFn: async () => {
      const [roles, perms] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId!),
        supabase.from("user_permissions").select("page_key,can_view,can_edit").eq("user_id", userId!),
      ]);
      const isAdmin = (roles.data || []).some((r: any) => r.role === "admin");
      const map: AccessMap = {};
      for (const p of perms.data || []) map[p.page_key] = { view: p.can_view, edit: p.can_edit };
      return { isAdmin, map };
    },
  });

  const isAdmin = !!data?.isAdmin;
  const map = data?.map || {};
  return {
    isAdmin,
    isLoaded: !!data && !isLoading,
    map,
    can: (page, action = "view") => {
      if (isAdmin) return true;
      const p = map[page];
      if (!p) return false;
      return action === "edit" ? p.edit : p.view || p.edit;
    },
  };
}
