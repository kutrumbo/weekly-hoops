"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updatePlayerSettings } from "@/app/actions";
import Nav from "@/components/Nav";
import type { Player } from "@/lib/types";

export default function SettingsPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [name, setName] = useState("");
  const [autoIn, setAutoIn] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setPlayer(data as Player);
        setName(data.name);
        setAutoIn(data.auto_in);
      }
    };
    load();
  }, []);

  const handleSave = () => {
    setSaved(false);
    startTransition(async () => {
      await updatePlayerSettings({ name, auto_in: autoIn });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  if (!player) {
    return (
      <>
        <Nav isAdmin={false} />
        <main className="max-w-[600px] mx-auto px-5 py-6">
          <p style={{ color: "#a8a29e" }}>Loading...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav isAdmin={player.is_admin} />
      <main className="max-w-[600px] mx-auto px-5 py-6 w-full">
        <h1 className="text-xl font-extrabold mb-5" style={{ color: "#1c1917" }}>
          Settings
        </h1>

        <div
          className="rounded-[20px] p-6 space-y-5"
          style={{
            background: "white",
            border: "1px solid #e7e5e4",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: "#44403c" }}
            >
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-base transition-all"
              style={{
                border: "2px solid #e7e5e4",
                background: "#fafaf9",
                color: "#1c1917",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#f97316";
                e.target.style.background = "white";
                e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e7e5e4";
                e.target.style.background = "#fafaf9";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm font-semibold mb-1"
              style={{ color: "#44403c" }}
            >
              Email
            </label>
            <p className="text-sm" style={{ color: "#78716c" }}>
              {player.email}
            </p>
          </div>

          <div
            className="flex items-center justify-between py-3 px-4 rounded-xl"
            style={{ background: "#fafaf9" }}
          >
            <div>
              <p className="font-semibold text-sm" style={{ color: "#1c1917" }}>
                Auto-In
              </p>
              <p className="text-xs" style={{ color: "#78716c" }}>
                Automatically mark yourself as &quot;In&quot; for new games
              </p>
            </div>
            <button
              onClick={() => setAutoIn(!autoIn)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: autoIn ? "#f97316" : "#d6d3d1" }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                style={{ transform: autoIn ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full rounded-xl py-3.5 font-bold text-base text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            style={{ background: "#1c1917" }}
          >
            {isPending ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </main>
    </>
  );
}
