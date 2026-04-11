"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createGame,
  updateGameStatus,
  deleteGame,
  invitePlayer,
  removeInvite,
  removePlayer,
  togglePlayerAdmin,
  updateAppSetting,
} from "@/app/actions";
import Nav from "@/components/Nav";
import { FormattedDateTime } from "@/components/FormattedDate";
import type { Player, Game, AppSetting } from "@/lib/types";
import { useRouter } from "next/navigation";

/* ── Shared style constants ── */
const card = {
  background: "white",
  border: "1px solid #e7e5e4",
  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
  borderRadius: "20px",
} as const;

const inputStyle = {
  border: "2px solid #e7e5e4",
  borderRadius: "12px",
  padding: "10px 14px",
  fontSize: "14px",
  color: "#1c1917",
  background: "#fafaf9",
  outline: "none",
  width: "100%",
} as const;

const sectionLabel = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#a8a29e",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: "12px",
};

export default function AdminPage() {
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [isPending, startTransition] = useTransition();

  const [newGameDate, setNewGameDate] = useState("");
  const [newGameTime, setNewGameTime] = useState("20:00");

  const [gameDay, setGameDay] = useState("Wednesday");
  const [gameTime, setGameTime] = useState("20:00");
  const [gameLocation, setGameLocation] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<{ email: string; name: string }[]>([]);

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

      for (const s of (allSettings as AppSetting[]) ?? []) {
        if (s.key === "game_day") setGameDay(s.value);
        if (s.key === "game_time") setGameTime(s.value);
        if (s.key === "game_location") setGameLocation(s.value);
      }

      const { data: allInvites } = await supabase
        .from("invited_emails")
        .select("email, name")
        .order("invited_at", { ascending: false });
      setInvitedEmails((allInvites as { email: string; name: string }[]) ?? []);
    };
    load();
  }, [router]);

  const handleCreateGame = () => {
    if (!newGameDate) return;
    // Convert local date/time to a proper UTC ISO string so Supabase
    // stores it correctly regardless of server timezone
    const localDate = new Date(`${newGameDate}T${newGameTime}:00`);
    const datetime = localDate.toISOString();
    startTransition(async () => {
      await createGame(datetime);
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

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setInviteError("");
    startTransition(async () => {
      try {
        await invitePlayer(inviteEmail, inviteName);
        setInvitedEmails((prev) => [
          { email: inviteEmail.toLowerCase().trim(), name: inviteName },
          ...prev,
        ]);
        setInviteEmail("");
        setInviteName("");
      } catch (err) {
        setInviteError((err as Error).message);
      }
    });
  };

  const handleRemoveInvite = (email: string) => {
    if (!confirm(`Remove invite for ${email}?`)) return;
    startTransition(async () => {
      await removeInvite(email);
      setInvitedEmails((prev) => prev.filter((i) => i.email !== email));
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

  const days = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];

  return (
    <>
      <Nav isAdmin={true} />
      <main className="max-w-[1100px] mx-auto px-5 py-6 w-full">
        <h1 className="text-xl font-extrabold mb-5" style={{ color: "#1c1917" }}>
          Admin
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          {/* ── Left Column: Games ── */}
          <div className="space-y-5">
            {/* ── Game Schedule Settings ── */}
            <section className="p-6" style={card}>
              <p style={sectionLabel}>Game Schedule</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                    Day of Week
                  </label>
                  <select value={gameDay} onChange={(e) => setGameDay(e.target.value)} style={inputStyle}>
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                    Time
                  </label>
                  <input type="time" value={gameTime} onChange={(e) => setGameTime(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                  Location
                </label>
                <input
                  type="text"
                  value={gameLocation}
                  onChange={(e) => setGameLocation(e.target.value)}
                  placeholder="e.g., Downtown YMCA Court 2"
                  style={inputStyle}
                />
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={isPending}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "#1c1917" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "#292524"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "#1c1917"; }}
              >
                {isPending ? "Saving..." : settingsSaved ? "Saved!" : "Save Schedule"}
              </button>
            </section>

            {/* ── Create Game ── */}
            <section className="p-6" style={card}>
              <p style={sectionLabel}>Create Game</p>
              <p className="text-sm mb-3" style={{ color: "#78716c" }}>
                This is only used for manually adding a game, by default a game will be created weekly according to the schedule defined above.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                    Date
                  </label>
                  <input type="date" value={newGameDate} onChange={(e) => setNewGameDate(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                    Time
                  </label>
                  <input type="time" value={newGameTime} onChange={(e) => setNewGameTime(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <button
                onClick={handleCreateGame}
                disabled={isPending || !newGameDate}
                className="w-full rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "#16a34a" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "#15803d"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "#16a34a"; }}
              >
                Create Game
              </button>
            </section>

            {/* ── Upcoming Games ── */}
            <section style={card} className="overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <p style={sectionLabel}>Upcoming Games</p>
              </div>
              {games.map((game) => (
                <div
                  key={game.id}
                  className="px-5 sm:px-6 py-3.5"
                  style={{ borderTop: "1px solid #f5f5f4" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#1c1917" }}>
                        <FormattedDateTime date={game.game_date} />
                      </p>
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: game.status === "open" ? "#16a34a"
                            : game.status === "locked" ? "#d97706"
                            : "#ef4444",
                        }}
                      >
                        {game.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {game.status === "open" && (
                      <button
                        onClick={() => handleStatusChange(game.id, "locked")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                        style={{ background: "#fef3c7", color: "#92400e" }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#fde68a"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#fef3c7"; }}
                      >
                        Lock
                      </button>
                    )}
                    {game.status === "locked" && (
                      <button
                        onClick={() => handleStatusChange(game.id, "open")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                        style={{ background: "#dcfce7", color: "#166534" }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#bbf7d0"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
                      >
                        Reopen
                      </button>
                    )}
                    {game.status !== "cancelled" && (
                      <button
                        onClick={() => handleStatusChange(game.id, "cancelled")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                        style={{ background: "#fee2e2", color: "#991b1b" }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                      >
                        Cancel
                      </button>
                    )}
                    {game.status === "cancelled" && (
                      <button
                        onClick={() => handleStatusChange(game.id, "open")}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                        style={{ background: "#dcfce7", color: "#166534" }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "#bbf7d0"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "#dcfce7"; }}
                      >
                        Reopen
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                      style={{ background: "#f5f5f4", color: "#78716c" }}
                      onMouseOver={(e) => { e.currentTarget.style.background = "#e7e5e4"; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = "#f5f5f4"; }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {games.length === 0 && (
                <p className="px-6 py-5 text-sm" style={{ color: "#a8a29e" }}>
                  No games yet.
                </p>
              )}
            </section>
          </div>

          {/* ── Right Column: Players ── */}
          <div className="space-y-5">
            {/* ── Invite Player ── */}
            <section className="p-6" style={card}>
              <p style={sectionLabel}>Invite Player</p>
              <p className="text-sm mb-3" style={{ color: "#78716c" }}>
                Players must be invited before they can sign in.
              </p>
              <div className="space-y-3 mb-3">
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="player@example.com"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1" style={{ color: "#44403c" }}>
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g., Mike T."
                    style={inputStyle}
                  />
                </div>
              </div>
              <button
                onClick={handleInvite}
                disabled={isPending || !inviteEmail.trim()}
                className="w-full rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ background: "#1c1917" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "#292524"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "#1c1917"; }}
              >
                Send Invite
              </button>
              {inviteError && (
                <p className="mt-2 text-sm font-medium" style={{ color: "#dc2626" }}>
                  {inviteError}
                </p>
              )}
            </section>

            {/* ── Players ── */}
            <section style={card} className="overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <p style={sectionLabel}>Players ({invitedEmails.length})</p>
              </div>
              {invitedEmails.map((inv) => {
                const matchedPlayer = players.find((p) => p.email === inv.email);
                return (
                  <div
                    key={inv.email}
                    className="px-5 sm:px-6 py-3.5"
                    style={{ borderTop: "1px solid #f5f5f4" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: "#1c1917" }}>
                          <span className="truncate">
                            {matchedPlayer ? (matchedPlayer.name || matchedPlayer.email) : (inv.name || inv.email)}
                          </span>
                          {!matchedPlayer && (
                            <span
                              className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                              style={{ background: "#e0e7ff", color: "#3730a3" }}
                            >
                              Invited
                            </span>
                          )}
                          {matchedPlayer?.is_admin && (
                            <span
                              className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                              style={{ background: "#fef3c7", color: "#92400e" }}
                            >
                              Admin
                            </span>
                          )}
                          {matchedPlayer?.auto_in && (
                            <span
                              className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap"
                              style={{ background: "#dbeafe", color: "#1e40af" }}
                            >
                              Auto-in
                            </span>
                          )}
                        </p>
                        <p className="text-xs truncate" style={{ color: "#a8a29e" }}>
                          {inv.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {matchedPlayer ? (
                        <>
                          <button
                            onClick={() => handleToggleAdmin(matchedPlayer.id, matchedPlayer.is_admin)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                            style={{ background: "#f5f5f4", color: "#44403c" }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "#e7e5e4"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "#f5f5f4"; }}
                          >
                            {matchedPlayer.is_admin ? "Remove Admin" : "Make Admin"}
                          </button>
                          {matchedPlayer.id !== player.id && (
                            <button
                              onClick={() => handleRemovePlayer(matchedPlayer.id, matchedPlayer.name || matchedPlayer.email)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                              style={{ background: "#fee2e2", color: "#991b1b" }}
                              onMouseOver={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                            >
                              Remove
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleRemoveInvite(inv.email)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors"
                          style={{ background: "#fee2e2", color: "#991b1b" }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "#fecaca"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "#fee2e2"; }}
                        >
                          Revoke Invite
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {invitedEmails.length === 0 && (
                <p className="px-6 py-5 text-sm" style={{ color: "#a8a29e" }}>
                  No players yet. Invite someone above to get started.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
