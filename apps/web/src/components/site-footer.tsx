import { ENERGY_DISCLAIMER } from "@zsopo/ui";
import Link from "next/link";
import { getSiteContact, listPublishedPolicies } from "@/lib/content";
import { FEATURES } from "@/lib/flags";
import { Logo } from "./site-header";

export async function SiteFooter() {
  const [contact, policies] = await Promise.all([getSiteContact(), listPublishedPolicies()]);
  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-2 text-sm text-[var(--ink-2)]">Minh Triết - Năng Lượng - Hưng Thịnh</p>
          {contact && (
            <address className="mt-3 text-sm text-[var(--ink-2)] not-italic">
              {contact.name}
              {contact.address && <div>{contact.address}</div>}
              {contact.phone && <div>Điện thoại: {contact.phone}</div>}
              {contact.email && <div>Email: {contact.email}</div>}
            </address>
          )}
        </div>
        <FooterCol title="Space">
          {FEATURES.stay ? <FooterLink href="/stay/da-lat">Zen Homestay Đà Lạt</FooterLink> : <li className="text-sm text-[var(--ink-2)]">Zen Homestay Đà Lạt</li>}
          {FEATURES.shop && <FooterLink href="/shop">Shop năng lượng</FooterLink>}
        </FooterCol>
        <FooterCol title="ZSOPO">
          <FooterLink href="/gioi-thieu">Giới thiệu</FooterLink>
          <FooterLink href="/lien-he">Liên hệ</FooterLink>
          {FEATURES.blog && <FooterLink href="/blog">Blog</FooterLink>}
        </FooterCol>
        <FooterCol title="Chính sách">
          {policies.map((p) => (
            <FooterLink key={p.slug} href={`/chinh-sach/${p.slug}`}>
              {p.title}
            </FooterLink>
          ))}
        </FooterCol>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-[var(--ink-3)]">© ZSOPO. {ENERGY_DISCLAIMER}</p>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 flex flex-col gap-1">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="inline-flex min-h-8 items-center text-sm text-[var(--ink-2)] hover:text-[var(--ink)] hover:underline">
        {children}
      </Link>
    </li>
  );
}
