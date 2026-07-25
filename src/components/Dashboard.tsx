import React, { useEffect, useState } from "react";
import { Shield, Target, Play, Award, HelpCircle, RefreshCw, ChevronRight, CheckCircle, Clock } from "lucide-react";
import { SessionState, Stage } from "../types";

interface DashboardProps {
  session: SessionState;
  stages: (Stage & { isCompleted: boolean; hintUsed: boolean })[];
  onSelectStage: (stageId: number) => void;
  onReset: () => void;
  onGenerateReport: () => void;
  loading: boolean;
  onNavigateToTab: (tab: string) => void;
  geminiEnabled: boolean;
  geminiAvailable: boolean;
  onToggleGemini: () => void;
}

export default function Dashboard({
  session,
  stages,
  onSelectStage,
  onReset,
  onGenerateReport,
  loading,
  onNavigateToTab,
  geminiEnabled,
  geminiAvailable,
  onToggleGemini,
}: DashboardProps) {
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");

  useEffect(() => {
    const timer = setInterval(() => {
      const start = session.startTime;
      const end = session.endTime || Date.now();
      const diffSecs = Math.floor((end - start) / 1000);
      const mins = Math.floor(diffSecs / 60).toString().padStart(2, "0");
      const secs = (diffSecs % 60).toString().padStart(2, "0");
      setElapsedTime(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [session.startTime, session.endTime]);

  const HINT_COSTS = [10, 20, 30];
  const hintPenalty = Object.entries(session.hintsByStage || {}).reduce((total, [, indices]) => {
    return total + (indices as number[]).reduce((sum: number, idx: number) => sum + (HINT_COSTS[idx] || 0), 0);
  }, 0) || (session.hintsUsed?.length || 0) * 15;
  const score = session.completedStages.length * 100 - hintPenalty;
  const progressPercent = Math.round((session.completedStages.length / 4) * 100);

  return (
    <div className="space-y-6" id="pwndora-dashboard">
      {/* Hero Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress Ring Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex items-center space-x-4 backdrop-blur-md relative overflow-hidden" id="card-progress">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl" />
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full border-4 border-zinc-800">
            <svg className="absolute w-16 h-16 -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-amber-500/10"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="32"
                cy="32"
                r="26"
                className="stroke-amber-500 transition-all duration-500"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - progressPercent / 100)}`}
              />
            </svg>
            <span className="text-sm font-mono font-bold text-amber-500">{progressPercent}%</span>
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">LAB COMPLETION</p>
            <h3 className="text-xl font-mono font-bold text-zinc-200 mt-0.5">
              {session.completedStages.length} / 4 <span className="text-xs text-zinc-500">STAGES</span>
            </h3>
          </div>
        </div>

        {/* Scoring Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex items-center space-x-4 backdrop-blur-md relative overflow-hidden" id="card-score">
          <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-amber-500">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">NET SCORE</p>
            <h3 className="text-xl font-mono font-bold text-zinc-200 mt-0.5">
              {score} <span className="text-xs text-zinc-500">PTS</span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
              Penalty increases per hint tier (10/20/30 pts)
            </p>
          </div>
        </div>

        {/* Timer Card */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex items-center space-x-4 backdrop-blur-md relative overflow-hidden" id="card-timer">
          <div className="p-3.5 bg-zinc-800/80 border border-zinc-700/50 rounded-lg text-zinc-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">ELAPSED TIME</p>
            <h3 className="text-xl font-mono font-bold text-zinc-200 mt-0.5">{elapsedTime}</h3>
            <p className="text-[10px] font-mono text-emerald-500/80 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {session.endTime ? "Completed" : "Clock ticking..."}
            </p>
          </div>
        </div>

        {/* Active Session Status */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-center backdrop-blur-md" id="card-operator">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">OPERATOR</p>
              <h3 className="text-lg font-mono font-semibold text-zinc-200 truncate max-w-[120px]">
                {session.username}
              </h3>
            </div>
            <button
              onClick={onReset}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              title="Reset Lab Session"
              id="btn-reset-session"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Stages vs. Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stages List */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-mono font-bold text-zinc-300 tracking-wider uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" /> Vulnerability Chain Progression
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">SEQUENTIAL GATING ACTIVE</span>
          </div>

          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const isLocked = stage.id > session.currentStage && !stage.isCompleted;
              const isActive = stage.id === session.currentStage && !stage.isCompleted;

              return (
                <div
                  key={stage.id}
                  className={`border rounded-lg p-4 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    stage.isCompleted
                      ? "bg-emerald-950/20 border-emerald-900/40"
                      : isActive
                      ? "bg-zinc-900/80 border-amber-500/55 shadow-sm shadow-amber-500/10"
                      : "bg-zinc-900/30 border-zinc-800/60 opacity-60"
                  }`}
                  id={`stage-card-${stage.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-zinc-500">0{stage.id}.</span>
                      <h4 className={`font-mono text-sm font-semibold ${stage.isCompleted ? "text-emerald-400" : "text-zinc-200"}`}>
                        {stage.name}
                      </h4>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        stage.isCompleted
                          ? "bg-emerald-500/10 text-emerald-400"
                          : isActive
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-zinc-800 text-zinc-500"
                      }`}>
                        {stage.category}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 max-w-md">{stage.description}</p>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 pt-1">
                      <span>Vulnerability: <span className="text-zinc-400">{stage.vulnerability}</span></span>
                      <span>Points: <span className="text-amber-500">{stage.points}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {stage.isCompleted ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-mono bg-emerald-500/5 px-2.5 py-1.5 border border-emerald-900/30 rounded-md">
                        <CheckCircle className="w-4 h-4" /> Compromised
                      </div>
                    ) : isLocked ? (
                      <div className="text-xs font-mono text-zinc-600 bg-zinc-950 px-2.5 py-1.5 border border-zinc-900 rounded-md select-none">
                        Locked
                      </div>
                    ) : (
                      <button
                        onClick={() => onSelectStage(stage.id)}
                        className="flex items-center gap-1.5 text-xs font-mono bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold px-3 py-1.5 rounded-md transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
                        id={`btn-launch-stage-${stage.id}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Attack Portal
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Red Team Lab Intel / Actions */}
        <div className="space-y-6">
          {/* Quick Guidance Panel */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-mono font-bold text-zinc-300 tracking-wider uppercase border-b border-zinc-800 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" /> Active Intel Briefing
            </h3>
            <div className="space-y-3">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Welcome to **PWNDORA**. This lab simulates a multi-stage attack pathway against the fictional <span className="text-amber-500">Meridian HR Portal</span>.
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Vulnerabilities are chained: you must find security gaps sequentially. Each stage completed unlocks the parameters needed to compromise the next stage.
              </p>
              <div className="bg-zinc-950/80 border border-zinc-800/60 p-3 rounded font-mono text-xs text-zinc-500 space-y-1">
                <span className="text-zinc-400">Tactical Directives:</span>
                <ul className="list-disc pl-4 space-y-1 mt-1 text-[11px]">
                  <li>Launch the portal from the active stage.</li>
                  <li>Use the hacker terminal to inspect API request streams.</li>
                  <li>Incorporate Code Review Mode to learn defenses.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reporting & Audit */}
          <div className="bg-gradient-to-br from-amber-950/20 via-zinc-900/60 to-zinc-900/60 border border-amber-500/10 rounded-xl p-5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-mono font-bold text-amber-500 tracking-wider uppercase border-b border-amber-500/10 pb-2">
              Penetration Audit Reporting
            </h3>
            <p className="text-xs text-zinc-400">
              Compile your exploit findings into a professional, industry-standard cybersecurity assessment report powered by Gemini AI.
            </p>
            <div className="space-y-2">
              <button
                onClick={onGenerateReport}
                disabled={loading}
                className="w-full text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 border border-zinc-700 hover:border-zinc-500 text-zinc-100 font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer"
                id="btn-trigger-report-gen"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" /> Analyzing Exploit Data...
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-4 h-4 text-amber-500" /> Generate Security Report
                  </>
                )}
              </button>
              {session.completedStages.length === 4 && (
                <p className="text-[10px] font-mono text-emerald-400 text-center animate-pulse">
                  ✓ Ready for Full Compliance Sign-Off!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lab Settings */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-zinc-300 block">External AI Co-Pilot (Gemini)</span>
            <span className="text-[10px] text-zinc-500">
              {geminiAvailable
                ? "API key detected. Enable for AI-assisted guidance."
                : "No API key configured — lab runs fully offline."}
            </span>
          </div>
          <button
            onClick={onToggleGemini}
            disabled={!geminiAvailable}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              geminiEnabled ? "bg-amber-500" : "bg-zinc-700"
            } ${!geminiAvailable ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                geminiEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
