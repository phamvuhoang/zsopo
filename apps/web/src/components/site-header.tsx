import { Sheet, SheetClose } from "@zsopo/ui";
import { Menu } from "lucide-react";
import Link from "next/link";
import { FEATURES } from "@/lib/flags";
import { CartLink } from "@/features/shop/cart-link";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/stay", label: "Lưu trú", on: FEATURES.stay },
  { href: "/shop", label: "Shop", on: FEATURES.shop },
  { href: "/blog", label: "Blog", on: FEATURES.blog },
  { href: "/gioi-thieu", label: "Giới thiệu", on: true },
  { href: "/lien-he", label: "Liên hệ", on: true },
].filter((n) => n.on);

export function Logo() {
  return (
    <Link href="/" aria-label="ZSOPO, về trang chủ" className="font-display flex min-h-11 items-center text-xl font-semibold tracking-tight">
      <span>ZS</span>
      <span className="text-[var(--accent)]">PO</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-[100] border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2">
        <Logo />
        <nav aria-label="Chính" className="ml-6 hidden md:block">
          <ul className="flex gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="flex min-h-11 items-center rounded-md px-3 hover:bg-[var(--surface-2)]">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          {FEATURES.cart && <CartLink />}
          <Link href="/dang-nhap" className="hidden min-h-11 items-center rounded-md px-3 hover:bg-[var(--surface-2)] md:flex">
            Đăng nhập
          </Link>
          <div className="md:hidden">
            <Sheet
              title="Menu"
              trigger={
                <button type="button" aria-label="Mở menu" className="grid size-11 place-items-center rounded-full hover:bg-[var(--surface-2)]">
                  <Menu size={22} strokeWidth={1.5} />
                </button>
              }
            >
              <ul className="flex flex-col">
                {[...NAV, { href: "/dang-nhap", label: "Đăng nhập", on: true }].map((n) => (
                  <li key={n.href}>
                    <SheetClose asChild>
                      <Link href={n.href} className="flex min-h-11 items-center rounded-md px-3 text-lg hover:bg-[var(--surface-2)]">
                        {n.label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
