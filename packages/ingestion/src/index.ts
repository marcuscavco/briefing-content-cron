import { InstagramConnector, type InstagramFetcher } from "./connectors/instagram";
import { RssConnector } from "./connectors/rss";
import { WebConnector } from "./connectors/web";
import { createTransport, type Transport } from "./transport";
import type { SourceConnector, SourceType } from "./types";

export * from "./types";
export { createTransport } from "./transport";
export type { Transport, TransportResponse } from "./transport";
export { parseFeed, extractHtml, discoverFeedUrl, stripHtml, looksLikeXml } from "./feed-parser";
export { RssConnector } from "./connectors/rss";
export { WebConnector } from "./connectors/web";
export {
  InstagramConnector,
  INSTAGRAM_WINDOW_HOURS_MAX,
  type InstagramFetcher,
  type InstagramPost,
} from "./connectors/instagram";
export { ApifyInstagramFetcher } from "./providers/apify";
export { encryptCredential, decryptCredential } from "./credentials";

export function getConnector(
  type: SourceType,
  transport: Transport = createTransport(),
  instagramFetcher?: InstagramFetcher,
): SourceConnector {
  switch (type) {
    case "rss":
      return new RssConnector(transport);
    case "web":
      return new WebConnector(transport);
    case "instagram":
      return new InstagramConnector(instagramFetcher);
  }
}
