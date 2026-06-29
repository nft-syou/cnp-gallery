import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")?.trim();
  if (id && /^\d+$/.test(id)) return NextResponse.redirect(new URL(`/token/${id}`, req.url));
  return NextResponse.redirect(new URL("/", req.url));
}
