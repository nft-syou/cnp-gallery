import { NextRequest, NextResponse } from "next/server";
import { queue } from "@/lib/db";

// Button-triggered metadata refresh. Enqueues a sync job for the given token;
// the Queue consumer (src/queue/consumer.ts) fetches the source JSON, diffs it
// against D1, and invalidates the relevant cache tags.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ ok: false }, { status: 400 });
  await queue().send({ tokenId: id });
  return NextResponse.json({ ok: true });
}
