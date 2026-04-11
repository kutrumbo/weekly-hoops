import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Hardcoded timezone for game scheduling
const TIMEZONE = "America/Los_Angeles";

/**
 * Get the current date/time in Pacific Time as component parts.
 */
function nowInPacific() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return {
    dayOfWeek: new Date(
      Date.parse(`${parts.month}/${parts.day}/${parts.year}`)
    ).getDay(),
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

/**
 * Build a Date object representing a specific date + time in Pacific Time.
 * We do this by constructing an ISO string with the Pacific offset,
 * which JavaScript will parse into the correct UTC instant.
 */
function dateInPacific(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number
): Date {
  // Create a temporary date to determine DST offset for Pacific
  const tempDate = new Date(
    Date.UTC(year, month - 1, day, hours, minutes)
  );
  const utcStr = tempDate.toLocaleString("en-US", { timeZone: "UTC" });
  const ptStr = tempDate.toLocaleString("en-US", { timeZone: TIMEZONE });
  const utcDate = new Date(utcStr);
  const ptDate = new Date(ptStr);
  const offsetMs = utcDate.getTime() - ptDate.getTime();

  // Construct the actual date: local Pacific time + offset = UTC
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) + offsetMs);
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get schedule settings
  const { data: settings } = await supabase
    .from("app_settings")
    .select("key, value");

  const settingsMap = new Map<string, string>();
  for (const s of settings ?? []) {
    settingsMap.set(s.key, s.value);
  }

  const gameDay = settingsMap.get("game_day") ?? "Wednesday";
  const gameTime = settingsMap.get("game_time") ?? "19:00";

  const dayIndex = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ].indexOf(gameDay);

  if (dayIndex === -1) {
    return NextResponse.json(
      { error: "Invalid game_day setting" },
      { status: 500 }
    );
  }

  // Calculate using Pacific Time
  const pacific = nowInPacific();
  let daysUntilGame = dayIndex - pacific.dayOfWeek;
  if (daysUntilGame < 0) daysUntilGame += 7;

  // Target date in Pacific
  const targetDate = new Date(
    Date.UTC(pacific.year, pacific.month - 1, pacific.day)
  );
  targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilGame);

  const [hours, minutes] = gameTime.split(":").map(Number);

  const nextGameDate = dateInPacific(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth() + 1,
    targetDate.getUTCDate(),
    hours,
    minutes
  );

  // If game time has already passed (in Pacific), schedule for next week
  if (nextGameDate <= new Date()) {
    nextGameDate.setDate(nextGameDate.getDate() + 7);
  }

  // Check if a game already exists for this date (within the same day in Pacific)
  const startOfDay = dateInPacific(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth() + 1,
    targetDate.getUTCDate(),
    0,
    0
  );
  const endOfDay = dateInPacific(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth() + 1,
    targetDate.getUTCDate(),
    23,
    59
  );

  const { data: existingGames } = await supabase
    .from("games")
    .select("id")
    .gte("game_date", startOfDay.toISOString())
    .lte("game_date", endOfDay.toISOString())
    .limit(1);

  if (existingGames && existingGames.length > 0) {
    return NextResponse.json({
      message: "Game already exists for this week",
      game_date: nextGameDate.toISOString(),
    });
  }

  // Create the game (the DB trigger will auto-create attendance records)
  const { data: newGame, error } = await supabase
    .from("games")
    .insert({ game_date: nextGameDate.toISOString() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Game created successfully",
    game: newGame,
  });
}
