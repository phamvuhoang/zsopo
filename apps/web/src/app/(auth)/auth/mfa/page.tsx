import { Suspense } from "react";
import { safeRedirectPath } from "@zsopo/core";
import { requireUser } from "@/lib/auth/require-permission";
import { MfaForm } from "./mfa-form";

export const metadata = { title: "Xác thực hai lớp" };

export default function MfaPage({ searchParams }: PageProps<"/auth/mfa">) {
  return (
    <Suspense fallback={<h1 className="text-3xl font-semibold">Xác thực hai lớp</h1>}>
      <Mfa searchParams={searchParams} />
    </Suspense>
  );
}

async function Mfa({ searchParams }: Pick<PageProps<"/auth/mfa">, "searchParams">) {
  const sp = await searchParams;
  const next = safeRedirectPath(typeof sp.next === "string" ? sp.next : null, "/admin");
  await requireUser(`/auth/mfa?next=${encodeURIComponent(next)}`);
  return (
    <>
      <h1 className="text-3xl font-semibold">Xác thực hai lớp</h1>
      <p className="mt-2 text-sm">Tác vụ quản trị nhạy cảm yêu cầu mã từ ứng dụng xác thực (Google Authenticator, 1Password, ...).</p>
      <MfaForm next={next} />
    </>
  );
}
