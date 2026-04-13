import AppShell from "@/components/AppShell";
import AttendanceToggle from "@/components/AttendanceToggle";
import { FormattedDate, FormattedTime } from "@/components/FormattedDate";
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

  // Count substitutes brought by "in" players toward the in total
  const totalSubstitutes = attendanceList
    .filter((a) => a.status === "in")
    .reduce((sum, a) => sum + (Array.isArray(a.substitutes) ? a.substitutes.length : 0), 0);
  const inCount = attendanceList.filter((a) => a.status === "in").length + totalSubstitutes;
  const outCount = attendanceList.filter((a) => a.status === "out").length;
  const pendingCount = attendanceList.filter((a) => a.status === "pending").length;

  const inList = attendanceList.filter((a) => a.status === "in");
  const outList = attendanceList.filter((a) => a.status === "out");
  const pendingList = attendanceList.filter((a) => a.status === "pending");

  const statusBadge = (status: string) => {
    if (status === "open") return { bg: "rgba(34,197,94,0.15)", color: "#4ade80" };
    if (status === "locked") return { bg: "rgba(251,191,36,0.15)", color: "#fbbf24" };
    return { bg: "rgba(239,68,68,0.15)", color: "#f87171" };
  };

  return (
    <AppShell>
      {!game ? (
        <div className="text-center py-16" style={{ color: "#a8a29e" }}>
          <div className="text-5xl mb-4">🏀</div>
          <p className="text-lg font-semibold" style={{ color: "#78716c" }}>
            No upcoming games scheduled
          </p>
          <p className="text-sm mt-1">Check back later or ask an admin to create one.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Scoreboard */}
          <div
            className="rounded-[20px] px-5 py-4 text-white relative overflow-hidden"
            style={{ background: "#1c1917" }}
          >
            <span
              className="absolute -top-5 -right-2.5 text-[80px] opacity-[0.06] pointer-events-none"
              aria-hidden="true"
            >
              🏀
            </span>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold">
                  <FormattedDate date={game.game_date} />
                </h2>
                <p className="text-[13px]" style={{ color: "#a8a29e" }}>
                  <FormattedTime date={game.game_date} />
                  {locationSetting?.value ? ` · ${locationSetting.value}` : ""}
                </p>
              </div>
              <span
                className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full"
                style={{
                  background: statusBadge(game.status).bg,
                  color: statusBadge(game.status).color,
                  letterSpacing: "0.5px",
                }}
              >
                {game.status}
              </span>
            </div>

            {game.status === "cancelled" ? (
              <p className="mt-3 text-sm font-medium" style={{ color: "#f87171" }}>
                This game has been cancelled.
              </p>
            ) : (
              <div
                className="flex justify-center gap-6 mt-3.5 pt-3.5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div className="text-center">
                  <p className="text-[28px] font-black" style={{ color: "#4ade80" }}>
                    {inCount}
                  </p>
                  <p
                    className="text-[11px] font-semibold uppercase"
                    style={{ color: "#78716c", letterSpacing: "0.5px" }}
                  >
                    In
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[28px] font-black" style={{ color: "#f87171" }}>
                    {outCount}
                  </p>
                  <p
                    className="text-[11px] font-semibold uppercase"
                    style={{ color: "#78716c", letterSpacing: "0.5px" }}
                  >
                    Out
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[28px] font-black" style={{ color: "#78716c" }}>
                    {pendingCount}
                  </p>
                  <p
                    className="text-[11px] font-semibold uppercase"
                    style={{ color: "#78716c", letterSpacing: "0.5px" }}
                  >
                    Pending
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Attendance Toggle */}
          {game.status !== "cancelled" && (
            <AttendanceToggle
              gameId={game.id}
              currentStatus={myAttendance?.status ?? "pending"}
              currentNote={myAttendance?.note ?? ""}
              currentSubstitutes={myAttendance?.substitutes ?? []}
              gameLocked={game.status === "locked"}
            />
          )}

          {/* Roster */}
          <div
            className="rounded-[20px] overflow-hidden"
            style={{
              background: "white",
              border: "1px solid #e7e5e4",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            {/* Playing section */}
            {inList.length > 0 && (
              <>
                <p
                  className="text-[11px] font-bold uppercase px-6 pt-5 pb-2"
                  style={{ color: "#a8a29e", letterSpacing: "0.5px" }}
                >
                  Playing ({inCount})
                </p>
                {inList.map((a) => {
                  const subs = Array.isArray(a.substitutes) ? a.substitutes : [];
                  return (
                    <div key={a.id}>
                      <div
                        className="flex items-center gap-2.5 px-6 py-3"
                        style={{ borderTop: "1px solid #f5f5f4" }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: "#22c55e" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "#1c1917" }}>
                            {a.players.name || a.players.email}
                          </p>
                          {a.note && (
                            <p className="text-xs" style={{ color: "#a8a29e" }}>
                              {a.note}
                            </p>
                          )}
                        </div>
                      </div>
                      {subs.map((sub, i) => (
                        <div
                          key={`${a.id}-sub-${i}`}
                          className="flex items-center gap-2.5 px-6 py-2.5 pl-11"
                          style={{ borderTop: "1px solid #f5f5f4" }}
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: "#86efac" }}
                          />
                          <p className="text-sm" style={{ color: "#44403c" }}>
                            {sub.name}
                            <span className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                              Sub
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}

            {/* Not Playing section */}
            {outList.length > 0 && (
              <>
                <p
                  className="text-[11px] font-bold uppercase px-6 pt-5 pb-2"
                  style={{ color: "#a8a29e", letterSpacing: "0.5px" }}
                >
                  Not Playing ({outCount})
                </p>
                {outList.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 px-6 py-3"
                    style={{ borderTop: "1px solid #f5f5f4" }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: "#ef4444" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#1c1917" }}>
                        {a.players.name || a.players.email}
                      </p>
                      {a.note && (
                        <p className="text-xs" style={{ color: "#a8a29e" }}>
                          {a.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Waiting On section */}
            {pendingList.length > 0 && (
              <>
                <p
                  className="text-[11px] font-bold uppercase px-6 pt-5 pb-2"
                  style={{ color: "#a8a29e", letterSpacing: "0.5px" }}
                >
                  Waiting On ({pendingCount})
                </p>
                {pendingList.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2.5 px-6 py-3"
                    style={{ borderTop: "1px solid #f5f5f4" }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: "#d6d3d1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: "#1c1917" }}>
                        {a.players.name || a.players.email}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {attendanceList.length === 0 && (
              <p className="px-6 py-8 text-center text-sm" style={{ color: "#a8a29e" }}>
                No players yet.
              </p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
