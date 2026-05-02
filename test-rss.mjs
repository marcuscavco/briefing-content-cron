#!/usr/bin/env node
// Run: node test-rss.mjs

const FEEDS = [
  // Tier 1
  { portal: "The Information", url: "https://theinformation-feed.marcusccoelho.workers.dev" },
  { portal: "Exame", url: "https://exame.com/feed/" },
  // Tier 2 — Internacional
  { portal: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { portal: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
  { portal: "Wired", url: "https://www.wired.com/feed/rss" },
  { portal: "Rest of World", url: "https://restofworld.org/feed/" },
  { portal: "Platformer", url: "https://www.platformer.news/feed" },
  { portal: "Garbage Day", url: "https://www.garbageday.email/feed" },
  { portal: "404 Media", url: "https://www.404media.co/rss/" },
  { portal: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { portal: "Engadget", url: "https://www.engadget.com/rss.xml" },
  { portal: "CNET", url: "https://www.cnet.com/rss/news/" },
  { portal: "TechCrunch", url: "https://techcrunch.com/feed/" },
  // Tier 2 — Brasil
  { portal: "Folha Tec", url: "https://feeds.folha.uol.com.br/tec/rss091.xml" },
  { portal: "Estadão Link", url: "https://www.estadao.com.br/link/feed/" },
  { portal: "InfoMoney", url: "https://www.infomoney.com.br/feed/" },
  { portal: "NeoFeed", url: "https://neofeed.com.br/feed/" },
  { portal: "The Shift", url: "https://www.theshift.info/feed/" },
  { portal: "Núcleo Jornalismo", url: "https://nucleo.jor.br/feed/" },
  { portal: "Mobile Time", url: "https://www.mobiletime.com.br/feed/" },
  { portal: "Convergência Digital", url: "https://www.convergenciadigital.com.br/feed/" },
  { portal: "Tecnoblog", url: "https://tecnoblog.net/feed/" },
];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
};

function isValidFeed(body) {
  return /<(rss|feed|channel|item|entry)\b/i.test(body);
}

function countItems(body) {
  const items = (body.match(/<(item|entry)\b/gi) || []).length;
  return items;
}

function getLatestDate(body) {
  const patterns = [
    /<pubDate>([^<]+)<\/pubDate>/i,
    /<published>([^<]+)<\/published>/i,
    /<updated>([^<]+)<\/updated>/i,
    /<dc:date>([^<]+)<\/dc:date>/i,
  ];
  for (const p of patterns) {
    const m = body.match(p);
    if (m) {
      try {
        const d = new Date(m[1].trim());
        if (!isNaN(d)) return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}`;
      } catch {}
    }
  }
  return "?";
}

async function testFeed(portal, url, useJina = false) {
  const targetUrl = useJina ? `https://r.jina.ai/${url}` : url;
  try {
    const res = await fetch(targetUrl, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    if (res.ok && isValidFeed(body)) {
      return { ok: true, items: countItems(body), date: getLatestDate(body), via: useJina ? "Jina" : "Direto" };
    }
    return { ok: false, status: res.status, body: body.slice(0, 80), via: useJina ? "Jina" : "Direto" };
  } catch (e) {
    return { ok: false, error: e.message, via: useJina ? "Jina" : "Direto" };
  }
}

const results = [];

for (const { portal, url } of FEEDS) {
  process.stdout.write(`Testando ${portal}... `);
  let r = await testFeed(portal, url, false);
  let method = "Direto";
  let status, obs;

  if (r.ok) {
    status = "✅ XML válido";
    obs = `${r.items} itens, último: ${r.date}`;
  } else {
    // Try Jina
    const r2 = await testFeed(portal, url, true);
    if (r2.ok) {
      status = "✅ XML válido";
      method = "Jina";
      obs = `${r2.items} itens, último: ${r2.date}`;
    } else {
      status = "❌ Falhou";
      method = r.error ? "Direto" : `Direto (${r.status}) / Jina (${r2.status || r2.error?.slice(0,40)})`;
      obs = r.error || r.body || "";
    }
  }

  console.log(status);
  results.push({ portal, url, status, method, obs });
}

console.log("\n## Relatório\n");
console.log("| Portal | URL testada | Resultado | Método | Observação |");
console.log("|---|---|---|---|---|");
for (const r of results) {
  console.log(`| ${r.portal} | ${r.url} | ${r.status} | ${r.method} | ${r.obs} |`);
}

const direto = results.filter(r => r.status.includes("✅") && r.method === "Direto");
const jinaOnly = results.filter(r => r.status.includes("✅") && r.method === "Jina");
const failed = results.filter(r => r.status.includes("❌"));

console.log("\n### Feeds que funcionam direto");
direto.forEach(r => console.log(`- ${r.portal}: ${r.url}`));

console.log("\n### Feeds que funcionam só com Jina");
jinaOnly.forEach(r => console.log(`- ${r.portal}: ${r.url}`));

console.log("\n### Feeds que precisam de Worker (❌ mesmo com Jina)");
failed.forEach(r => console.log(`- ${r.portal}: ${r.url}`));
