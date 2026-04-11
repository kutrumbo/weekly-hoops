import AppShell from "@/components/AppShell";
import { FormattedDateTime } from "@/components/FormattedDate";
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

  return (
    <AppShell>
      <h1 className="text-xl font-extrabold mb-5" style={{ color: "#1c1917" }}>
        Game History
      </h1>

      {allGames.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#a8a29e" }}>
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold" style={{ color: "#78716c" }}>No games yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allGames.map((game) => {
            const attendance = attendanceByGame.get(game.id) ?? [];
            const inCount = attendance.filter((a) => a.status === "in").length;
            const outCount = attendance.filter((a) => a.status === "out").length;

            const statusBadge = () => {
              if (game.status === "open") return { bg: "#dcfce7", color: "#166534" };
              if (game.status === "locked") return { bg: "#fef3c7", color: "#92400e" };
              return { bg: "#fee2e2", color: "#991b1b" };
            };

            return (
              <div
                key={game.id}
                className="rounded-[20px] p-5"
                style={{
                  background: "white",
                  border: "1px solid #e7e5e4",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm" style={{ color: "#1c1917" }}>
                    <FormattedDateTime date={game.game_date} />
                  </p>
                  <span
                    className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full"
                    style={{
                      background: statusBadge().bg,
                      color: statusBadge().color,
                      letterSpacing: "0.5px",
                    }}
                  >
                    {game.status}
                  </span>
                </div>
                <div className="flex gap-4 text-sm mb-2">
                  <span className="font-semibold" style={{ color: "#16a34a" }}>
                    {inCount} in
                  </span>
                  <span className="font-semibold" style={{ color: "#ef4444" }}>
                    {outCount} out
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {attendance
                    .filter((a) => a.status === "in")
                    .map((a) => (
                      <span
                        key={a.id}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg"
                        style={{ background: "#f5f5f4", color: "#44403c" }}
                      >
                        {a.players.name || a.players.email}
                      </span>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
