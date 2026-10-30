import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#noi-dung"
        className="sr-only z-[600] rounded-md bg-[var(--accent)] px-4 py-2 text-[var(--on-accent)] focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Bỏ qua tới nội dung chính
      </a>
      <SiteHeader />
      <main id="noi-dung" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
