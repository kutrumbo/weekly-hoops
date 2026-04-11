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
        <main className="max-w-2xl mx-auto px-4 py-6">
          <p className="text-gray-500">Loading...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav isAdmin={player.is_admin} />
      <main className="max-w-2xl mx-auto px-4 py-6 w-full">
        <h1 className="text-xl font-bold mb-4">Settings</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-500 text-sm">{player.email}</p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Auto-In</p>
              <p className="text-xs text-gray-500">
                Automatically mark yourself as &quot;In&quot; for new games
              </p>
            </div>
            <button
              onClick={() => setAutoIn(!autoIn)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoIn ? "bg-orange-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                  autoIn ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isPending}
            className="w-full bg-orange-600 text-white rounded-md py-2 font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </main>
    </>
  );
}
