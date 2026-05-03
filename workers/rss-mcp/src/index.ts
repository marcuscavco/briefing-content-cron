import { McpAgent } from "agents/mcp"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { XMLParser } from "fast-xml-parser"
import { z } from "zod"

interface Env {
  PROXY_TOKEN: string
  MCP_OBJECT: DurableObjectNamespace
}

const MAX_ITEMS = 60
const MAX_SUMMARY_CHARS = 500
const WINDOW_HOURS = 48
const MAX_HTML_CHARS = 40000

type SlimItem = {
  title: string
  link: string
  published: string | null
  summary: string
}

type FeedResult = {
  kind: "feed"
  feed_title: string
  feed_type: "rss" | "atom"
  total_items: number
  returned_items: number
  window_hours: number
  items: SlimItem[]
}

type HtmlResult = {
  kind: "html"
  title: string
  text: string
  truncated: boolean
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  cdataPropName: "__cdata",
})

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return []
  return Array.isArray(v) ? v : [v]
}

function textOf(node: unknown): string {
  if (node === undefined || node === null) return ""
  if (typeof node === "string") return node
  if (typeof node === "number" || typeof node === "boolean") return String(node)
  if (Array.isArray(node)) return node.map(textOf).join(" ")
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>
    if (typeof obj.__cdata === "string") return obj.__cdata
    if (typeof obj["#text"] === "string") return obj["#text"] as string
  }
  return ""
}

function stripHtml(s: string): string {
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
    .trim()
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1).trimEnd() + "…"
}

function parseDate(raw: string | null): Date | null {
  if (!raw) return null
  const t = Date.parse(raw)
  if (Number.isNaN(t)) return null
  return new Date(t)
}

function extractAtomLink(linkNode: unknown): string {
  const links = asArray(linkNode) as Array<Record<string, unknown> | string>
  if (links.length === 0) return ""
  let alternate = ""
  let firstHref = ""
  for (const l of links) {
    if (typeof l === "string") {
      if (!firstHref) firstHref = l
      continue
    }
    const href = typeof l["@_href"] === "string" ? (l["@_href"] as string) : ""
    if (!href) continue
    const rel = typeof l["@_rel"] === "string" ? (l["@_rel"] as string) : "alternate"
    if (!firstHref) firstHref = href
    if (rel === "alternate" && !alternate) alternate = href
  }
  return alternate || firstHref
}

function parseFeed(xml: string): FeedResult | null {
  let parsed: Record<string, unknown>
  try {
    parsed = xmlParser.parse(xml) as Record<string, unknown>
  } catch {
    return null
  }

  const rss = parsed.rss as Record<string, unknown> | undefined
  const atom = parsed.feed as Record<string, unknown> | undefined
  const rdf = parsed["rdf:RDF"] as Record<string, unknown> | undefined

  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000

  if (rss) {
    const channel = rss.channel as Record<string, unknown> | undefined
    if (!channel) return null
    const feedTitle = textOf(channel.title)
    const rawItems = asArray(channel.item) as Array<Record<string, unknown>>
    const items = rawItems
      .map((it): { item: SlimItem; ts: number } => {
        const pub = textOf(it.pubDate) || textOf(it["dc:date"]) || null
        const date = parseDate(pub)
        const descRaw =
          textOf(it.description) ||
          textOf(it["content:encoded"]) ||
          textOf(it.summary)
        return {
          item: {
            title: stripHtml(textOf(it.title)),
            link: textOf(it.link) || textOf(it.guid),
            published: date ? date.toISOString() : pub,
            summary: truncate(stripHtml(descRaw), MAX_SUMMARY_CHARS),
          },
          ts: date ? date.getTime() : 0,
        }
      })
      .filter(({ ts }) => ts === 0 || ts >= cutoff)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_ITEMS)
      .map(({ item }) => item)

    return {
      kind: "feed",
      feed_title: stripHtml(feedTitle),
      feed_type: "rss",
      total_items: rawItems.length,
      returned_items: items.length,
      window_hours: WINDOW_HOURS,
      items,
    }
  }

  if (atom) {
    const feedTitle = textOf(atom.title)
    const rawItems = asArray(atom.entry) as Array<Record<string, unknown>>
    const items = rawItems
      .map((it): { item: SlimItem; ts: number } => {
        const pub = textOf(it.updated) || textOf(it.published) || null
        const date = parseDate(pub)
        const descRaw = textOf(it.summary) || textOf(it.content)
        return {
          item: {
            title: stripHtml(textOf(it.title)),
            link: extractAtomLink(it.link),
            published: date ? date.toISOString() : pub,
            summary: truncate(stripHtml(descRaw), MAX_SUMMARY_CHARS),
          },
          ts: date ? date.getTime() : 0,
        }
      })
      .filter(({ ts }) => ts === 0 || ts >= cutoff)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_ITEMS)
      .map(({ item }) => item)

    return {
      kind: "feed",
      feed_title: stripHtml(feedTitle),
      feed_type: "atom",
      total_items: rawItems.length,
      returned_items: items.length,
      window_hours: WINDOW_HOURS,
      items,
    }
  }

  if (rdf) {
    const feedTitle = textOf((rdf.channel as Record<string, unknown> | undefined)?.title)
    const rawItems = asArray(rdf.item) as Array<Record<string, unknown>>
    const items = rawItems
      .map((it): { item: SlimItem; ts: number } => {
        const pub = textOf(it["dc:date"]) || textOf(it.date) || null
        const date = parseDate(pub)
        const descRaw = textOf(it.description) || textOf(it["content:encoded"])
        return {
          item: {
            title: stripHtml(textOf(it.title)),
            link: textOf(it.link),
            published: date ? date.toISOString() : pub,
            summary: truncate(stripHtml(descRaw), MAX_SUMMARY_CHARS),
          },
          ts: date ? date.getTime() : 0,
        }
      })
      .filter(({ ts }) => ts === 0 || ts >= cutoff)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_ITEMS)
      .map(({ item }) => item)

    return {
      kind: "feed",
      feed_title: stripHtml(feedTitle),
      feed_type: "rss",
      total_items: rawItems.length,
      returned_items: items.length,
      window_hours: WINDOW_HOURS,
      items,
    }
  }

  return null
}

