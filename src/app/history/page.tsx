import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Game, AttendanceWithPlayer } from "@/lib/types";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .order("game_date", { ascending: false })
    .limit(20);

  const allGames = (games as Game[]) ?? [];

  // Get attendance for all games
  const gameIds = allGames.map((g) => g.id);
  const { data: allAttendance } = await supabase
    .from("attendance")
    .select("*, players(name, email)")
    .in("game_id", gameIds.length > 0 ? gameIds : ["none"]);

  const attendanceByGame = new Map<string, AttendanceWithPlayer[]>();
  for (const a of (allAttendance as AttendanceWithPlayer[]) ?? []) {
    const list = attendanceByGame.get(a.game_id) ?? [];
    list.push(a);
    attendanceByGame.set(a.game_id, list);
  }

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

  return (
    <AppShell>
      <h1 className="text-xl font-bold mb-4">Game History</h1>

      {allGames.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No games yet.</p>
      ) : (
        <div className="space-y-3">
          {allGames.map((game) => {
            const attendance = attendanceByGame.get(game.id) ?? [];
            const inCount = attendance.filter((a) => a.status === "in").length;
            const outCount = attendance.filter((a) => a.status === "out").length;

            return (
              <div key={game.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold">
                      {formatDate(game.game_date)} · {formatTime(game.game_date)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      game.status === "open"
                        ? "bg-green-100 text-green-700"
                        : game.status === "locked"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {game.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="text-green-600">{inCount} in</span>
                  <span className="text-red-600">{outCount} out</span>
                </div>
                {attendance
                  .filter((a) => a.status === "in")
                  .map((a) => (
                    <span
                      key={a.id}
                      className="inline-block mr-1.5 mt-2 text-xs bg-gray-100 px-2 py-0.5 rounded"
                    >
                      {a.players.name || a.players.email}
                    </span>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
