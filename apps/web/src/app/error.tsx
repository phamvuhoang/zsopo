"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold">Đã có lỗi xảy ra</h1>
      <p className="mt-4">Vui lòng thử lại. Nếu lỗi lặp lại, gửi mã hỗ trợ cho chúng tôi.</p>
      {error.digest && <p className="mt-2 font-mono text-sm">Mã hỗ trợ: {error.digest}</p>}
      <button className="mt-8 underline" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
