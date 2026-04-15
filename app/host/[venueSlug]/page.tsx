"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type EventRow = {
  id: string;
  event_code: string;
  status: string;
  started_at: string | null;
};

type VenueRow = {
  id: string;
  name: string;
  slug: string;
};

function generateEventCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function HostDashboardPage() {
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";

  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!venueSlug) return;

    const { data: venueData, error: venueErr } = await supabase
      .from("venues")
      .select("id, name, slug")
      .eq("slug", venueSlug)
      .single();

    if (venueErr || !venueData) {
      setError("Venue not found");
      setLoading(false);
      return;
    }

    setVenue(venueData);

    const { data: events } = await supabase
      .from("events")
      .select("id, event_code, status, started_at")
      .eq("venue_id", venueData.id)
      .eq("status", "active")
      .limit(1);

    if (events && events.length > 0) {
      setActiveEvent(events[0]);
    }

    setLoading(false);
  }, [venueSlug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createEvent = async () => {
    if (!venue) return;

    const code = generateEventCode();

    const { data: evt, error: evtErr } = await supabase
      .from("events")
      .insert({
        venue_id: venue.id,
        event_code: code,
        name: "Bingo Night",
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (evtErr || !evt) {
      setError("Failed to create event");
      return;
    }

    const games = [];
    for (let i = 1; i <= 6; i++) {
      games.push({
        event_id: evt.id,
        game_number: i,
        pattern: "standard",
        status: "active",
      });
    }

    await supabase.from("games").insert(games);
    await loadData();
  };

  const endEvent = async () => {
    if (!activeEvent) return;

    await supabase
      .from("games")
      .update({ status: "completed" })
      .eq("event_id", activeEvent.id);

    await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", activeEvent.id);

    setActiveEvent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <h1 className="text-2xl font-bold">Loading…</h1>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Venue not found</h1>
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100">
      <main className="w-full max-w-md mx-auto px-4 py-6">
        <header className="mb-8 text-center">
          <img
            src="/Elation-Ent-V1.png"
            alt="Logo"
            className="mx-auto mb-3 h-30"
          />
          <h1 className="text-3xl font-bold">Bingo Admin</h1>
        </header>

        <div className="bg-white/10 border border-white/15 rounded-xl p-6 space-y-6">
          {activeEvent ? (
            <>
              <div className="text-center space-y-2">
                <div className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full">
                  <span className="text-emerald-400 text-sm font-semibold">
                    Event Active
                  </span>
                </div>
                <p className="text-slate-300 text-sm">
                  Code:{" "}
                  <span className="font-mono font-bold text-white">
                    {activeEvent.event_code}
                  </span>
                </p>
                <p className="text-slate-400 text-xs">
                  Player URL: /event/{activeEvent.event_code}
                </p>
              </div>

              <button
                onClick={endEvent}
                className="w-full py-3 bg-red-900 text-red-50 font-bold rounded-lg border border-red-800 hover:bg-red-800 transition"
              >
                End Event
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="inline-block px-3 py-1 bg-slate-700/50 border border-slate-600 rounded-full">
                  <span className="text-slate-400 text-sm font-semibold">
                    No Active Event
                  </span>
                </div>
              </div>

              <button
                onClick={createEvent}
                className="w-full py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition"
              >
                Create New Event
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
