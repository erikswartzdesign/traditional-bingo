"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type BingoCard = {
  id: string;
  cells: (number | null)[][];
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
  venue_name: string | null;
  games: GameData[];
};

type PlayerState = {
  v: 1;
  eventCode: string;
  cardsByGame: Record<string, BingoCard[]>;
  savedAt: number;
};

const CARDS_PER_GAME = 3;
const BINGO = ["B", "I", "N", "G", "O"];

function generateCard(): BingoCard {
  const columns: number[][] = [];
  const ranges = [
    [1, 15],
    [16, 30],
    [31, 45],
    [46, 60],
    [61, 75],
  ];

  for (const [min, max] of ranges) {
    const pool: number[] = [];
    for (let n = min; n <= max; n++) pool.push(n);
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
        cellRow.push(null);
        selRow.push(true);
      } else {
        cellRow.push(columns[col][row]);
        selRow.push(false);
      }
    }
    cells.push(cellRow);
    selected.push(selRow);
  }

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`,
    cells,
    selected,
  };
}

function generateCardsForGame(): BingoCard[] {
  return Array.from({ length: CARDS_PER_GAME }, () => generateCard());
}

function storageKey(eventCode: string) {
  return `trad-bingo:state:v1:${eventCode}`;
}

export default function EventPage() {
  const params = useParams<{ eventId?: string }>();
  const eventCode = params?.eventId ?? "";

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [cardsByGame, setCardsByGame] = useState<Record<string, BingoCard[]>>(
    {},
  );

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

  // Load or generate cards
  useEffect(() => {
    if (!event) return;

    const key = storageKey(eventCode);
    const raw = localStorage.getItem(key);
    let restored: Record<string, BingoCard[]> = {};

    if (raw) {
      try {
        const parsed: PlayerState = JSON.parse(raw);
        if (parsed.v === 1 && parsed.eventCode === eventCode) {
          restored = parsed.cardsByGame;
        }
      } catch {
        /* regenerate */
      }
    }

    const updated = { ...restored };
    let changed = false;

    for (const game of event.games) {
      if (!updated[game.id] || updated[game.id].length !== CARDS_PER_GAME) {
        updated[game.id] = generateCardsForGame();
        changed = true;
      }
    }

    setCardsByGame(updated);

    if (changed) {
      const state: PlayerState = {
        v: 1,
        eventCode,
        cardsByGame: updated,
        savedAt: Date.now(),
      };
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [event, eventCode]);

  // Save on changes
  const saveState = (next: Record<string, BingoCard[]>) => {
    setCardsByGame(next);
    const state: PlayerState = {
      v: 1,
      eventCode,
      cardsByGame: next,
      savedAt: Date.now(),
    };
    localStorage.setItem(storageKey(eventCode), JSON.stringify(state));
  };

  const toggleCell = (
    gameId: string,
    cardIndex: number,
    row: number,
    col: number,
  ) => {
    if (row === 2 && col === 2) return;

    const next = { ...cardsByGame };
    const cards = [...(next[gameId] || [])];
    const card = cards[cardIndex];
    if (!card) return;

    const newSelected = card.selected.map((r) => [...r]);
    newSelected[row][col] = !newSelected[row][col];
    cards[cardIndex] = { ...card, selected: newSelected };
    next[gameId] = cards;

    saveState(next);
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
  const currentCards = currentGame ? (cardsByGame[currentGame.id] ?? []) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center">
      <main className="w-full max-w-md px-4 py-6">
        <header className="mb-4 text-center">
          <h1 className="text-2xl font-bold">
            {event.venue_name
              ? `${event.venue_name} Bingo`
              : (event.name ?? "Bingo")}
          </h1>
          {currentGame && (
            <p className="text-sm text-slate-300 mt-1">
              Game {currentGame.game_number} —{" "}
              {currentGame.pattern.replace(/_/g, " ")}
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

        {/* Three stacked cards */}
        <div className="space-y-7">
          {currentCards.map((card, cardIndex) => (
            <div
              key={card.id}
              className="bg-white/5 border border-white/10 rounded-xl p-3"
            >
              <div className="text-center text-xs font-semibold text-slate-400 mb-2">
                Card {cardIndex + 1}
              </div>

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
                        onClick={() =>
                          toggleCell(currentGame!.id, cardIndex, rIdx, cIdx)
                        }
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
          ))}
        </div>
      </main>
    </div>
  );
}
