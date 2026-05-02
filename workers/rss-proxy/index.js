export default {
  async fetch(request, env) {
    const token = env.PROXY_TOKEN

    if (!token) {
      return new Response('Worker misconfigured: missing PROXY_TOKEN', { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const requestToken = searchParams.get('token')
    const targetUrl = searchParams.get('url')

    if (requestToken !== token) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (!targetUrl) {
      return new Response('Missing required parameter: url', { status: 400 })
    }

    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch {
      return new Response('Invalid url parameter', { status: 400 })
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return new Response('Only http/https URLs are allowed', { status: 400 })
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/xml',
        'X-Upstream-Status': String(response.status),
      }
    })
  }
}
