import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/db";
import { tokenImageUrl } from "@/lib/csv";

// Download the original full-resolution artwork. We proxy the origin image
// server-side (no CORS limits) and return it with a Content-Disposition
// attachment header so the browser saves it rather than navigating to it.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const idStr = (await params).id;
  if (!/^\d+$/.test(idStr)) return new NextResponse("bad id", { status: 400 });

  const t = await getToken(Number(idStr));
  if (!t || !t.image_url) return new NextResponse("not found", { status: 404 });

  let res: Response;
  try {
    res = await fetch(tokenImageUrl(t));
  } catch {
    return new NextResponse("upstream fetch failed", { status: 502 });
  }
  if (!res.ok) return new NextResponse("upstream error", { status: 502 });

  const ext = (t.image_url.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const contentType = res.headers.get("content-type") || `image/${ext}`;
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="cnp-${t.token_id}.${ext}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
