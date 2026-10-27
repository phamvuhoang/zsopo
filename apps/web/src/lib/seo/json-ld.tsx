import { env } from "@/lib/env";

/** JSON-LD script; "<" is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const abs = (path: string) => `${env.siteUrl}${path}`;
const ORG_ID = () => abs("/#organization");

export const organization = () => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": ORG_ID(), name: "ZSOPO", url: abs("/"), logo: abs("/assets/logo-zsopo-current.jpg") },
    { "@type": "WebSite", "@id": abs("/#website"), name: "ZSOPO", url: abs("/"), inLanguage: "vi", publisher: { "@id": ORG_ID() },
      potentialAction: { "@type": "SearchAction", target: `${abs("/tim-kiem")}?q={query}`, "query-input": "required name=query" } },
  ],
});

export const breadcrumb = (items: [string, string][]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
});

export const article = (p: { slug: string; title: string; excerpt: string; published_at: string; updated_at: string; author_name: string }) => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Article", headline: p.title, description: p.excerpt, datePublished: p.published_at, dateModified: p.updated_at, inLanguage: "vi",
      author: { "@type": "Organization", name: p.author_name }, publisher: { "@id": ORG_ID() }, mainEntityOfPage: abs(`/blog/${p.slug}`) },
    breadcrumb([["Blog", "/blog"], [p.title, `/blog/${p.slug}`]]),
  ],
});

/** Only facts shown on the page: no rating, no invented address. */
export const lodging = (l: { name: string; address: string | null; checkIn: string; checkOut: string; priceFrom: string | null }) => ({
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: l.name, url: abs("/stay/da-lat"), image: abs("/assets/zen-homestay-front.jpg"), checkinTime: l.checkIn, checkoutTime: l.checkOut,
  ...(l.address && !/chờ/.test(l.address) ? { address: { "@type": "PostalAddress", streetAddress: l.address, addressLocality: "Đà Lạt", addressCountry: "VN" } } : {}),
  ...(l.priceFrom ? { priceRange: `Từ ${Number(l.priceFrom).toLocaleString("vi-VN")} đ/đêm` } : {}),
  parentOrganization: { "@id": ORG_ID() },
});

export const hotelRoom = (r: { slug: string; name: string; description: string; maxGuests: number; areaM2: number | null; basePrice: string | null; sellable: boolean }) => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "HotelRoom", name: `Phòng ${r.name}`, description: r.description, url: abs(`/stay/da-lat/phong/${r.slug}`),
      occupancy: { "@type": "QuantitativeValue", maxValue: r.maxGuests },
      ...(r.areaM2 ? { floorSize: { "@type": "QuantitativeValue", value: r.areaM2, unitCode: "MTK" } } : {}),
      containedInPlace: { "@type": "LodgingBusiness", name: "Zen Homestay Đà Lạt", url: abs("/stay/da-lat") } },
    ...(r.sellable && r.basePrice ? [{ "@type": "Offer", priceCurrency: "VND", price: r.basePrice, url: abs(`/stay/da-lat/phong/${r.slug}`), description: "Giá từ, theo đêm" }] : []),
    breadcrumb([["Space", "/stay"], ["Đà Lạt", "/stay/da-lat"], ["Phòng", "/stay/da-lat/phong"], [r.name, `/stay/da-lat/phong/${r.slug}`]]),
  ],
});

export const product = (p: { slug: string; name: string; summary: string; origin: string; variants: { sku: string; price: number }[] }) => ({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Product", name: p.name, description: p.summary, sku: p.variants[0]?.sku, url: abs(`/shop/${p.slug}`), brand: { "@type": "Brand", name: "ZSOPO" },
      countryOfOrigin: p.origin,
      offers: { "@type": "AggregateOffer", priceCurrency: "VND", lowPrice: Math.min(...p.variants.map((v) => v.price)), highPrice: Math.max(...p.variants.map((v) => v.price)), offerCount: p.variants.length } },
    breadcrumb([["Shop", "/shop"], [p.name, `/shop/${p.slug}`]]),
  ],
});
