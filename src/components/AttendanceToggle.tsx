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

  const handleRemoveNote = () => {
    setNote("");
    setShowNote(false);
    startTransition(() => {
      updateNote(gameId, "");
    });
  };

  return (
    <div
      className="rounded-[20px] p-6"
      style={{
        background: "white",
        border: "1px solid #e7e5e4",
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
      }}
    >
      <p
        className="text-[13px] font-semibold uppercase mb-3"
        style={{ color: "#a8a29e", letterSpacing: "0.5px" }}
      >
        Your Status
      </p>
      <div className="flex gap-2.5">
        <button
          onClick={() => handleToggle("in")}
          disabled={gameLocked || isPending}
          className="flex-1 py-4 rounded-[14px] font-bold text-base transition-all"
          style={
            currentStatus === "in"
              ? { border: "2px solid #22c55e", background: "#f0fdf4", color: "#166534" }
              : { border: "2px solid #e7e5e4", background: "white", color: "#78716c" }
          }
          onMouseOver={(e) => {
            if (!gameLocked && currentStatus !== "in") {
              e.currentTarget.style.borderColor = "#86efac";
              e.currentTarget.style.background = "#f0fdf4";
            }
          }}
          onMouseOut={(e) => {
            if (currentStatus !== "in") {
              e.currentTarget.style.borderColor = "#e7e5e4";
              e.currentTarget.style.background = "white";
            }
          }}
        >
          ✋ I&apos;m In
        </button>
        <button
          onClick={() => handleToggle("out")}
          disabled={gameLocked || isPending}
          className="flex-1 py-4 rounded-[14px] font-bold text-base transition-all"
          style={
            currentStatus === "out"
              ? { border: "2px solid #ef4444", background: "#fef2f2", color: "#991b1b" }
              : { border: "2px solid #e7e5e4", background: "white", color: "#78716c" }
          }
          onMouseOver={(e) => {
            if (!gameLocked && currentStatus !== "out") {
              e.currentTarget.style.borderColor = "#fca5a5";
              e.currentTarget.style.background = "#fef2f2";
            }
          }}
          onMouseOut={(e) => {
            if (currentStatus !== "out") {
              e.currentTarget.style.borderColor = "#e7e5e4";
              e.currentTarget.style.background = "white";
            }
          }}
        >
          👋 I&apos;m Out
        </button>
      </div>

      {gameLocked && (
        <p className="text-sm mt-3" style={{ color: "#d97706" }}>
          This game is locked. Attendance can no longer be changed.
        </p>
      )}

      {!showNote && !gameLocked && (
        <button
          onClick={() => setShowNote(true)}
          className="text-sm mt-3 font-medium transition-colors"
          style={{ color: "#78716c" }}
          onMouseOver={(e) => { e.currentTarget.style.color = "#44403c"; }}
          onMouseOut={(e) => { e.currentTarget.style.color = "#78716c"; }}
        >
          + Add a note
        </button>
      )}

      {showNote && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., Might be 10 min late"
            disabled={gameLocked}
            className="flex-1 rounded-xl px-3.5 py-2.5 text-[13px] transition-all"
            style={{
              border: "2px solid #e7e5e4",
              background: "#fafaf9",
              color: "#1c1917",
              outline: "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#f97316";
              e.target.style.background = "white";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e7e5e4";
              e.target.style.background = "#fafaf9";
            }}
          />
          <button
            onClick={handleSaveNote}
            disabled={gameLocked || isPending}
            className="px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: "#1c1917" }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#292524"; }}
            onMouseOut={(e) => { e.currentTarget.style.background = "#1c1917"; }}
          >
            Save
          </button>
          {!gameLocked && (
            <button
              onClick={handleRemoveNote}
              disabled={isPending}
              className="px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{ color: "#a8a29e" }}
              onMouseOver={(e) => { e.currentTarget.style.color = "#78716c"; }}
              onMouseOut={(e) => { e.currentTarget.style.color = "#a8a29e"; }}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}
