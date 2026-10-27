import Image from "next/image";
import Link from "next/link";
import { FEATURES } from "@/lib/flags";

export default function Home() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-2 md:py-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[var(--accent-ink)] uppercase">Năng lượng trao truyền · Hạnh phúc sâu · Khai mở tiềm năng</p>
          <h1 className="mt-4 text-4xl leading-tight font-semibold md:text-5xl">Một hệ sinh thái để bạn trở về với chính mình.</h1>
          <p className="mt-5 text-lg text-[var(--ink-2)]">Nghỉ ngơi trong không gian năng lượng ở Đà Lạt, mang nghi thức về nhà qua những sản phẩm có bảng năng lượng rõ ràng, và đồng hành cùng cộng đồng phụng sự.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={FEATURES.stay ? "/stay/da-lat" : "/lien-he"}
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--accent)] px-5 font-semibold text-[var(--on-accent)] hover:bg-[var(--accent-hover)]"
            >
              {FEATURES.stay ? "Đặt phòng Zen Homestay" : "Liên hệ đặt phòng"}
            </Link>
            <Link href="/gioi-thieu" className="inline-flex min-h-11 items-center rounded-md border border-[var(--line-2)] px-5 font-semibold hover:bg-[var(--surface-2)]">
              Tìm hiểu ZSOPO
            </Link>
          </div>
        </div>
        <figure className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)]">
          <Image
            src="/assets/zen-homestay-front.jpg"
            alt="Mặt tiền Zen Homestay Đà Lạt, nhà gỗ giữa đồi thông"
            width={2048}
            height={1364}
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-auto w-full"
          />
          <figcaption className="p-4">
            <p className="text-xs font-semibold tracking-wide text-[var(--wood)] uppercase">ZSOPO Space</p>
            <p className="font-display text-lg font-semibold">Zen Homestay Đà Lạt</p>
            <p className="text-sm text-[var(--ink-2)]">Nhà gỗ giữa đồi thông. Giờ nhận phòng 14:00, trả phòng trước 12:00.</p>
          </figcaption>
        </figure>
      </section>

      <section aria-labelledby="tru-cot" className="mx-auto max-w-6xl px-4 py-10">
        <h2 id="tru-cot" className="text-2xl font-semibold">Ba trụ cột</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { k: "Space", c: "var(--wood)", t: "Không gian lưu trú và trải nghiệm năng lượng, bắt đầu từ Zen Homestay Đà Lạt." },
            { k: "Connect", c: "var(--accent)", t: "Học tập, chuyên gia và sự kiện. Đang chuẩn bị, sẽ mở theo từng giai đoạn." },
            { k: "Give", c: "var(--olive)", t: "Thiện nguyện và cộng đồng phụng sự, công bố minh bạch khi chương trình sẵn sàng." },
          ].map((p) => (
            <li key={p.k} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] p-5">
              <h3 className="font-display text-lg font-semibold" style={{ color: p.c }}>
                {p.k}
              </h3>
              <p className="mt-2 text-sm text-[var(--ink-2)]">{p.t}</p>
            </li>
          ))}
        </ul>
        <Link href="/gioi-thieu" className="mt-6 inline-flex min-h-11 items-center underline">
          Đọc giới thiệu ba trụ cột
        </Link>
      </section>
    </>
  );
}
