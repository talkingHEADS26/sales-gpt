import { NextResponse } from "next/server";

function parseProjectRefFromUrl(url: string | undefined) {
  if (!url) {
    return null;
  }

  try {
    const host = new URL(url).hostname;
    const [projectRef] = host.split(".");
    return projectRef ?? null;
  } catch {
    return null;
  }
}

function parseProjectRefFromAnonKey(anonKey: string | undefined) {
  if (!anonKey) {
    return null;
  }

  const parts = anonKey.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { ref?: string };
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const projectRefFromUrl = parseProjectRefFromUrl(supabaseUrl);
  const projectRefFromAnonKey = parseProjectRefFromAnonKey(anonKey);

  return NextResponse.json({
    isConsistent:
      Boolean(projectRefFromUrl) &&
      Boolean(projectRefFromAnonKey) &&
      projectRefFromUrl === projectRefFromAnonKey,
    projectRefFromAnonKey,
    projectRefFromUrl,
    supabaseUrl,
  });
}
