/**
 * Parser de RSS/Atom/RDF + extração de HTML, portado do worker legado
 * `workers/rss-mcp/src/index.ts` (código comprovado em produção pelo cron).
 * Diferenças: janela e caps são parâmetros (por profile), não constantes.
 */
import { XMLParser } from "fast-xml-parser";
import type { FetchedItem } from "./types";

export const DEFAULT_MAX_ITEMS = 60;
export const DEFAULT_MAX_SUMMARY_CHARS = 500;
export const DEFAULT_MAX_HTML_CHARS = 40_000;

export interface ParsedFeed {
  kind: "feed";
  feedTitle: string;
  feedType: "rss" | "atom";
  totalItems: number;
  items: FetchedItem[];
}

export interface ExtractedHtml {
  kind: "html";
  title: string;
  text: string;
  truncated: boolean;
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  cdataPropName: "__cdata",
});

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function textOf(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.__cdata === "string") return obj.__cdata;
    if (typeof obj["#text"] === "string") return obj["#text"] as string;
  }
  return "";
}

export function stripHtml(s: string): string {
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function extractAtomLink(linkNode: unknown): string {
  const links = asArray(linkNode) as Array<Record<string, unknown> | string>;
  if (links.length === 0) return "";
  let alternate = "";
  let firstHref = "";
  for (const l of links) {
    if (typeof l === "string") {
      if (!firstHref) firstHref = l;
      continue;
    }
    const href = typeof l["@_href"] === "string" ? (l["@_href"] as string) : "";
    if (!href) continue;
    const rel = typeof l["@_rel"] === "string" ? (l["@_rel"] as string) : "alternate";
    if (!firstHref) firstHref = href;
    if (rel === "alternate" && !alternate) alternate = href;
  }
  return alternate || firstHref;
}

export interface ParseFeedOptions {
  windowHours?: number; // sem valor = não filtra por data
  maxItems?: number;
  maxSummaryChars?: number;
}

interface RawItemMap {
  title: unknown;
  link: string;
  published: string | null;
  summaryRaw: string;
}

function buildItems(
  rawItems: RawItemMap[],
  { windowHours, maxItems = DEFAULT_MAX_ITEMS, maxSummaryChars = DEFAULT_MAX_SUMMARY_CHARS }: ParseFeedOptions,
): FetchedItem[] {
  const cutoff = windowHours ? Date.now() - windowHours * 60 * 60 * 1000 : null;
  return rawItems
    .map((raw) => {
      const date = parseDate(raw.published);
      return {
        item: {
          title: stripHtml(textOf(raw.title)),
          url: raw.link,
          publishedAt: date ? date.toISOString() : raw.published,
          summary: truncate(stripHtml(raw.summaryRaw), maxSummaryChars),
        } satisfies FetchedItem,
        ts: date ? date.getTime() : 0,
      };
    })
    .filter(({ ts }) => cutoff === null || ts === 0 || ts >= cutoff)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, maxItems)
    .map(({ item }) => item);
}

export function parseFeed(xml: string, options: ParseFeedOptions = {}): ParsedFeed | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(xml) as Record<string, unknown>;
  } catch {
    return null;
  }

  const rss = parsed.rss as Record<string, unknown> | undefined;
  const atom = parsed.feed as Record<string, unknown> | undefined;
  const rdf = parsed["rdf:RDF"] as Record<string, unknown> | undefined;

  if (rss) {
    const channel = rss.channel as Record<string, unknown> | undefined;
    if (!channel) return null;
    const rawItems = asArray(channel.item) as Array<Record<string, unknown>>;
    const items = buildItems(
      rawItems.map((it) => ({
        title: it.title,
        link: textOf(it.link) || textOf(it.guid),
        published: textOf(it.pubDate) || textOf(it["dc:date"]) || null,
        summaryRaw:
          textOf(it.description) || textOf(it["content:encoded"]) || textOf(it.summary),
      })),
      options,
    );
    return {
      kind: "feed",
      feedTitle: stripHtml(textOf(channel.title)),
      feedType: "rss",
      totalItems: rawItems.length,
      items,
    };
  }

  if (atom) {
    const rawItems = asArray(atom.entry) as Array<Record<string, unknown>>;
    const items = buildItems(
      rawItems.map((it) => ({
        title: it.title,
        link: extractAtomLink(it.link),
        published: textOf(it.updated) || textOf(it.published) || null,
        summaryRaw: textOf(it.summary) || textOf(it.content),
      })),
      options,
    );
    return {
      kind: "feed",
      feedTitle: stripHtml(textOf(atom.title)),
      feedType: "atom",
      totalItems: rawItems.length,
      items,
    };
  }

  if (rdf) {
    const rawItems = asArray(rdf.item) as Array<Record<string, unknown>>;
    const items = buildItems(
      rawItems.map((it) => ({
        title: it.title,
        link: textOf(it.link),
        published: textOf(it["dc:date"]) || textOf(it.date) || null,
        summaryRaw: textOf(it.description) || textOf(it["content:encoded"]),
      })),
      options,
    );
    return {
      kind: "feed",
      feedTitle: stripHtml(textOf((rdf.channel as Record<string, unknown> | undefined)?.title)),
      feedType: "rss",
      totalItems: rawItems.length,
      items,
    };
  }

  return null;
}

export function extractHtml(html: string, maxChars = DEFAULT_MAX_HTML_CHARS): ExtractedHtml {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? stripHtml(titleMatch[1]) : "";

  let body = html;
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
  if (articleMatch) {
    body = articleMatch[0];
  } else {
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
    if (mainMatch) body = mainMatch[0];
  }

  const text = stripHtml(body);
  return {
    kind: "html",
    title,
    text: truncate(text, maxChars),
    truncated: text.length > maxChars,
  };
}

export function looksLikeXml(body: string, contentType: string): boolean {
  if (/xml|rss|atom/i.test(contentType)) return true;
  const head = body.slice(0, 500).trimStart();
  return head.startsWith("<?xml") || /<(rss|feed|rdf:RDF)[\s>]/i.test(head);
}

/** Descobre a URL do feed declarada no <head> de uma homepage. */
export function discoverFeedUrl(html: string, pageUrl: string): string | null {
  const linkTags = html.match(/<link[^>]+>/gi) ?? [];
  for (const tag of linkTags) {
    if (!/rel=["']?alternate["']?/i.test(tag)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml["']?/i.test(tag)) continue;
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}
