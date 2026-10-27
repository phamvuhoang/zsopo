import { ActionForm, Field, inputCls } from "@/components/action-form";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";
import { saveSetting } from "./actions";

export const instant = false;
export const metadata = { title: "Cấu hình" };

export default async function ConfigPage() {
  const ctx = await getStaffContext("/admin/cau-hinh");
  await requirePermission("config.manage", ctx.location.entity_id, null, "/admin/cau-hinh");
  const { data } = await (await createClient()).schema("ops_config").from("runtime_settings").select("key, value, is_public, version, updated_at").order("key");
  return (
    <>
      <h1 className="text-2xl font-semibold">Cấu hình hệ thống</h1>
      <p className="text-sm text-[var(--ink-2)]">Mỗi thay đổi tăng phiên bản và ghi nhật ký trước/sau. Không lưu secret ở đây (secret nằm trong Edge secrets/Vault).</p>
      <ul className="mt-4 flex flex-col gap-3">{(data ?? []).map((s) => (
        <li key={s.key} className="rounded-md border border-[var(--line)] p-3">
          <ActionForm action={saveSetting} submit="Lưu" className="grid gap-2">
            <input type="hidden" name="key" value={s.key} />
            <p className="font-mono text-sm">{s.key} · v{s.version}{s.is_public ? " · công khai" : ""}</p>
            <Field label="Giá trị (JSON)"><textarea name="value" defaultValue={JSON.stringify(s.value, null, 2)} rows={4} className={`${inputCls} py-2 font-mono`} /></Field>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" name="public" defaultChecked={s.is_public} /> Công khai</label>
          </ActionForm>
        </li>))}</ul>
    </>
  );
}
