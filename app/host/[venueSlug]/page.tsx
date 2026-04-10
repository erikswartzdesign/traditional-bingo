"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GameRow = {
  id: string;
  game_number: number;
  pattern: string;
  status: string;
  called_numbers: number[];
};

type EventRow = {
  id: string;
  event_code: string;
  name: string | null;
  status: string;
  started_at: string | null;
  games: GameRow[];
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

function generateBall(calledNumbers: number[]): number | null {
  const all = Array.from({ length: 75 }, (_, i) => i + 1);
  const remaining = all.filter((n) => !calledNumbers.includes(n));
  if (remaining.length === 0) return null;
  return remaining[Math.floor(Math.random() * remaining.length)];
}

function getBallLabel(n: number): string {
  if (n <= 15) return `B-${n}`;
  if (n <= 30) return `I-${n}`;
  if (n <= 45) return `N-${n}`;
  if (n <= 60) return `G-${n}`;
  return `O-${n}`;
}

const BINGO_LETTERS = ["B", "I", "N", "G", "O"];

export default function HostDashboardPage() {
  const params = useParams<{ venueSlug?: string }>();
  const venueSlug = params?.venueSlug ?? "";

  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalledBall, setLastCalledBall] = useState<number | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

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
      .select("id, event_code, name, status, started_at")
      .eq("venue_id", venueData.id)
      .eq("status", "active")
      .limit(1);

    if (events && events.length > 0) {
      const evt = events[0];
      const { data: games } = await supabase
        .from("games")
        .select("id, game_number, pattern, status, called_numbers")
        .eq("event_id", evt.id)
        .order("game_number", { ascending: true });

      const full: EventRow = { ...evt, games: games ?? [] };
      setActiveEvent(full);

      const active = full.games.find((g) => g.status === "active");
      if (active) setActiveGameId(active.id);
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
        name: `Bingo Night`,
        status: "active",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (evtErr || !evt) {
      setError("Failed to create event");
      return;
    }

    const gamesToInsert = [
      { event_id: evt.id, game_number: 1, pattern: "line", status: "waiting" },
      { event_id: evt.id, game_number: 2, pattern: "line", status: "waiting" },
      {
        event_id: evt.id,
        game_number: 3,
        pattern: "four_corners",
        status: "waiting",
      },
      {
        event_id: evt.id,
        game_number: 4,
        pattern: "x_pattern",
        status: "waiting",
      },
      {
        event_id: evt.id,
        game_number: 5,
        pattern: "full_card",
        status: "waiting",
      },
    ];

    await supabase.from("games").insert(gamesToInsert);
    await loadData();
  };

  const startGame = async (gameId: string) => {
    await supabase.from("games").update({ status: "active" }).eq("id", gameId);

    setActiveGameId(gameId);
    setLastCalledBall(null);
    await loadData();
  };

  const callBall = async () => {
    if (!activeGameId || !activeEvent) return;

    const game = activeEvent.games.find((g) => g.id === activeGameId);
    if (!game) return;

    const ball = generateBall(game.called_numbers);
    if (ball === null) return;

    const updated = [...game.called_numbers, ball];

    await supabase
      .from("games")
      .update({ called_numbers: updated })
      .eq("id", activeGameId);

    setLastCalledBall(ball);
    await loadData();
  };

  const endGame = async (gameId: string) => {
    await supabase
      .from("games")
      .update({ status: "completed" })
      .eq("id", gameId);

    if (activeGameId === gameId) {
      setActiveGameId(null);
      setLastCalledBall(null);
    }
    await loadData();
  };

  const endEvent = async () => {
    if (!activeEvent) return;

    await supabase
      .from("events")
      .update({ status: "completed" })
      .eq("id", activeEvent.id);

    setActiveEvent(null);
    setActiveGameId(null);
    setLastCalledBall(null);
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

  const activeGame =
    activeEvent?.games.find((g) => g.id === activeGameId) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100">
      <main className="w-full max-w-4xl mx-auto px-4 py-6">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-bold">{venue.name}</h1>
          <p className="text-sm text-slate-300">Host Dashboard</p>
        </header>

        {/* No active event */}
        {!activeEvent && (
          <div className="text-center">
            <p className="text-slate-300 mb-4">No active event.</p>
            <button
              onClick={createEvent}
              className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition"
            >
              Create & Start Event
            </button>
          </div>
        )}

        {/* Active event */}
        {activeEvent && (
          <div className="space-y-6">
            <div className="bg-white/10 border border-white/15 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold">{activeEvent.name}</h2>
                  <p className="text-sm text-slate-300">
                    Code: {activeEvent.event_code}
                  </p>
                </div>
                <button
                  onClick={endEvent}
                  className="px-4 py-2 bg-red-900 text-red-50 text-sm font-semibold rounded-md border border-red-800 hover:bg-red-800 transition"
                >
                  End Event
                </button>
              </div>

              {/* Game tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {activeEvent.games.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGameId(g.id);
                      setLastCalledBall(null);
                    }}
                    className={`px-4 py-1 rounded-full text-sm font-medium border transition ${
                      g.id === activeGameId
                        ? "bg-emerald-500 text-black border-emerald-400"
                        : g.status === "completed"
                          ? "bg-slate-900 text-slate-500 border-slate-700"
                          : "bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700"
                    }`}
                  >
                    Game {g.game_number}
                    {g.status === "completed" && " ✓"}
                  </button>
                ))}
              </div>
            </div>

            {/* Active game controls */}
            {activeGame && (
              <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    Game {activeGame.game_number} —{" "}
                    {activeGame.pattern.replace("_", " ")}
                  </h3>
                  <span className="text-sm text-slate-300">
                    {activeGame.called_numbers.length} / 75 called
                  </span>
                </div>

                {activeGame.status === "waiting" && (
                  <button
                    onClick={() => startGame(activeGame.id)}
                    className="w-full py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition"
                  >
                    Start Game {activeGame.game_number}
                  </button>
                )}

                {activeGame.status === "active" && (
                  <>
                    {/* Last called ball */}
                    {lastCalledBall && (
                      <div className="text-center mb-4">
                        <div className="text-6xl font-black text-emerald-400">
                          {getBallLabel(lastCalledBall)}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mb-4">
                      <button
                        onClick={callBall}
                        className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition text-lg"
                      >
                        Call Ball
                      </button>
                      <button
                        onClick={() => endGame(activeGame.id)}
                        className="px-4 py-3 bg-red-900 text-red-50 font-semibold rounded-lg border border-red-800 hover:bg-red-800 transition"
                      >
                        End Game
                      </button>
                    </div>

                    {/* Called numbers board */}
                    <div className="space-y-2">
                      {BINGO_LETTERS.map((letter, lIdx) => {
                        const min = lIdx * 15 + 1;
                        const max = min + 14;
                        return (
                          <div key={letter} className="flex items-center gap-1">
                            <span className="w-6 text-center font-bold text-emerald-400">
                              {letter}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {Array.from(
                                { length: 15 },
                                (_, i) => min + i,
                              ).map((n) => {
                                const called =
                                  activeGame.called_numbers.includes(n);
                                return (
                                  <span
                                    key={n}
                                    className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold ${
                                      called
                                        ? "bg-emerald-400 text-black"
                                        : "bg-white/10 text-slate-400"
                                    }`}
                                  >
                                    {n}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {activeGame.status === "completed" && (
                  <p className="text-center text-slate-400">
                    This game is complete.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
