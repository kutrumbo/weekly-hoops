"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createGame,
  updateGameStatus,
  deleteGame,
  removePlayer,
  togglePlayerAdmin,
  updateAppSetting,
} from "@/app/actions";
import Nav from "@/components/Nav";
import type { Player, Game, AppSetting } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isPending, startTransition] = useTransition();

  // New game form
  const [newGameDate, setNewGameDate] = useState("");
  const [newGameTime, setNewGameTime] = useState("19:00");

  // Settings form
  const [gameDay, setGameDay] = useState("Wednesday");
  const [gameTime, setGameTime] = useState("19:00");
  const [gameLocation, setGameLocation] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: me } = await supabase
        .from("players")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!me?.is_admin) {
        router.push("/");
        return;
      }
      setPlayer(me as Player);

      const { data: allPlayers } = await supabase
        .from("players")
        .select("*")
        .order("name");
      setPlayers((allPlayers as Player[]) ?? []);

      const { data: allGames } = await supabase
        .from("games")
        .select("*")
        .order("game_date", { ascending: false })
        .limit(10);
      setGames((allGames as Game[]) ?? []);

      const { data: allSettings } = await supabase
        .from("app_settings")
        .select("*");
      setSettings((allSettings as AppSetting[]) ?? []);

      // Populate settings form
      for (const s of (allSettings as AppSetting[]) ?? []) {
        if (s.key === "game_day") setGameDay(s.value);
        if (s.key === "game_time") setGameTime(s.value);
        if (s.key === "game_location") setGameLocation(s.value);
      }
    };
    load();
  }, [router]);

  const handleCreateGame = () => {
    if (!newGameDate) return;
    const datetime = `${newGameDate}T${newGameTime}:00`;
    startTransition(async () => {
      await createGame(datetime);
      // Refresh games list
      const supabase = createClient();
      const { data } = await supabase
        .from("games")
        .select("*")
        .order("game_date", { ascending: false })
        .limit(10);
      setGames((data as Game[]) ?? []);
      setNewGameDate("");
    });
  };

  const handleStatusChange = (gameId: string, status: "open" | "locked" | "cancelled") => {
    startTransition(async () => {
      await updateGameStatus(gameId, status);
      setGames((prev) =>
        prev.map((g) => (g.id === gameId ? { ...g, status } : g))
      );
    });
  };

  const handleDeleteGame = (gameId: string) => {
    if (!confirm("Delete this game and all its attendance records?")) return;
    startTransition(async () => {
      await deleteGame(gameId);
      setGames((prev) => prev.filter((g) => g.id !== gameId));
    });
  };

  const handleRemovePlayer = (playerId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from the group?`)) return;
    startTransition(async () => {
      await removePlayer(playerId);
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });
  };

  const handleToggleAdmin = (playerId: string, currentAdmin: boolean) => {
    startTransition(async () => {
      await togglePlayerAdmin(playerId, !currentAdmin);
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, is_admin: !currentAdmin } : p
        )
      );
    });
  };

  const handleSaveSettings = () => {
    setSettingsSaved(false);
    startTransition(async () => {
      await updateAppSetting("game_day", gameDay);
      await updateAppSetting("game_time", gameTime);
      await updateAppSetting("game_location", gameLocation);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
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

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <>
      <Nav isAdmin={true} />
      <main className="max-w-2xl mx-auto px-4 py-6 w-full space-y-6">
        <h1 className="text-xl font-bold">Admin</h1>

        {/* ── Game Schedule Settings ── */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Game Schedule</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Day of Week
              </label>
              <select
                value={gameDay}
                onChange={(e) => setGameDay(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Time
              </label>
              <input
                type="time"
                value={gameTime}
                onChange={(e) => setGameTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Location
            </label>
            <input
              type="text"
              value={gameLocation}
              onChange={(e) => setGameLocation(e.target.value)}
              placeholder="e.g., Downtown YMCA Court 2"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isPending}
            className="bg-orange-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving..." : settingsSaved ? "Saved!" : "Save Schedule"}
          </button>
        </section>

        {/* ── Create Game ── */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Create Game</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={newGameDate}
                onChange={(e) => setNewGameDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Time
              </label>
              <input
                type="time"
                value={newGameTime}
                onChange={(e) => setNewGameTime(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={handleCreateGame}
              disabled={isPending || !newGameDate}
              className="bg-green-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Create
            </button>
          </div>
        </section>

        {/* ── Manage Games ── */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="px-6 pt-6 pb-2 font-semibold text-gray-700">
            Recent Games
          </h2>
          <div className="divide-y divide-gray-100">
            {games.map((game) => (
              <div
                key={game.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatDate(game.game_date)} · {formatTime(game.game_date)}
                  </p>
                  <span
                    className={`text-xs font-medium ${
                      game.status === "open"
                        ? "text-green-600"
                        : game.status === "locked"
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {game.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  {game.status === "open" && (
                    <button
                      onClick={() => handleStatusChange(game.id, "locked")}
                      className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                    >
                      Lock
                    </button>
                  )}
                  {game.status === "locked" && (
                    <button
                      onClick={() => handleStatusChange(game.id, "open")}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                  {game.status !== "cancelled" && (
                    <button
                      onClick={() => handleStatusChange(game.id, "cancelled")}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                  {game.status === "cancelled" && (
                    <button
                      onClick={() => handleStatusChange(game.id, "open")}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteGame(game.id)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {games.length === 0 && (
              <p className="px-6 py-4 text-sm text-gray-400">No games yet.</p>
            )}
          </div>
        </section>

        {/* ── Manage Players ── */}
        <section className="bg-white rounded-lg shadow">
          <h2 className="px-6 pt-6 pb-2 font-semibold text-gray-700">
            Players ({players.length})
          </h2>
          <div className="divide-y divide-gray-100">
            {players.map((p) => (
              <div
                key={p.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {p.name || p.email}
                    {p.is_admin && (
                      <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                    {p.auto_in && (
                      <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Auto-in
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{p.email}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleAdmin(p.id, p.is_admin)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  >
                    {p.is_admin ? "Remove Admin" : "Make Admin"}
                  </button>
                  {p.id !== player.id && (
                    <button
                      onClick={() =>
                        handleRemovePlayer(p.id, p.name || p.email)
                      }
                      className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
