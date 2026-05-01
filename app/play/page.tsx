"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PlayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetCards = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/active-event");
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError("No active bingo event right now. Check back later!");
        setLoading(false);
        return;
      }

      router.push(`/event/${json.event.event_code}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000A3B] to-[#001370] text-slate-100 flex flex-col items-center">
      <main className="w-full max-w-md px-6 py-8 flex flex-col items-center">
        <img
          src="/Elation-Ent-V1.png"
          alt="Elation Entertainment"
          className="mx-auto mb-8 h-30"
        />

        <h1 className="text-3xl font-bold text-center mb-6">
          Welcome to Bingo!
        </h1>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4 text-slate-200 text-base mb-8">
          <p className="font-semibold text-emerald-400 text-lg">How to Play</p>
          <p>
            Tap the button below to get your bingo cards for tonight. You will
            receive 3 cards for each of the 6 games.
          </p>
          <p>
            Listen for the numbers being called and tap the matching squares on
            your cards. The free space in the center is already marked.
          </p>
          <p>
            Use the game buttons at the top to switch between games. Hit Reset
            Cards to clear your selections for the current game.
          </p>
          <p>
            Your cards are saved to your device and will stay until 2:00 AM
            tomorrow, so don't worry if your screen locks or you lose
            connection.
          </p>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleGetCards}
          disabled={loading}
          className="w-full py-4 bg-emerald-500 text-black text-xl font-bold rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Loading..." : "Get My Cards"}
        </button>
      </main>
    </div>
  );
}
