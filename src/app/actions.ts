"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Attendance actions ──

export async function updateAttendance(
  gameId: string,
  status: "in" | "out"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if attendance record exists
  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("player_id", user.id)
    .eq("game_id", gameId)
    .single();

  if (existing) {
    await supabase
      .from("attendance")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    await supabase.from("attendance").insert({
      player_id: user.id,
      game_id: gameId,
      status,
    });
  }

  revalidatePath("/");
}

export async function updateNote(gameId: string, note: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("attendance")
    .update({ note, updated_at: new Date().toISOString() })
    .eq("player_id", user.id)
    .eq("game_id", gameId);

  revalidatePath("/");
}

// ── Substitute actions ──

export async function addSubstitute(gameId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: attendance } = await supabase
    .from("attendance")
    .select("id, substitutes")
    .eq("player_id", user.id)
    .eq("game_id", gameId)
    .single();

  if (!attendance) throw new Error("No attendance record found");

  const subs = Array.isArray(attendance.substitutes) ? attendance.substitutes : [];
  subs.push({ name });

  await supabase
    .from("attendance")
    .update({ substitutes: subs, updated_at: new Date().toISOString() })
    .eq("id", attendance.id);

  revalidatePath("/");
}

export async function removeSubstitute(gameId: string, index: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: attendance } = await supabase
    .from("attendance")
    .select("id, substitutes")
    .eq("player_id", user.id)
    .eq("game_id", gameId)
    .single();

  if (!attendance) throw new Error("No attendance record found");

  const subs = Array.isArray(attendance.substitutes) ? [...attendance.substitutes] : [];
  subs.splice(index, 1);

  await supabase
    .from("attendance")
    .update({ substitutes: subs, updated_at: new Date().toISOString() })
    .eq("id", attendance.id);

  revalidatePath("/");
}

// ── Player settings actions ──

export async function updatePlayerSettings(data: {
  name?: string;
  auto_in?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase.from("players").update(data).eq("id", user.id);
  revalidatePath("/settings");
  revalidatePath("/");
}

// ── Admin: Game actions ──

export async function createGame(gameDate: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("games").insert({ game_date: gameDate });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateGameStatus(
  gameId: string,
  status: "open" | "locked" | "cancelled"
) {
  const supabase = await createClient();
  await supabase.from("games").update({ status }).eq("id", gameId);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/history");
}

export async function deleteGame(gameId: string) {
  const supabase = await createClient();
  await supabase.from("games").delete().eq("id", gameId);
  revalidatePath("/");
  revalidatePath("/admin");
}

// ── Admin: Player actions ──

export async function invitePlayer(email: string, name: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("invited_emails").insert({
    email: email.toLowerCase().trim(),
    name,
  });

  if (error) {
    if (error.code === "23505") throw new Error("This email has already been invited");
    throw new Error(error.message);
  }
  revalidatePath("/admin");
}

export async function removeInvite(email: string) {
  const supabase = await createClient();
  await supabase.from("invited_emails").delete().eq("email", email);
  revalidatePath("/admin");
}

export async function removePlayer(playerId: string) {
  const supabase = await createClient();

  // Also remove from invited_emails so they can't sign back in
  const { data: player } = await supabase
    .from("players")
    .select("email")
    .eq("id", playerId)
    .single();

  if (player?.email) {
    await supabase.from("invited_emails").delete().eq("email", player.email);
  }

  await supabase.from("players").delete().eq("id", playerId);
  revalidatePath("/admin");
}

export async function togglePlayerAdmin(playerId: string, isAdmin: boolean) {
  const supabase = await createClient();
  await supabase.from("players").update({ is_admin: isAdmin }).eq("id", playerId);
  revalidatePath("/admin");
}

// ── Admin: App settings actions ──

export async function updateAppSetting(key: string, value: string) {
  const supabase = await createClient();
  await supabase
    .from("app_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  revalidatePath("/admin");
}
