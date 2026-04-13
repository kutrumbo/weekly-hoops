export interface Player {
  id: string;
  email: string;
  name: string;
  auto_in: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Game {
  id: string;
  game_date: string;
  status: "open" | "locked" | "cancelled";
  created_at: string;
}

export interface Substitute {
  name: string;
}

export interface Attendance {
  id: string;
  player_id: string;
  game_id: string;
  status: "in" | "out" | "pending";
  note: string;
  substitutes: Substitute[];
  updated_at: string;
}

export interface AttendanceWithPlayer extends Attendance {
  players: Player;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}
