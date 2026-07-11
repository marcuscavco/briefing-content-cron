/**
 * Cards de preview de itens coletados (usado na lista de fontes e na coleta
 * ao vivo do modal). Sem hooks — funciona em server e client components.
 */
export type PreviewCardItem = {
  title: string;
  url: string;
  publishedAt: string | null;
  summary?: string | null;
  image?: string | null;
  /** true quando o item bate com os temas do briefing (wizard de adição). */
  relevant?: boolean;
};

function imgSrc(url: string): string {
  // CDN do Instagram bloqueia hotlink — passa pelo nosso proxy allowlisted.
  if (/\.cdninstagram\.com|\.fbcdn\.net/.test(url)) {
    return `/api/img?u=${encodeURIComponent(url)}`;
  }
  return url;
}

export function PreviewCards({ items }: { items: PreviewCardItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
      {items.map((item) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group w-60 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-white/15"
        >
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc(item.image)}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              className="h-28 w-full object-cover"
            />
          )}
          <div className="flex flex-col gap-1.5 p-3.5">
            {item.relevant && (
              <span className="w-max rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] text-amber-300">
                ✦ seu tema
              </span>
            )}
            <p className="line-clamp-2 text-[13px] font-medium leading-snug">{item.title}</p>
            {item.summary && (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
            )}
            <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70">
              {item.publishedAt
                ? new Date(item.publishedAt).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "abrir"}
              {" ↗"}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
