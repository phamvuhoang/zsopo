import { CHAKRAS, CHAKRA_LABEL } from "@zsopo/core";
import { Price, StatusBadge } from "@zsopo/ui";
import { ActionForm, Field, inputCls } from "@/components/action-form";
import { CalendarFeeds } from "@/features/stay/components/calendar-feeds";
import { blockRoom, deactivateRate, publishPolicy, releaseBlock, saveEnergy, saveRate, setSellable } from "@/features/stay/actions";
import { getStaffContext } from "@/lib/auth/context";
import { requirePermission } from "@/lib/auth/require-permission";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export const metadata = { title: "Điểm Đà Lạt" };

const DOW = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const KIND = { base: "Giá cơ bản", weekday: "Theo thứ", season: "Theo mùa", date: "Ngày cụ thể/lễ" } as const;

export default async function LocationAdmin() {
  const ctx = await getStaffContext("/admin/diem/da-lat");
  const { entity_id: entityId, id: locationId } = ctx.location;
  await requirePermission("room.manage", entityId, locationId, "/admin/diem/da-lat");
  const db = await createClient();
  const [{ data: rooms }, { data: rates }, { data: blocks }, { data: policy }] = await Promise.all([
    db.schema("stay").from("rooms").select("id, code, slug, name, room_type, sellable, max_guests, energy_card_id").eq("location_id", locationId).order("sort"),
    db.schema("stay").from("rate_plans").select("id, room_id, kind, dow, date_range, price, extra_adult_fee, extra_child_fee, label").eq("location_id", locationId).eq("active", true),
    db.schema("stay").from("room_blocks").select("id, room_id, kind, arrival, departure, reason").eq("location_id", locationId).is("released_at", null).order("arrival"),
    db.schema("ops_config").rpc("current_policy", { p_location: locationId, p_kind: "stay" }),
  ]);
  const cardIds = (rooms ?? []).map((r) => r.energy_card_id).filter((x): x is string => !!x);
  const { data: cards } = cardIds.length ? await db.schema("core").from("energy_cards").select("*").in("id", cardIds) : { data: [] };
  const cardById = new Map((cards ?? []).map((c) => [c.id, c]));
  const roomName = new Map((rooms ?? []).map((r) => [r.id, `${r.code} ${r.name}`]));
  const params = (policy?.params ?? {}) as Record<string, number | string>;

  return (
    <>
      <h1 className="text-2xl font-semibold">{ctx.location.name}</h1>
      <p className="mt-1 text-sm text-[var(--ink-2)]">
        {(rooms ?? []).length} phòng, {(rooms ?? []).filter((r) => r.sellable).length} đang mở bán. Mọi thay đổi giá, lịch và chính sách được ghi nhật ký.
      </p>

      <section className="mt-8" aria-labelledby="chinh-sach">
        <h2 id="chinh-sach" className="text-lg font-semibold">Chính sách đặt phòng (phiên bản {policy?.version ?? "chưa có"})</h2>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Cọc {Number(params.deposit_rate_bp ?? 0) / 100}%, giữ chỗ {params.hold_minutes} phút, báo giá hiệu lực {params.quote_ttl_minutes} phút.
          {!policy?.approved_by && " Chưa có người duyệt: không dùng làm chính sách chính thức."}
        </p>
        <ActionForm action={publishPolicy} submit="Phát hành phiên bản mới" className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="locationId" value={locationId} />
          <input type="hidden" name="current" value={JSON.stringify(params)} />
          <Field label="Cọc (%)"><input name="depositPct" type="number" min={30} max={50} defaultValue={Number(params.deposit_rate_bp ?? 3000) / 100} className={`${inputCls} w-24`} /></Field>
          <Field label="Giữ chỗ (phút)"><input name="holdMinutes" type="number" min={10} max={120} defaultValue={Number(params.hold_minutes ?? 30)} className={`${inputCls} w-24`} /></Field>
          <Field label="Tóm tắt hiển thị cho khách"><input name="summary" defaultValue={policy?.summary_md ?? ""} className={`${inputCls} w-96 max-w-full`} /></Field>
        </ActionForm>
      </section>

      <section className="mt-10" aria-labelledby="phong">
        <h2 id="phong" className="text-lg font-semibold">Phòng và giá</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {(rooms ?? []).map((room) => {
            const roomRates = (rates ?? []).filter((r) => r.room_id === room.id);
            const base = roomRates.find((r) => r.kind === "base");
            const card = room.energy_card_id ? cardById.get(room.energy_card_id) : undefined;
            return (
              <li key={room.id} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm">{room.code}</span>
                  <span className="font-semibold">{room.name}</span>
                  <span className="text-sm text-[var(--ink-3)]">{room.room_type} · {room.max_guests} khách</span>
                  {room.sellable ? <StatusBadge tone="success">Đang mở bán</StatusBadge> : <StatusBadge>Không bán</StatusBadge>}
                  {base && <Price value={String(base.price)} className="ml-auto font-semibold" />}
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm underline">Giá, mở bán và bảng năng lượng</summary>
                  <div className="mt-3 grid gap-4">
                    <ActionForm action={setSellable} submit={room.sellable ? "Đóng bán" : "Mở bán"} danger={room.sellable}>
                      <input type="hidden" name="roomId" value={room.id} />
                      <input type="hidden" name="slug" value={room.slug} />
                      <input type="hidden" name="sellable" value={String(!room.sellable)} />
                      <Field label="Lý do"><input name="reason" required className={inputCls} /></Field>
                    </ActionForm>
                    <div>
                      <h3 className="text-sm font-semibold">Giá đang áp dụng</h3>
                      <ul className="mt-1 text-sm">
                        {roomRates.map((r) => (
                          <li key={r.id} className="flex flex-wrap items-center gap-2 py-1">
                            <span>{KIND[r.kind as keyof typeof KIND]}</span>
                            {r.dow != null && <span>{DOW[r.dow]}</span>}
                            {r.date_range ? <span className="font-mono text-xs">{String(r.date_range)}</span> : null}
                            {r.label && <span className="text-[var(--ink-3)]">{r.label}</span>}
                            <Price value={String(r.price)} />
                            {r.kind === "base" && <span className="text-[var(--ink-3)]">phụ thu người lớn <Price value={String(r.extra_adult_fee)} />, trẻ em <Price value={String(r.extra_child_fee)} /></span>}
                            {r.kind !== "base" && (
                              <ActionForm action={deactivateRate} submit="Tắt" danger>
                                <input type="hidden" name="rateId" value={r.id} />
                                <input type="hidden" name="slug" value={room.slug} />
                              </ActionForm>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <ActionForm action={saveRate} submit="Lưu giá">
                      <input type="hidden" name="roomId" value={room.id} />
                      <input type="hidden" name="slug" value={room.slug} />
                      <Field label="Loại">
                        <select name="kind" className={inputCls} defaultValue="weekday">
                          {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </Field>
                      <Field label="Thứ"><select name="dow" className={inputCls}>{DOW.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></Field>
                      <Field label="Từ ngày"><input type="date" name="from" className={inputCls} /></Field>
                      <Field label="Đến ngày (không gồm)"><input type="date" name="to" className={inputCls} /></Field>
                      <Field label="Giá/đêm (đ)"><input name="price" inputMode="numeric" required className={`${inputCls} w-32`} /></Field>
                      <Field label="Phụ thu NL (base)"><input name="extraAdult" inputMode="numeric" defaultValue={base ? String(base.extra_adult_fee) : ""} className={`${inputCls} w-28`} /></Field>
                      <Field label="Phụ thu TE (base)"><input name="extraChild" inputMode="numeric" defaultValue={base ? String(base.extra_child_fee) : ""} className={`${inputCls} w-28`} /></Field>
                      <Field label="Nhãn"><input name="label" className={`${inputCls} w-32`} /></Field>
                    </ActionForm>
                    <ActionForm action={saveEnergy} submit="Lưu bảng năng lượng" className="grid gap-2 md:grid-cols-2">
                      <input type="hidden" name="roomId" value={room.id} />
                      <input type="hidden" name="slug" value={room.slug} />
                      <Field label="Tiêu đề"><input name="title" required defaultValue={card?.title} className={inputCls} /></Field>
                      <Field label="Tần số"><input name="frequency" defaultValue={card?.frequency ?? ""} className={inputCls} /></Field>
                      <Field label="Công dụng"><textarea name="purpose" required defaultValue={card?.purpose} className={inputCls} /></Field>
                      <Field label="Nguồn gốc"><textarea name="origin" required defaultValue={card?.origin} className={inputCls} /></Field>
                      <Field label="Cách dùng / nghi lễ"><textarea name="usage" required defaultValue={card?.usage} className={inputCls} /></Field>
                      <Field label="Video nghi lễ (YouTube)"><input name="ritualVideoUrl" type="url" defaultValue={card?.ritual_video_url ?? ""} className={inputCls} /></Field>
                      <Field label="Đá (phân cách dấu phẩy)"><input name="stones" defaultValue={card?.stones.join(", ")} className={inputCls} /></Field>
                      <Field label="Biểu tượng (phân cách dấu phẩy)"><input name="symbols" defaultValue={card?.symbols.join(", ")} className={inputCls} /></Field>
                      <fieldset className="md:col-span-2">
                        <legend className="text-xs font-medium text-[var(--ink-2)]">Luân xa</legend>
                        <div className="mt-1 flex flex-wrap gap-3">
                          {CHAKRAS.map((c) => (
                            <label key={c} className="flex min-h-11 items-center gap-1 text-sm">
                              <input type="checkbox" name="chakras" value={c} defaultChecked={card?.chakras.includes(c)} /> {CHAKRA_LABEL[c]}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </ActionForm>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <CalendarFeeds locationId={locationId} rooms={(rooms ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name }))} />

      <section className="mt-10" aria-labelledby="khoa-lich">
        <h2 id="khoa-lich" className="text-lg font-semibold">Khóa lịch (bảo trì, chủ dùng)</h2>
        <ActionForm action={blockRoom} submit="Khóa lịch" className="mt-3 flex flex-wrap items-end gap-2">
          <Field label="Phòng">
            <select name="roomId" className={inputCls}>{(rooms ?? []).map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}</select>
          </Field>
          <Field label="Từ ngày"><input type="date" name="from" required className={inputCls} /></Field>
          <Field label="Đến ngày (không gồm)"><input type="date" name="to" required className={inputCls} /></Field>
          <Field label="Loại"><select name="kind" className={inputCls}><option value="maintenance">Bảo trì</option><option value="owner">Chủ dùng</option></select></Field>
          <Field label="Lý do"><input name="reason" required className={inputCls} /></Field>
        </ActionForm>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {(blocks ?? []).length === 0 && <li className="text-[var(--ink-3)]">Chưa có khóa lịch nào.</li>}
          {(blocks ?? []).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{roomName.get(b.room_id)}</span>
              <span>{b.arrival} đến {b.departure}</span>
              <StatusBadge tone={b.kind === "ota" ? "info" : "warning"}>{b.kind === "ota" ? "OTA" : b.kind === "owner" ? "Chủ dùng" : "Bảo trì"}</StatusBadge>
              <span className="text-[var(--ink-3)]">{b.reason}</span>
              {b.kind !== "ota" && (
                <ActionForm action={releaseBlock} submit="Mở lại" danger>
                  <input type="hidden" name="blockId" value={b.id} />
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
