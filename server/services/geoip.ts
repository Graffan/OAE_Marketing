import type { Request } from "express";
import axios from "axios";

const GEOIP_TIMEOUT_MS = 5000;
const PRIVATE_IP_PREFIXES = ["127.", "10.", "192.168.", "::1", "::ffff:127."];

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    return first;
  }
  return req.ip ?? "127.0.0.1";
}

export async function resolveCountryCode(req: Request): Promise<string> {
  // Dev-only override: ?country=XX — never active in production
  if (process.env.NODE_ENV !== "production") {
    const override = req.query?.country as string | undefined;
    if (override && /^[A-Za-z]{2}$/.test(override)) {
      return override.toUpperCase();
    }
  }

  const ip = extractIp(req);

  if (isPrivateIp(ip)) {
    console.log(`[GeoIP] private IP detected (${ip}), defaulting to US`);
    return "US";
  }

  try {
    const response = await axios.get(
      `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode,status`,
      { timeout: GEOIP_TIMEOUT_MS }
    );
    const data = response.data as { countryCode?: string; status?: string };
    if (data.status === "success" && data.countryCode) {
      console.log(`[GeoIP] resolved countryCode=${data.countryCode} for IP=${ip}`);
      return data.countryCode;
    }
    console.warn(`[GeoIP] lookup failed for IP=${ip}, status=${data.status}`);
    return "US";
  } catch (err: any) {
    console.warn(`[GeoIP] request error for IP=${ip}: ${err.message}`);
    return "US";
  }
}
