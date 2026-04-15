"use client";

import { useState, useEffect, useCallback } from "react";
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
  expiresAt: number;
};

const CARDS_PER_GAME = 3;
const BINGO = ["B", "I", "N", "G", "O"];

function getExpiryTimestamp(): number {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + 1);
  expiry.setHours(2, 0, 0, 0);
  if (now.getHours() < 2) {
    expiry.setDate(expiry.getDate() - 1);
  }
  return expiry.getTime();
}

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

const InstagramIcon = () => (
  <svg className="w-7 h-7" fill="#FACC15" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-7 h-7" fill="#3B82F6" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const GlobeIcon = () => (
  <svg
    className="w-7 h-7"
    fill="none"
    stroke="#34D399"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.6 9h16.8M3.6 15h16.8"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z"
    />
  </svg>
);

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="text-center py-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-base text-slate-300 hover:text-white transition"
      >
        {icon}
        {label}
      </a>
    </div>
  );
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
        // Check expiry
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(key);
        } else if (parsed.v === 1 && parsed.eventCode === eventCode) {
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
        expiresAt: getExpiryTimestamp(),
      };
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [event, eventCode]);

  // Save on changes
  const saveState = useCallback(
    (next: Record<string, BingoCard[]>) => {
      setCardsByGame(next);
      const state: PlayerState = {
        v: 1,
        eventCode,
        cardsByGame: next,
        savedAt: Date.now(),
        expiresAt: getExpiryTimestamp(),
      };
      localStorage.setItem(storageKey(eventCode), JSON.stringify(state));
    },
    [eventCode],
  );

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

  const currentGame = event?.games[activeGameIndex] ?? null;

  const resetCards = () => {
    if (!currentGame) return;
    const next = { ...cardsByGame };
    const cards = next[currentGame.id];
    if (!cards) return;

    next[currentGame.id] = cards.map((card) => ({
      ...card,
      selected: card.cells.map((row, rIdx) =>
        row.map((_, cIdx) => rIdx === 2 && cIdx === 2),
      ),
    }));

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

  const currentCards = currentGame ? (cardsByGame[currentGame.id] ?? []) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center">
      <main className="w-full max-w-md px-4 py-6">
        <header className="mb-4 text-center">
          <img
            src="/Elation-Ent-V1.png"
            alt="Logo"
            className="mx-auto mb-3 h-30"
          />
        </header>

        {/* Game tabs */}
        {event.games.length > 1 && (
          <div className="flex justify-center gap-2 mb-2 flex-wrap">
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

        {/* Reset button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={resetCards}
            className="px-10 py-1 rounded-full text-sm font-medium border bg-red-600/80 text-white border-red-500 hover:bg-red-500 transition"
          >
            Reset Cards
          </button>
        </div>

        {/* Three stacked cards with social links between them */}
        <div className="space-y-7">
          {currentCards.map((card, cardIndex) => (
            <div key={card.id}>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
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

              {cardIndex === 0 && (
                <SocialLink
                  href="https://www.instagram.com/elationentertainmentco"
                  icon={<InstagramIcon />}
                  label="Follow us on Instagram"
                />
              )}

              {cardIndex === 1 && (
                <SocialLink
                  href="https://www.facebook.com/ElationEntertainment"
                  icon={<FacebookIcon />}
                  label="Like Elation on Facebook"
                />
              )}

              {cardIndex === 2 && (
                <SocialLink
                  href="https://elationentertainment.com"
                  icon={<GlobeIcon />}
                  label="Elation Entertainment Website"
                />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
