import { McpAgent } from "agents/mcp"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

interface Env {
  PROXY_TOKEN: string
  MCP_OBJECT: DurableObjectNamespace
}

export class RssMcp extends McpAgent<Env> {
  server = new McpServer({
    name: "rss-mcp",
    version: "1.0.0",
  })

  async init() {
    this.server.tool(
      "fetch_rss",
      "Fetch an RSS or Atom feed via the rss-proxy worker. Returns the raw XML body. Use this for any external feed URL — public, paywalled, or token-bearing.",
      {
        url: z.string().url().describe("Full URL of the RSS/Atom feed to fetch."),
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
        return {
          content: [{ type: "text", text: body }],
        }
      }
    )

    this.server.tool(
      "fetch_the_information",
      'Fetch The Information\'s subscriber Atom feed via its dedicated authenticated worker. Returns Atom XML — entries in <entry>, dates in <updated>/<published>, links in <link href="...">.',
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
        return {
          content: [{ type: "text", text: body }],
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
