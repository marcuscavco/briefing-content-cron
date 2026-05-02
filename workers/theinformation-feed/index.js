export default {
  async fetch(request, env) {
    const email = env.THE_INFORMATION_EMAIL
    const password = env.THE_INFORMATION_PASSWORD

    if (!email || !password) {
      return new Response('Missing credentials', { status: 500 })
    }

    const credentials = btoa(`${email}:${password}`)

    const response = await fetch('https://www.theinformation.com/subscriber_feed', {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
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
