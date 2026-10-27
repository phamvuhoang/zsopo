"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function MfaForm({ next }: { next: string }) {
  const [factorId, setFactorId] = useState<string>();
  const [qr, setQr] = useState<string>();
  const [secret, setSecret] = useState<string>();
  const [error, setError] = useState<string>();
  const [code, setCode] = useState("");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp.find((f) => f.status === "verified");
      if (verified) return setFactorId(verified.id);
      for (const f of data?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrolled, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `ZSOPO ${Date.now()}` });
      if (error || !enrolled) return setError("Không khởi tạo được xác thực hai lớp. Vui lòng thử lại.");
      setFactorId(enrolled.id);
      setQr(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (error) return setError("Mã không đúng hoặc đã hết hạn.");
    window.location.assign(next);
  }

  return (
    <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
      {qr && (
        <div>
          <p className="text-sm">Quét mã QR bằng ứng dụng xác thực, hoặc nhập khóa thủ công:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Mã QR đăng ký xác thực hai lớp" width={180} height={180} className="mt-2 bg-white p-2" />
          <code className="mt-2 block break-all text-xs">{secret}</code>
        </div>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mã 6 số
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          required
          className="min-h-11 rounded-md border border-[var(--line)] px-3 text-base"
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <button className="min-h-11 rounded-md bg-[var(--accent)] px-4 font-semibold text-[var(--on-accent)]">Xác nhận</button>
    </form>
  );
}
