import type { Metadata } from "next";
import { getSiteContact } from "@/lib/content";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Thông tin liên hệ ZSOPO và Zen Homestay Đà Lạt.",
  alternates: { canonical: "/lien-he" },
};

export default async function ContactPage() {
  const c = await getSiteContact();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Liên hệ</h1>
      {c ? (
        <address className="mt-6 flex flex-col gap-2 not-italic">
          <span className="font-display text-lg font-semibold">{c.name}</span>
          {c.address && <span>{c.address}</span>}
          {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`}>Điện thoại: {c.phone}</a>}
          {c.email && <a href={`mailto:${c.email}`}>Email: {c.email}</a>}
          {c.zalo && <span>Zalo: {c.zalo}</span>}
          {c.mapsUrl && (
            <a href={c.mapsUrl} rel="noopener noreferrer" target="_blank" className="underline">
              Xem đường đi trên Google Maps
            </a>
          )}
        </address>
      ) : (
        <p className="mt-6">Thông tin liên hệ đang được cập nhật.</p>
      )}
    </div>
  );
}
