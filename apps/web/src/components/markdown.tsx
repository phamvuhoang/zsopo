import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const text = (c: React.ReactNode): string => (Array.isArray(c) ? c.map(text).join("") : typeof c === "string" ? c : "");
const youtubeId = (href: string) => href.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)?.[1];

/**
 * Safe Markdown: raw HTML is skipped (no MDX, no script), links get rel attributes.
 * The only embed is YouTube (privacy-enhanced domain), when a paragraph is just the video URL.
 */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-zs">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          h2: ({ children }) => <h2 id={slug(text(children))}>{children}</h2>,
          h3: ({ children }) => <h3 id={slug(text(children))}>{children}</h3>,
          a: ({ href, children }) => {
            const id = href ? youtubeId(href) : undefined;
            if (id && text(children) === href) {
              return <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title="Video YouTube" loading="lazy" allowFullScreen className="aspect-video w-full rounded-md" />;
            }
            return <a href={href} {...(href?.startsWith("http") ? { rel: "noopener noreferrer", target: "_blank" } : {})}>{children}</a>;
          },
          // Markdown images come from the CMS media library (public bucket, alt required); dimensions unknown, so plain <img>.
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => (alt ? <img src={typeof src === "string" ? src : undefined} alt={alt} loading="lazy" className="rounded-md" /> : null),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
