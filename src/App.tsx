import React, { useEffect, useState } from "react";
import { ShieldAlert, Cpu, Award, Trophy, FileCode, FileText, RefreshCw, Layers, ShieldCheck, LogOut, Lock, UserPlus } from "lucide-react";
import { SessionState, Stage, LeaderboardEntry, PentestReport } from "./types";
import Dashboard from "./components/Dashboard";
import Playground from "./components/Playground";
import CodeReview from "./components/CodeReview";
import ReportViewer from "./components/ReportViewer";
import Leaderboard from "./components/Leaderboard";
import LandingPage from "./components/LandingPage";

export default function App() {
  // Auth state
  const [user, setUser] = useState<{ email: string; displayName: string; role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showAuth, setShowAuth] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Lab state
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [session, setSession] = useState<SessionState | null>(null);
  const [stages, setStages] = useState<(Stage & { isCompleted: boolean; hintUsed: boolean })[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [report, setReport] = useState<PentestReport | null>(null);

  // Loading states
  const [fetchingSession, setFetchingSession] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Gemini AI toggle (off by default for offline-first operation)
  const [geminiEnabled, setGeminiEnabled] = useState<boolean>(() => {
    return localStorage.getItem("pwndora_gemini") === "true";
  });
  const [geminiAvailable, setGeminiAvailable] = useState<boolean>(false);

  // Real-time Clock UTC State
  const [currentTimeUTC, setCurrentTimeUTC] = useState<string>("");

  // Check auth on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  // Fetch session state from Express backend
  const fetchSessionState = async () => {
    try {
      const res = await fetch("/api/lab/session");
      if (res.status === 401) {
        setUser(null);
        return;
      }
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setStages(data.stages);
      }
    } catch (err) {
      console.error("Failed to sync PWNDORA lab state:", err);
    } finally {
      setFetchingSession(false);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/lab/settings");
      const data = await res.json();
      setGeminiAvailable(data.geminiAvailable);
    } catch {}
  };

  // Fetch leaderboard state
  const fetchLeaderboardState = async () => {
    setLeaderboardLoading(true);
    try {
      const res = await fetch("/api/lab/leaderboard");
      if (res.status === 401) return;
      const data = await res.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.error("Failed to load leaderboard ranks:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const toggleGemini = () => {
    const next = !geminiEnabled;
    setGeminiEnabled(next);
    localStorage.setItem("pwndora_gemini", String(next));
  };

  // Fetch lab data when user is authenticated
  useEffect(() => {
    if (user) {
      fetchSessionState();
      fetchLeaderboardState();
      fetchSettings();
    }
    // UTC time ticking
    const clockTimer = setInterval(() => {
      const now = new Date();
      const utcString = now.toUTCString().replace("GMT", "UTC");
      setCurrentTimeUTC(utcString);
    }, 1000);
    return () => clearInterval(clockTimer);
  }, [user]);

  // Sync state whenever tab changes to ensure fresh data
  useEffect(() => {
    if (!user) return;
    if (activeTab === "leaderboard") {
      fetchLeaderboardState();
    } else {
      fetchSessionState();
    }
  }, [activeTab]);

  // Auth handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);
    try {
      const url = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email: authEmail, password: authPassword };
      if (authMode === "register") body.displayName = authDisplayName;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed");
        return;
      }
      setUser(data.user);
      setAuthEmail("");
      setAuthPassword("");
      setAuthDisplayName("");
    } catch {
      setAuthError("Network error. Please try again.");
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSession(null);
    setStages([]);
    setReport(null);
    setActiveTab("dashboard");
  };

  // Handle stage selection (from dashboard button click)
  const handleSelectStage = (stageId: number) => {
    setActiveTab("playground");
  };

  // Reset Lab session
  const handleResetLab = async () => {
    if (
      !window.confirm(
        "Are you sure you want to RESET your lab progression? This will wipe your captured flags, points, and event logs!"
      )
    ) {
      return;
    }

    setFetchingSession(true);
    try {
      const res = await fetch("/api/lab/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user?.displayName || "Spector" }),
      });
      if (res.ok) {
        setReport(null);
        setActiveTab("dashboard");
        await fetchSessionState();
        await fetchLeaderboardState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingSession(false);
    }
  };

  // Generate compliance Pentest report using Gemini API
  const handleGenerateReport = async () => {
    setReportLoading(true);
    setActiveTab("report");
    try {
      const res = await fetch("/api/lab/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      }
    } catch (err) {
      console.error("Report gen failed:", err);
    } finally {
      setReportLoading(false);
    }
  };

  // Flag Submission Handler (gated sequentially on server)
  const handleFlagSubmit = async (flag: string) => {
    try {
      const res = await fetch("/api/lab/submit-flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSession(data.session);
        await fetchSessionState();
        await fetchLeaderboardState();
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || "Incorrect flag. Try again!" };
      }
    } catch (err) {
      return { success: false, error: "Network error submitting flag." };
    }
  };

  const [copied, setCopied] = useState(false);
  const handleCopyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Auth Loading Screen ──
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center font-mono space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-zinc-400 uppercase tracking-widest">
          Initializing PWNDORA Lab...
        </p>
      </div>
    );
  }

  // ── Login / Register Screen ──
  if (!user) {
    if (showAuth) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center font-mono">
          <button
            onClick={() => setShowAuth(false)}
            className="absolute top-6 left-6 text-xs font-mono text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            &larr; Back to Home
          </button>
          <div className="w-full max-w-sm space-y-6 px-4">
            <div className="text-center space-y-2">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-orange-500 rounded-lg text-zinc-950 font-bold w-fit mx-auto">
                <Layers className="w-8 h-8" />
              </div>
              <h1 className="text-lg font-extrabold tracking-wider text-zinc-100">
                PWNDORA // VULNERABILITY CHAIN LAB
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                Authentication Required
              </p>
            </div>

            <form onSubmit={handleAuth} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex gap-1 border-b border-zinc-800 pb-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`flex-1 text-xs font-mono font-bold uppercase py-1.5 transition-colors cursor-pointer ${
                    authMode === "login" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 inline mr-1" /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`flex-1 text-xs font-mono font-bold uppercase py-1.5 transition-colors cursor-pointer ${
                    authMode === "register" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1" /> Register
                </button>
              </div>

              {authMode === "register" && (
                <input
                  type="text"
                  placeholder="Display Name"
                  value={authDisplayName}
                  onChange={(e) => setAuthDisplayName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />

              {authError && (
                <p className="text-[11px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-400 hover:to-orange-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold text-xs font-mono uppercase py-2.5 rounded transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                {authSubmitting ? "Authenticating..." : authMode === "login" ? "Access Lab" : "Create Account"}
              </button>

              <p className="text-[10px] text-zinc-600 text-center">
                {authMode === "login"
                  ? "Sample: test@pwndora / test@123"
                  : "Create a new operator account"}
              </p>
            </form>
          </div>
        </div>
      );
    }

    return <LandingPage onShowAuth={() => setShowAuth(true)} />;
  }

  // ── Lab Loading Screen ──
  if (fetchingSession || !session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center font-mono space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-xs text-zinc-400 uppercase tracking-widest">
          Establishing Secure Pipeline to PWNDORA Lab Core...
        </p>
      </div>
    );
  }

  const HINT_COSTS = [10, 20, 30];
  const hintPenalty = Object.entries(session.hintsByStage || {}).reduce((total, [stageId, indices]) => {
    return total + (indices as number[]).reduce((sum: number, idx: number) => sum + (HINT_COSTS[idx] || 0), 0);
  }, 0) || (session.hintsUsed?.length || 0) * 15;
  const overallScore = session.completedStages.length * 100 - hintPenalty;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navigation / Status Header Bar */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-red-600 rounded-lg text-zinc-950 font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider text-zinc-100">
                PWNDORA // VULNERABILITY CHAIN LAB
              </h1>
              <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider animate-pulse">
                RED TEAM LIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider mt-0.5">
              Multi-Stage Web Exploitation Training & Audit Sandbox
            </p>
          </div>
        </div>

        {/* Global Operational HUD Metrics */}
        <div className="flex flex-wrap items-center gap-6 text-[11px] bg-zinc-950/60 border border-zinc-800/80 rounded-lg px-4 py-2">
          <div>
            <span className="text-zinc-500 mr-1">OPERATOR:</span>
            <span className="text-zinc-200 font-bold">{user.displayName}</span>
          </div>
          <div className="hidden md:block text-zinc-800">|</div>
          <div>
            <span className="text-zinc-500 mr-1">COMPLETED:</span>
            <span className="text-emerald-400 font-bold">{session.completedStages.length} / 4</span>
          </div>
          <div className="hidden md:block text-zinc-800">|</div>
          <div>
            <span className="text-zinc-500 mr-1">SCORE:</span>
            <span className="text-amber-500 font-bold">{overallScore} pts</span>
          </div>
          <div className="hidden md:block text-zinc-800">|</div>
          <div className="text-zinc-400 tabular-nums">
            {currentTimeUTC || "UTC SERVER CLOCK ACTIVE"}
          </div>
          <div className="hidden md:block text-zinc-800">|</div>
          <button
            onClick={handleLogout}
            className="text-zinc-500 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col space-y-6">
        {/* Navigation Tabs Bar */}
        <nav className="flex flex-wrap gap-1 border-b border-zinc-800 pb-1 select-none">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2.5 font-mono text-xs font-bold uppercase border-t-2 border-x transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "dashboard"
                ? "border-t-amber-500 border-x-zinc-800 bg-zinc-900 text-amber-500 rounded-t-lg"
                : "border-t-transparent border-x-transparent text-zinc-500 hover:text-zinc-300"
            }`}
            id="tab-dashboard"
          >
            <Cpu className="w-4 h-4" /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`px-4 py-2.5 font-mono text-xs font-bold uppercase border-t-2 border-x transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "playground"
                ? "border-t-amber-500 border-x-zinc-800 bg-zinc-900 text-amber-500 rounded-t-lg"
                : "border-t-transparent border-x-transparent text-zinc-500 hover:text-zinc-300"
            }`}
            id="tab-playground"
          >
            <ShieldAlert className="w-4 h-4" /> Attack Playground
          </button>

          <button
            onClick={() => setActiveTab("codereview")}
            className={`px-4 py-2.5 font-mono text-xs font-bold uppercase border-t-2 border-x transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "codereview"
                ? "border-t-amber-500 border-x-zinc-800 bg-zinc-900 text-amber-500 rounded-t-lg"
                : "border-t-transparent border-x-transparent text-zinc-500 hover:text-zinc-300"
            }`}
            id="tab-codereview"
          >
            <FileCode className="w-4 h-4" /> Defensive Code Review
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2.5 font-mono text-xs font-bold uppercase border-t-2 border-x transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "report"
                ? "border-t-amber-500 border-x-zinc-800 bg-zinc-900 text-amber-500 rounded-t-lg"
                : "border-t-transparent border-x-transparent text-zinc-500 hover:text-zinc-300"
            }`}
            id="tab-report"
          >
            <FileText className="w-4 h-4" /> Pentest Compliance Report
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2.5 font-mono text-xs font-bold uppercase border-t-2 border-x transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              activeTab === "leaderboard"
                ? "border-t-amber-500 border-x-zinc-800 bg-zinc-900 text-amber-500 rounded-t-lg"
                : "border-t-transparent border-x-transparent text-zinc-500 hover:text-zinc-300"
            }`}
            id="tab-leaderboard"
          >
            <Trophy className="w-4 h-4" /> Leaderboard
          </button>
        </nav>

        {/* Tab Content Panels */}
        <main className="flex-1">
          {activeTab === "dashboard" && (
            <Dashboard
              session={session}
              stages={stages}
              onSelectStage={handleSelectStage}
              onReset={handleResetLab}
              onGenerateReport={handleGenerateReport}
              loading={reportLoading}
              onNavigateToTab={setActiveTab}
              geminiEnabled={geminiEnabled}
              geminiAvailable={geminiAvailable}
              onToggleGemini={toggleGemini}
            />
          )}

          {activeTab === "playground" && (
            <Playground
              session={session}
              stages={stages}
              onFlagSubmit={handleFlagSubmit}
              onRefreshSession={fetchSessionState}
            />
          )}

          {activeTab === "codereview" && (
            <CodeReview stages={stages} currentStageId={session.currentStage} />
          )}

          {activeTab === "report" && (
            <ReportViewer report={report} onCopyReport={handleCopyReport} copied={copied} />
          )}

          {activeTab === "leaderboard" && (
            <Leaderboard
              entries={leaderboard}
              onRefresh={fetchLeaderboardState}
              loading={leaderboardLoading}
            />
          )}
        </main>
      </div>

      {/* Footer Info Statement */}
      <footer className="bg-zinc-900/50 border-t border-zinc-900 px-6 py-4 text-center select-none">
        <p className="text-[10px] text-zinc-600 font-mono tracking-wider">
          PWNDORA SECURITY LABS • LICENSED EDUCATIONAL MATERIAL FOR CYBER COMPLIANCE TRAINING • INTERNAL CONTAINER DEPLOYMENT
        </p>
      </footer>
    </div>
  );

}
