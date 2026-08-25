import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/core/database/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventName, path } = body;

    if (!eventName) {
      return NextResponse.json(
        { success: false, message: "eventName is required" },
        { status: 400 }
      );
    }

    // Extract IP address from request headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || (req as any).ip || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    await prisma.systemEvent.create({
      data: {
        eventName,
        payload: {
          ip,
          path,
          userAgent,
        },
      },
    });

    return NextResponse.json({ success: true, message: "Event tracked successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
