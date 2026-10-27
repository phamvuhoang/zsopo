import { getStaffContext } from "@/lib/auth/context";

export const instant = false;
export const metadata = { title: "Tổng quan" };

export default async function AdminHome() {
  const ctx = await getStaffContext("/admin");
  return (
    <>
      <h1 className="text-2xl font-semibold">Tổng quan</h1>
      <p className="mt-2 text-[var(--ink-2)]">{ctx.location.name}</p>
    </>
  );
}
