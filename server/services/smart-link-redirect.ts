import type { Request } from "express";
import axios from "axios";
import { db } from "../db.js";
import { smartLinks, regionalDestinations, clickEvents } from "@shared/schema.js";
import { eq, and } from "drizzle-orm";

const GEOIP_TIMEOUT_MS = 3000;
const PRIVATE_IP_PREFIXES = ["127.", "10.", "192.168.", "::1", "::ffff:127."];

interface GeoResult {
  country: string;
  region: string;
  city: string;
}

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  }
  return req.ip ?? "127.0.0.1";
}

function detectPlatform(ua: string): string {
  if (!ua) return "unknown";
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  if (/tablet|ipad/i.test(ua)) return "tablet";
  return "desktop";
}

async function resolveGeo(req: Request): Promise<GeoResult> {
  // Dev override
  if (process.env.NODE_ENV !== "production") {
    const override = req.query?.country as string | undefined;
    if (override && /^[A-Za-z]{2}$/.test(override)) {
      return { country: override.toUpperCase(), region: "", city: "" };
    }
  }

  const ip = extractIp(req);

  if (isPrivateIp(ip)) {
    return { country: "US", region: "", city: "" };
  }

  try {
    const response = await axios.get(
      `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode,regionName,city,status`,
      { timeout: GEOIP_TIMEOUT_MS }
    );
    const data = response.data as {
      countryCode?: string;
      regionName?: string;
      city?: string;
      status?: string;
    };
    if (data.status === "success") {
      return {
        country: data.countryCode ?? "US",
        region: data.regionName ?? "",
        city: data.city ?? "",
      };
    }
    return { country: "US", region: "", city: "" };
  } catch {
    return { country: "US", region: "", city: "" };
  }
}

function parseUtm(query: Record<string, unknown>): {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
} {
  return {
    utmSource: (query.utm_source as string) ?? null,
    utmMedium: (query.utm_medium as string) ?? null,
    utmCampaign: (query.utm_campaign as string) ?? null,
    utmContent: (query.utm_content as string) ?? null,
  };
}

/**
 * Resolve a smart link slug to a destination URL.
 * Returns { url, smartLinkId } or null if not found / inactive.
 */
export async function resolveSmartLink(
  slug: string,
  countryCode: string
): Promise<{ url: string; smartLinkId: number } | null> {
  // Find the smart link
  const [link] = await db
    .select()
    .from(smartLinks)
    .where(and(eq(smartLinks.slug, slug), eq(smartLinks.isActive, true)))
    .limit(1);

  if (!link) return null;

  // Try to find a regional destination
  if (link.titleId) {
    const [dest] = await db
      .select()
      .from(regionalDestinations)
      .where(
        and(
          eq(regionalDestinations.titleId, link.titleId),
          eq(regionalDestinations.countryCode, countryCode),
          eq(regionalDestinations.status, "active")
        )
      )
      .limit(1);

    if (dest) {
      return { url: dest.destinationUrl, smartLinkId: link.id };
    }
  }

  // Fallback to default URL
  return { url: link.defaultUrl, smartLinkId: link.id };
}

/**
 * Handle a smart link redirect request: geo-resolve, find destination, log click, redirect.
 */
export async function handleSmartLinkRedirect(
  req: Request,
  slug: string
): Promise<{ redirectUrl: string } | { error: string; status: number }> {
  const geo = await resolveGeo(req);
  const result = await resolveSmartLink(slug, geo.country);

  if (!result) {
    return { error: "Link not found", status: 404 };
  }

  // Append tracking params from the smart link template
  let finalUrl = result.url;
  const utm = parseUtm(req.query as Record<string, unknown>);

  // Build destination URL with any UTM params passed through
  try {
    const url = new URL(finalUrl);
    if (utm.utmSource) url.searchParams.set("utm_source", utm.utmSource);
    if (utm.utmMedium) url.searchParams.set("utm_medium", utm.utmMedium);
    if (utm.utmCampaign) url.searchParams.set("utm_campaign", utm.utmCampaign);
    if (utm.utmContent) url.searchParams.set("utm_content", utm.utmContent);
    finalUrl = url.toString();
  } catch {
    // If URL parsing fails, use as-is
  }

  // Log click event (fire-and-forget)
  const ip = extractIp(req);
  const ua = req.headers["user-agent"] ?? "";
  db.insert(clickEvents)
    .values({
      smartLinkId: result.smartLinkId,
      slug,
      ip: isPrivateIp(ip) ? null : ip,
      country: geo.country,
      region: geo.region || null,
      city: geo.city || null,
      userAgent: ua || null,
      referer: (req.headers.referer ?? null) as string | null,
      platform: detectPlatform(ua),
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmContent: utm.utmContent,
      destinationUrl: finalUrl,
    } as any)
    .execute()
    .catch((err) => console.error("[SmartLink] click tracking error:", err));

  return { redirectUrl: finalUrl };
}
