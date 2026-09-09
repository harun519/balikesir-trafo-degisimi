import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "Trafo Değişimi",
    version: "10.0",
    updatedAt: "2026-09-09",
  });
}
