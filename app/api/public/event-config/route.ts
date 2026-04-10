import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const eventCode = req.nextUrl.searchParams.get("eventCode");

  if (!eventCode) {
    return NextResponse.json(
      { ok: false, error: "Missing eventCode" },
      { status: 400 },
    );
  }

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, event_code, name, status, venue_id, started_at")
    .eq("event_code", eventCode)
    .single();

  if (eventErr || !event) {
    return NextResponse.json(
      { ok: false, error: "Event not found" },
      { status: 404 },
    );
  }

  const { data: games, error: gamesErr } = await supabase
    .from("games")
    .select("id, game_number, pattern, status, called_numbers")
    .eq("event_id", event.id)
    .order("game_number", { ascending: true });

  if (gamesErr) {
    return NextResponse.json(
      { ok: false, error: "Failed to load games" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    event: { ...event, games: games ?? [] },
  });
}
