import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string; full_name: string; password: string }) => {
    const username = (d.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,32}$/.test(username)) throw new Error("Username must be 3-32 chars, a-z, 0-9, _");
    if ((d.password || "").length < 8) throw new Error("Password must be at least 8 characters");
    return { username, full_name: d.full_name || "", password: d.password };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = `${data.username}@medline.local`;
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.full_name, must_change_password: true },
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid, username: data.username, full_name: data.full_name, must_change_password: true, is_active: true,
    });
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: "admin" });
    return { id: uid, username: data.username };
  });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; password: string }) => {
    if (!d.user_id) throw new Error("user_id required");
    if ((d.password || "").length < 8) throw new Error("Password must be at least 8 characters");
    return d;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").update({ must_change_password: true }).eq("id", data.user_id);
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; is_active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot deactivate yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("profiles").update({ is_active: data.is_active }).eq("id", data.user_id);
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, { ban_duration: data.is_active ? "none" : "876000h" });
    return { ok: true };
  });
