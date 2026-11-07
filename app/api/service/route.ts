import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/service";
import { apply, load } from "@/lib/store";

export const dynamic = "force-dynamic";

const snapshot = (service: unknown) =>
  NextResponse.json({ service, serverNow: Date.now() });

const unavailable = () =>
  NextResponse.json(
    { error: "Praxis could not read or save this kitchen's data." },
    { status: 500 },
  );

export async function GET() {
  try {
    return snapshot(await load());
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  let body: { action?: Parameters<typeof apply>[0] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body?.action)
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    return snapshot(await apply(body.action));
  } catch (error) {
    if (error instanceof ServiceError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return unavailable();
  }
}
