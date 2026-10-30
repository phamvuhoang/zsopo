import { ActionForm, Field, inputCls } from "@/components/action-form";
import { createClient } from "@/lib/supabase/server";
import { saveService } from "../actions";
import { SERVICE_GROUPS } from "../service-queries";

const REVENUE = { own_service: "Dịch vụ tự vận hành", beverage: "Đồ uống", cohost_service: "Dịch vụ đồng tổ chức" } as const;

function ServiceFields({ s }: { s?: Record<string, unknown> }) {
  return (
    <>
      <Field label="Tên"><input name="name" required defaultValue={s?.name as string} className={inputCls} /></Field>
      <Field label="Nhóm"><select name="group" defaultValue={(s?.group_key as string) ?? "food"} className={inputCls}>{Object.entries(SERVICE_GROUPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Đơn vị"><input name="unit" required defaultValue={(s?.unit as string) ?? "lượt"} className={`${inputCls} w-20`} /></Field>
      <Field label="Giá (đ)"><input name="price" inputMode="numeric" required defaultValue={s ? String(s.price) : ""} className={`${inputCls} w-28`} /></Field>
      <Field label="Đặt trước (phút)"><input name="lead" inputMode="numeric" defaultValue={s ? String(s.lead_time_min) : "60"} className={`${inputCls} w-24`} /></Field>
      <Field label="Từ"><input name="from" type="time" defaultValue={((s?.serve_from as string) ?? "07:00").slice(0, 5)} className={inputCls} /></Field>
      <Field label="Đến"><input name="to" type="time" defaultValue={((s?.serve_to as string) ?? "21:00").slice(0, 5)} className={inputCls} /></Field>
      <Field label="Giảm đặt trước (%)"><input name="discountPct" inputMode="numeric" defaultValue={s ? String(Number(s.prebook_discount_bp) / 100) : "0"} className={`${inputCls} w-20`} /></Field>
      <Field label="Nguồn doanh thu"><select name="revenue" defaultValue={(s?.revenue_source as string) ?? "own_service"} className={inputCls}>{Object.entries(REVENUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <label className="flex min-h-11 items-center gap-1 text-sm"><input type="checkbox" name="active" defaultChecked={s ? Boolean(s.active) : true} /> Đang phục vụ</label>
    </>
  );
}

export async function ServicesAdmin({ entityId, locationId }: { entityId: string; locationId: string }) {
  const db = await createClient();
  const { data: services } = await db.schema("stay").from("services").select("*").eq("location_id", locationId).order("sort");
  return (
    <section className="mt-10" aria-labelledby="dich-vu">
      <h2 id="dich-vu" className="text-lg font-semibold">Dịch vụ</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {(services ?? []).map((s) => (
          <li key={s.id} className="rounded-md border border-[var(--line)] p-3">
            <ActionForm action={saveService} submit="Lưu">
              <input type="hidden" name="id" value={s.id} />
              <ServiceFields s={s} />
            </ActionForm>
          </li>
        ))}
      </ul>
      <h3 className="mt-4 text-sm font-semibold">Thêm dịch vụ</h3>
      <ActionForm action={saveService} submit="Thêm" className="mt-2 flex flex-wrap items-end gap-2">
        <input type="hidden" name="entityId" value={entityId} />
        <input type="hidden" name="locationId" value={locationId} />
        <ServiceFields />
      </ActionForm>
    </section>
  );
}
