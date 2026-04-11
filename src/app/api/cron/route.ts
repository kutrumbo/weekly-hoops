import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint uses the service role key to bypass RLS
// It's called by Vercel Cron (or any external cron service)
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

  // Calculate next occurrence of the game day
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
    return NextResponse.json({ error: "Invalid game_day setting" }, { status: 500 });
  }

  const now = new Date();
  const today = now.getDay();
  let daysUntilGame = dayIndex - today;
  if (daysUntilGame < 0) daysUntilGame += 7;
  if (daysUntilGame === 0) {
    // If today is game day, check if we already have a game for today
    // If so, schedule for next week
  }

  const nextGameDate = new Date(now);
  nextGameDate.setDate(now.getDate() + daysUntilGame);

  // Set the time
  const [hours, minutes] = gameTime.split(":").map(Number);
  nextGameDate.setHours(hours, minutes, 0, 0);

  // If the game time has already passed today, schedule for next week
  if (nextGameDate <= now) {
    nextGameDate.setDate(nextGameDate.getDate() + 7);
  }

  // Check if a game already exists for this date (within the same day)
  const startOfDay = new Date(nextGameDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(nextGameDate);
  endOfDay.setHours(23, 59, 59, 999);

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
