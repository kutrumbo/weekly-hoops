"use client";

import { useState, useTransition } from "react";
import { updateAttendance, updateNote } from "@/app/actions";

export default function AttendanceToggle({
  gameId,
  currentStatus,
  currentNote,
  gameLocked,
}: {
  gameId: string;
  currentStatus: "in" | "out" | "pending";
  currentNote: string;
  gameLocked: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(currentNote || "");
  const [showNote, setShowNote] = useState(!!currentNote);

  const handleToggle = (status: "in" | "out") => {
    if (gameLocked) return;
    startTransition(() => {
      updateAttendance(gameId, status);
    });
  };

  const handleSaveNote = () => {
    startTransition(() => {
      updateNote(gameId, note);
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm font-medium text-gray-500 mb-3">Your status</p>
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => handleToggle("in")}
          disabled={gameLocked || isPending}
          className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-colors ${
            currentStatus === "in"
              ? "bg-green-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700"
          } ${gameLocked ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          I&apos;m In
        </button>
        <button
          onClick={() => handleToggle("out")}
          disabled={gameLocked || isPending}
          className={`flex-1 py-3 rounded-lg font-semibold text-lg transition-colors ${
            currentStatus === "out"
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700"
          } ${gameLocked ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          I&apos;m Out
        </button>
      </div>

      {gameLocked && (
        <p className="text-sm text-amber-600 mb-2">
          This game is locked. Attendance can no longer be changed.
        </p>
      )}

      {!showNote && !gameLocked && (
        <button
          onClick={() => setShowNote(true)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          + Add a note
        </button>
      )}

      {showNote && (
        <div className="flex gap-2 mt-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Might be 10 min late"
            disabled={gameLocked}
            className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            onClick={handleSaveNote}
            disabled={gameLocked || isPending}
            className="px-3 py-1.5 bg-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