function extractHtml(html: string): HtmlResult {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? stripHtml(titleMatch[1]) : ""

  let body = html
  const articleMatch = html.match(/<article[\s\S]*?<\/article>/i)
  if (articleMatch) {
    body = articleMatch[0]
  } else {
    const mainMatch = html.match(/<main[\s\S]*?<\/main>/i)
    if (mainMatch) body = mainMatch[0]
  }

  const text = stripHtml(body)
  const truncated = text.length > MAX_HTML_CHARS
  return {
    kind: "html",
    title,
    text: truncate(text, MAX_HTML_CHARS),
    truncated,
  }
}

function looksLikeXml(body: string, contentType: string): boolean {
  if (/xml|rss|atom/i.test(contentType)) return true
  const head = body.slice(0, 500).trimStart()
  return head.startsWith("<?xml") || /<(rss|feed|rdf:RDF)[\s>]/i.test(head)
}

function shrinkResponse(body: string, contentType: string): string {
  if (looksLikeXml(body, contentType)) {
    const feed = parseFeed(body)
    if (feed) return JSON.stringify(feed)
  }
  const html = extractHtml(body)
  return JSON.stringify(html)
}

export class RssMcp extends McpAgent<Env> {
  server = new McpServer({
    name: "rss-mcp",
    version: "1.1.0",
  })

  async init() {
    this.server.tool(
      "fetch_rss",
      `Fetch an RSS/Atom feed (or any URL) via the rss-proxy worker. Returns slimmed JSON:
- For feeds: {kind:"feed", feed_title, feed_type, total_items, returned_items, window_hours, items:[{title, link, published (ISO 8601), summary}]}. Items are filtered to the last ${WINDOW_HOURS}h, sorted desc, capped at ${MAX_ITEMS}, summaries trimmed to ${MAX_SUMMARY_CHARS} chars.
- For HTML pages (e.g. article URLs for TL;DR): {kind:"html", title, text, truncated}. Text is the stripped article/main body, capped at ${MAX_HTML_CHARS} chars.
Use this for any external feed URL — public, paywalled, or token-bearing — and for fetching individual article pages.`,
      {
        url: z.string().url().describe("Full URL of the RSS/Atom feed or article page to fetch."),
      },
      async ({ url }) => {
        const proxyUrl = `https://rss-proxy.marcusccoelho.workers.dev?token=${this.env.PROXY_TOKEN}&url=${encodeURIComponent(url)}`
        const res = await fetch(proxyUrl)
        const body = await res.text()
        if (!res.ok) {
          return {
            content: [
              {
                type: "text",
                text: `rss-proxy returned ${res.status} for ${url}: ${body.slice(0, 500)}`,
              },
            ],
            isError: true,
          }
        }
        const contentType = res.headers.get("Content-Type") || ""
        return {
          content: [{ type: "text", text: shrinkResponse(body, contentType) }],
        }
      }
    )

    this.server.tool(
      "fetch_the_information",
      `Fetch The Information's subscriber Atom feed via its dedicated authenticated worker. Returns the same slimmed JSON shape as fetch_rss for feeds: {kind:"feed", feed_title, feed_type:"atom", total_items, returned_items, window_hours, items:[{title, link, published, summary}]}.`,
      {},
      async () => {
        const res = await fetch(
          "https://theinformation-feed.marcusccoelho.workers.dev/theinformation-feed"
        )
        const body = await res.text()
        if (!res.ok) {
          return {
            content: [
              {
                type: "text",
                text: `theinformation-feed worker returned ${res.status}: ${body.slice(0, 500)}`,
              },
            ],
            isError: true,
          }
        }
        const contentType = res.headers.get("Content-Type") || ""
        return {
          content: [{ type: "text", text: shrinkResponse(body, contentType) }],
        }
      }
    )
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/mcp") {
      return RssMcp.serve("/mcp").fetch(request, env, ctx)
    }

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return RssMcp.serveSSE("/sse").fetch(request, env, ctx)
    }

    return new Response(
      "rss-mcp — MCP server for briefing-content-cron.\n\nEndpoints:\n  /mcp  (Streamable HTTP)\n  /sse  (SSE)\n",
      { status: 200, headers: { "Content-Type": "text/plain" } }
    )
  },
}
