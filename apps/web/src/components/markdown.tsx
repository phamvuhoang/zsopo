import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Safe Markdown: raw HTML is not rendered (no rehype-raw), links get rel attributes. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-zs">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} {...(href?.startsWith("http") ? { rel: "noopener noreferrer", target: "_blank" } : {})}>
              {children}
            </a>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
