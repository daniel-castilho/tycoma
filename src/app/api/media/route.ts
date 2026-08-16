import { NextResponse } from "next/server";
import { media } from "@/app/_lib/modules";
import { getRedis } from "@/shared/cache/redis";
import { currentSession } from "@/app/admin/_lib/session";
import { clientIp } from "@/app/admin/_lib/session-cookie";

export const dynamic = "force-dynamic";

/**
 * Phase B: rate limit media uploads per (userId, ip) pair. Budget: 30 requests
 * per 15 minutes. Tunable via the constants below.
 */
const UPLOAD_RATE_LIMIT = 30;
const UPLOAD_RATE_WINDOW_SECONDS = 60 * 15;

async function checkUploadRate(userId: string, ip: string): Promise<boolean> {
  const key = `upload:${userId}:${ip}`;
  const redis = getRedis();
  const n = await redis.incr(key);
  if (n === 1) {
    await redis.expire(key, UPLOAD_RATE_WINDOW_SECONDS);
  }
  return n <= UPLOAD_RATE_LIMIT;
}

export async function POST(request: Request) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(request.headers);
  const allowed = await checkUploadRate(session.sub, ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many uploads. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided." }, { status: 400 });
  }

  const uploaded = [];
  for (const file of files) {
    const body = new Uint8Array(await file.arrayBuffer());
    const result = await media.uploadMedia(
      {
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        body,
      },
      session.sub,
    );
    if (!result.ok) {
      uploaded.push({ filename: file.name, error: result.error });
    } else {
      uploaded.push({ filename: file.name, id: result.value.id, url: result.value.url });
    }
  }

  return NextResponse.json({ uploaded });
}