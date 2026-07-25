import React from "react";
import { Trophy, Medal, Award, User, RefreshCw } from "lucide-react";
import { LeaderboardEntry } from "../types";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onRefresh: () => void;
  loading: boolean;
}

export default function Leaderboard({ entries, onRefresh, loading }: LeaderboardProps) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur-md space-y-4" id="leaderboard-root">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 className="text-sm font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
          <Trophy className="w-4.5 h-4.5 text-amber-500 animate-pulse" /> global ranking board
        </h3>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-amber-500" : ""}`} /> Reload ranks
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Ranks are recalculated in real-time based on the number of stages completed, elapsed time, and tiered hint penalties (10/20/30 pts per hint).
      </p>

      {/* Ranks Table */}
      <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-950 font-mono text-xs">
        <div className="grid grid-cols-12 bg-zinc-900/50 border-b border-zinc-900 py-2.5 px-4 font-bold text-zinc-400">
          <div className="col-span-2">RANK</div>
          <div className="col-span-4">OPERATOR</div>
          <div className="col-span-2 text-center">STAGES</div>
          <div className="col-span-2 text-center">ELAPSED</div>
          <div className="col-span-2 text-right">SCORE</div>
        </div>

        <div className="divide-y divide-zinc-900">
          {entries.map((entry, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;

            return (
              <div
                key={entry.name}
                className={`grid grid-cols-12 py-3 px-4 items-center transition-colors ${
                  entry.isUser
                    ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500"
                    : "hover:bg-zinc-900/20 text-zinc-300"
                }`}
              >
                {/* Rank column */}
                <div className="col-span-2 flex items-center gap-1">
                  {rank === 1 ? (
                    <Trophy className="w-4 h-4 text-yellow-500" />
                  ) : rank === 2 ? (
                    <Medal className="w-4 h-4 text-zinc-400" />
                  ) : rank === 3 ? (
                    <Medal className="w-4 h-4 text-amber-700" />
                  ) : (
                    <span className="text-zinc-500 text-xs font-bold pl-1">{rank}</span>
                  )}
                </div>

                {/* Operator Name */}
                <div className="col-span-4 flex items-center gap-2 truncate">
                  {entry.isUser ? (
                    <User className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                  )}
                  <span className={`font-semibold truncate ${entry.isUser ? "text-amber-400" : "text-zinc-200"}`}>
                    {entry.name} {entry.isUser && <span className="text-[9px] px-1 py-0.2 bg-amber-500/15 rounded text-amber-500 uppercase ml-1">You</span>}
                  </span>
                </div>

                {/* Stages Completed */}
                <div className="col-span-2 text-center font-bold text-zinc-400">
                  {entry.stagesCompleted} / 4
                </div>

                {/* Time Elapsed */}
                <div className="col-span-2 text-center text-zinc-400">
                  {entry.timeElapsed}
                </div>

                {/* Score */}
                <div className={`col-span-2 text-right font-bold font-mono ${entry.isUser ? "text-amber-500" : "text-zinc-100"}`}>
                  {entry.score} pts
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
