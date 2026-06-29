import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { TAG_LIST, tagToken } from "@/lib/db";

// Internal revalidation endpoint. The Queue consumer runs OUTSIDE the Next.js
// request lifecycle, so it cannot call revalidateTag() directly (no request
// context / no tag-cache binding in scope). Instead it POSTs here after a
// successful D1 update; this handler runs inside the request lifecycle where
// revalidateTag is valid.
//
// Protected by a shared secret (REVALIDATE_SECRET) so it can only be invoked by
// the consumer, not arbitrary clients. The consumer reaches this route via the
// WORKER_SELF_REFERENCE service binding (same Worker), so it never leaves CF.
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (secret && req.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { tokenId?: unknown };
  try {
    body = (await req.json()) as { tokenId?: unknown };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const id = Number(body.tokenId);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false }, { status: 400 });

  // A token change can shift facet counts / list ordering, so bust the whole
  // gallery tag as well as the single token detail. Next 16 requires a cache-life
  // profile as the second arg; "max" = stale-while-revalidate with the longest
  // stale window (recommended for on-demand invalidation).
  revalidateTag(tagToken(id), "max");
  revalidateTag(TAG_LIST, "max");
  return NextResponse.json({ ok: true });
}
