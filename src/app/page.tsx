import AppShell from "@/components/AppShell";
import AttendanceToggle from "@/components/AttendanceToggle";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Game, AttendanceWithPlayer } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get the next upcoming or most recent open game
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .gte("game_date", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("game_date", { ascending: true })
    .limit(1);

  const game: Game | null = games?.[0] ?? null;

  // Get attendance for this game
  let attendanceList: AttendanceWithPlayer[] = [];
  let myAttendance = null;

  if (game) {
    const { data: attendance } = await supabase
      .from("attendance")
      .select("*, players(*)")
      .eq("game_id", game.id)
      .order("status", { ascending: true });

    attendanceList = (attendance as AttendanceWithPlayer[]) ?? [];
    myAttendance = attendanceList.find((a) => a.player_id === user.id);
  }

  // Get app settings for location
  const { data: locationSetting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "game_location")
    .single();

  const inCount = attendanceList.filter((a) => a.status === "in").length;
  const outCount = attendanceList.filter((a) => a.status === "out").length;
  const pendingCount = attendanceList.filter((a) => a.status === "pending").length;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
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
      {!game ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No upcoming games scheduled.</p>
          <p className="text-sm mt-1">Check back later or ask an admin to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Game Header */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold">{formatDate(game.game_date)}</h2>
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
            <p className="text-gray-500">
              {formatTime(game.game_date)}
              {locationSetting?.value ? ` · ${locationSetting.value}` : ""}
            </p>

            {game.status === "cancelled" && (
              <p className="mt-2 text-red-600 font-medium">
                This game has been cancelled.
              </p>
            )}
          </div>

          {/* Attendance Toggle */}
          {game.status !== "cancelled" && (
            <AttendanceToggle
              gameId={game.id}
              currentStatus={myAttendance?.status ?? "pending"}
              currentNote={myAttendance?.note ?? ""}
              gameLocked={game.status === "locked"}
            />
          )}

          {/* Attendance Summary */}
          <div className="flex gap-3">
            <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{inCount}</p>
              <p className="text-xs text-green-600">In</p>
            </div>
            <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{outCount}</p>
              <p className="text-xs text-red-600">Out</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center border">
              <p className="text-2xl font-bold text-gray-500">{pendingCount}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>

          {/* Roster */}
          <div className="bg-white rounded-lg shadow">
            <h3 className="px-4 pt-4 pb-2 font-semibold text-gray-700">Roster</h3>
            <div className="divide-y divide-gray-100">
              {attendanceList
                .sort((a, b) => {
                  const order = { in: 0, pending: 1, out: 2 };
                  return order[a.status] - order[b.status];
                })
                .map((a) => (
                  <div
                    key={a.id}
                    className="px-4 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {a.players.name || a.players.email}
                      </p>
                      {a.note && (
                        <p className="text-xs text-gray-500 mt-0.5">{a.note}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        a.status === "in"
                          ? "bg-green-100 text-green-700"
                          : a.status === "out"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {a.status === "in"
                        ? "In"
                        : a.status === "out"
                        ? "Out"
                        : "Pending"}
                    </span>
                  </div>
                ))}
              {attendanceList.length === 0 && (
                <p className="px-4 py-6 text-center text-gray-400 text-sm">
                  No players yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
