export const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** Night d is occupied if an allocation overlaps [d 14:00, d+1 12:00) local (+07:00). */
export const coversNight = (range: string, d: string) => {
  const m = range.match(/^[[(]"?([^",]+)"?,"?([^",)\]]+)"?[)\]]$/);
  if (!m) return false;
  const lo = Date.parse(m[1]!.replace(" ", "T").replace(/\+00$/, "Z"));
  const hi = Date.parse(m[2]!.replace(" ", "T").replace(/\+00$/, "Z"));
  const s = Date.parse(`${d}T14:00:00+07:00`);
  const e = Date.parse(`${addDays(d, 1)}T12:00:00+07:00`);
  return lo < e && hi > s;
};
export const fmtTime = (t: string | null) => (t ? new Date(t).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "");
