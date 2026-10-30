"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body>
        <main style={{ maxWidth: 560, margin: "96px auto", textAlign: "center", fontFamily: "system-ui" }}>
          <h1>Đã có lỗi xảy ra</h1>
          {error.digest && <p>Mã hỗ trợ: {error.digest}</p>}
          <button onClick={reset}>Thử lại</button>
        </main>
      </body>
    </html>
  );
}
