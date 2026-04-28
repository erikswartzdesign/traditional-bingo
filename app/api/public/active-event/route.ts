import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, event_code, name, status, started_at")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (eventErr || !event) {
    return NextResponse.json(
      { ok: false, error: "No active event" },
      { status: 404 },
    );
  }

  const { data: games } = await supabase
    .from("games")
    .select("id, game_number, pattern, status, called_numbers")
    .eq("event_id", event.id)
    .order("game_number", { ascending: true });

  return NextResponse.json({
    ok: true,
    event: { ...event, games: games ?? [] },
  });
}
