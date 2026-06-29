import { NextRequest, NextResponse } from "next/server";
import { parseFilters } from "@/lib/filters";
import { listTokens } from "@/lib/db";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const filters = parseFilters(params);
  const tokens = await listTokens(filters, 48);
  return NextResponse.json({ tokens });
}
