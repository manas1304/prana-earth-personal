import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/core/logger/pino";

/**
 * GET /api/v1/geocode?address=...
 *
 * Forward-geocodes a free-form address into `{ lat, lon, formattedAddress }`.
 * Used by the predict "Auto-fill The Location" button.
 *
 * Provider strategy:
 *   1. If `GOOGLE_MAPS_API_KEY` is set, hit Google Geocoding API.
 *   2. Otherwise, fall back to OpenStreetMap Nominatim
 *      (https://nominatim.openstreetmap.org/search?format=json&q=...)
 *
 * In offline / no-key environments, return a 503 so the client can
 * surface a friendly "address lookup unavailable" state instead of
 * pretending to succeed.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get("address") ?? "").trim();
    if (!address) {
      return NextResponse.json(
        { success: false, message: "address query parameter is required" },
        { status: 400 }
      );
    }

    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    if (googleKey) {
      const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
      url.searchParams.set("address", address);
      url.searchParams.set("key", googleKey);
      const res = await fetch(url.toString());
      const data: any = await res.json();
      if (data.status === "OK" && data.results?.[0]) {
        const r = data.results[0];
        return NextResponse.json(
          {
            success: true,
            data: {
              lat: r.geometry.location.lat,
              lon: r.geometry.location.lng,
              formattedAddress: r.formatted_address,
              provider: "google",
            },
          },
          { status: 200 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          message: `Google geocoding failed: ${data.status}`,
        },
        { status: 502 }
      );
    }

    // Nominatim fallback
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", address);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "PranaEarth/1.0 (https://pranaearth.com)",
        "Accept-Language": "en",
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Geocoding provider unavailable" },
        { status: 503 }
      );
    }
    const rows: any[] = await res.json();
    if (!rows[0]) {
      return NextResponse.json(
        { success: false, message: "No match for address" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        success: true,
        data: {
          lat: parseFloat(rows[0].lat),
          lon: parseFloat(rows[0].lon),
          formattedAddress: rows[0].display_name,
          provider: "nominatim",
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    logger.error({ err: error }, "Geocoding failed");
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
