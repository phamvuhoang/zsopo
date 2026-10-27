import { signOut } from "@/app/(auth)/actions";
import { getStaffContext } from "@/lib/auth/context";
import { ROLE_LABEL } from "@/lib/labels";

export const instant = false;
export const metadata = { title: "Ca làm việc" };

export default async function OpsHome() {
  const ctx = await getStaffContext("/ops");
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--ink-3)]">{ctx.location.name}</p>
          <h1 className="text-2xl font-semibold">Xin chào, {ctx.displayName}</h1>
          <ul className="mt-2 flex flex-wrap gap-2">
            {[...new Set(ctx.roles.map((r) => r.role))].map((r) => (
              <li key={r} className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm whitespace-nowrap text-[var(--accent-ink)]">
                {ROLE_LABEL[r] ?? r}
              </li>
            ))}
          </ul>
        </div>
        <form action={signOut}>
          <button className="min-h-11 rounded-md border border-[var(--line)] px-3 text-sm">Đăng xuất</button>
        </form>
      </header>
    </main>
  );
}
