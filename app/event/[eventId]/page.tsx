"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type BingoCard = {
  id: string;
  cells: (number | null)[][]; // 5x5 grid, null = free space
  selected: boolean[][];
};

type GameData = {
  id: string;
  game_number: number;
  pattern: string;
  status: string;
  called_numbers: number[];
};

type EventData = {
  id: string;
  event_code: string;
  name: string | null;
  status: string;
  games: GameData[];
};

function generateCard(): BingoCard {
  const columns: number[][] = [];
  const ranges = [
    [1, 15], // B
    [16, 30], // I
    [31, 45], // N
    [46, 60], // G
    [61, 75], // O
  ];

  for (const [min, max] of ranges) {
    const pool: number[] = [];
    for (let n = min; n <= max; n++) pool.push(n);
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    columns.push(pool.slice(0, 5));
  }

  const cells: (number | null)[][] = [];
  const selected: boolean[][] = [];

  for (let row = 0; row < 5; row++) {
    const cellRow: (number | null)[] = [];
    const selRow: boolean[] = [];
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) {
        cellRow.push(null); // free space
        selRow.push(true); // auto-selected
      } else {
        cellRow.push(columns[col][row]);
        selRow.push(false);
      }
    }
    cells.push(cellRow);
    selected.push(selRow);
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    cells,
    selected,
  };
}

const BINGO = ["B", "I", "N", "G", "O"];

export default function EventPage() {
  const params = useParams<{ eventId?: string }>();
  const eventCode = params?.eventId ?? "";

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<BingoCard | null>(null);
  const [activeGameIndex, setActiveGameIndex] = useState(0);

  // Fetch event data
  useEffect(() => {
    if (!eventCode) return;

    async function load() {
      try {
        const res = await fetch(
          `/api/public/event-config?eventCode=${encodeURIComponent(eventCode)}`,
        );
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setError(json.error || "Event not found");
          return;
        }
        setEvent(json.event);
      } catch {
        setError("Failed to load event");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventCode]);

  // Generate card once event loads
  useEffect(() => {
    if (!event) return;

    const storageKey = `trad-bingo:card:${eventCode}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        setCard(JSON.parse(saved));
        return;
      } catch {
        /* regenerate */
      }
    }

    const newCard = generateCard();
    setCard(newCard);
    localStorage.setItem(storageKey, JSON.stringify(newCard));
  }, [event, eventCode]);

  const toggleCell = (row: number, col: number) => {
    if (row === 2 && col === 2) return; // free space
    if (!card) return;

    const newSelected = card.selected.map((r) => [...r]);
    newSelected[row][col] = !newSelected[row][col];
    const updated = { ...card, selected: newSelected };
    setCard(updated);
    localStorage.setItem(
      `trad-bingo:card:${eventCode}`,
      JSON.stringify(updated),
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <h1 className="text-2xl font-bold">Loading…</h1>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  const currentGame = event.games[activeGameIndex] ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center">
      <main className="w-full max-w-md px-4 py-6">
        <header className="mb-4 text-center">
          <h1 className="text-2xl font-bold">{event.name ?? "Bingo"}</h1>
          {currentGame && (
            <p className="text-sm text-slate-300 mt-1">
              Game {currentGame.game_number} —{" "}
              {currentGame.pattern.replace("_", " ")}
            </p>
          )}
        </header>

        {event.games.length > 1 && (
          <div className="flex justify-center gap-2 mb-4">
            {event.games.map((g, i) => (
              <button
                key={g.id}
                onClick={() => setActiveGameIndex(i)}
                className={`px-4 py-1 rounded-full text-sm font-medium border transition ${
                  i === activeGameIndex
                    ? "bg-emerald-500 text-black border-emerald-400"
                    : "bg-slate-800 text-slate-100 border-slate-600 hover:bg-slate-700"
                }`}
              >
                Game {g.game_number}
              </button>
            ))}
          </div>
        )}

        {card && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            {/* BINGO header */}
            <div className="grid grid-cols-5 gap-1 mb-1">
              {BINGO.map((letter) => (
                <div
                  key={letter}
                  className="text-center text-lg font-bold text-emerald-400 py-1"
                >
                  {letter}
                </div>
              ))}
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-5 gap-1">
              {card.cells.map((row, rIdx) =>
                row.map((cell, cIdx) => {
                  const isFree = rIdx === 2 && cIdx === 2;
                  const isSelected = card.selected[rIdx][cIdx];

                  return (
                    <button
                      key={`${rIdx}-${cIdx}`}
                      onClick={() => toggleCell(rIdx, cIdx)}
                      disabled={isFree}
                      className={`aspect-square flex items-center justify-center rounded-md text-lg font-semibold border transition ${
                        isFree
                          ? "bg-blue-700/60 border-blue-600 text-blue-100 cursor-default"
                          : isSelected
                            ? "bg-emerald-400/90 text-black border-emerald-200 shadow-lg shadow-emerald-500/30"
                            : "bg-white/10 text-slate-100 border-white/20 hover:bg-white/15"
                      }`}
                    >
                      {isFree ? "FREE" : cell}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
