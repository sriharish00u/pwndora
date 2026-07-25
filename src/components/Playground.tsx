import React, { useState, useEffect, useRef } from "react";
import { Terminal, ShieldAlert, Cpu, HelpCircle, Eye, EyeOff, Send, Play, CornerDownLeft, Lock, Trash2, Key } from "lucide-react";
import { SessionState, Stage, HackerLog } from "../types";

interface PlaygroundProps {
  session: SessionState;
  stages: Stage[];
  onFlagSubmit: (flag: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  onRefreshSession: () => void;
}

export default function Playground({
  session,
  stages,
  onFlagSubmit,
  onRefreshSession,
}: PlaygroundProps) {
  const activeStage = stages.find((s) => s.id === session.currentStage) || stages[0];

  // Submission State
  const [flagInput, setFlagInput] = useState("");
  const [submitMessage, setSubmitMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Stage 1 (Login) States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginResult, setLoginResult] = useState<any | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Stage 2 (Ping Diagnostics) States
  const [pingHost, setPingHost] = useState("");
  const [pingOutput, setPingOutput] = useState("");
  const [pingRunning, setPingRunning] = useState(false);

  // Stage 3 (SSRF Resume Importer) States
  const [importUrl, setImportUrl] = useState("");
  const [importOutput, setImportOutput] = useState("");
  const [importRunning, setImportRunning] = useState(false);

  // Stage 4 (Privilege Escalation) States
  const [customHeader, setCustomHeader] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [privEscOutput, setPrivEscOutput] = useState("");
  const [privEscRunning, setPrivEscRunning] = useState(false);

  // Terminal & AI Assistant States
  const [terminalPrompt, setTerminalPrompt] = useState("");
  const [aiChatLogs, setAiChatLogs] = useState<{ sender: "user" | "pwndora"; text: string }[]>([
    {
      sender: "pwndora",
      text: "SYSTEM LNK ESTABLISHED. I am PWNDORA. Ask me questions about the target's source code, exploit mechanics, or general web security patterns. I am here to help you learn.",
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // State to reveal hints (progressive: up to 3 per stage)
  const HINT_COSTS = [10, 20, 30];
  const [viewedHints, setViewedHints] = useState<{ text: string; index: number; cost: number }[]>([]);
  const [revealingHint, setRevealingHint] = useState(false);
  const [revealingIndex, setRevealingIndex] = useState<number | null>(null);

  // Ref to chat container to scroll
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiChatLogs]);

  // Load Active Hints if already viewed on server
  useEffect(() => {
    const loadExistingHints = async () => {
      const hintsByStage = session.hintsByStage || {};
      const revealed = hintsByStage[activeStage.id] || [];
      if (revealed.length > 0) {
        const loaded: { text: string; index: number; cost: number }[] = [];
        for (const idx of revealed) {
          try {
            const res = await fetch(`/api/lab/hint/${activeStage.id}?hintIndex=${idx}`, { cache: "no-store" });
            const data = await res.json();
            if (data.hint) {
              loaded.push({ text: data.hint, index: idx, cost: HINT_COSTS[idx] || 0 });
            }
          } catch {}
        }
        loaded.sort((a, b) => a.index - b.index);
        setViewedHints(loaded);
      } else {
        setViewedHints([]);
      }
    };
    loadExistingHints();
  }, [session.currentStage]);

  // Handler for revealing a specific hint
  const handleGetHint = async (hintIndex: number) => {
    setRevealingHint(true);
    setRevealingIndex(hintIndex);
    try {
      const res = await fetch(`/api/lab/hint/${activeStage.id}?hintIndex=${hintIndex}`, { cache: "no-store" });
      const data = await res.json();
      if (data.hint) {
        setViewedHints((prev) => {
          const updated = [...prev.filter((h) => h.index !== hintIndex), { text: data.hint, index: hintIndex, cost: HINT_COSTS[hintIndex] || 0 }];
          updated.sort((a, b) => a.index - b.index);
          return updated;
        });
        onRefreshSession();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRevealingHint(false);
      setRevealingIndex(null);
    }
  };

  // Stage 1 (Login) submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginResult(null);
    try {
      const res = await fetch("/api/meridian/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (res.ok && data.authenticated) {
        setLoginResult(data);
        if (data.flag) {
          setFlagInput(data.flag); // Prefill for easy submission
        }
      } else {
        setLoginError(data.error || "Authentication failed");
      }
    } catch (err) {
      setLoginError("Failed to reach server authentication interface.");
    } finally {
      onRefreshSession();
    }
  };

  // Stage 2 (Ping) submission
  const handlePingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingHost) return;
    setPingRunning(true);
    setPingOutput("Initializing network shell diagnostics fork...\nping -c 2 " + pingHost + "\n");
    try {
      const res = await fetch("/api/meridian/diagnostics/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: pingHost }),
      });
      const data = await res.json();
      setPingOutput(data.output || "No output returned.");
    } catch (err) {
      setPingOutput("Diagnostic subprocess returned execution code error (Connection timed out).");
    } finally {
      setPingRunning(false);
      onRefreshSession();
    }
  };

  // Stage 3 (SSRF Importer) submission
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importUrl) return;
    setImportRunning(true);
    setImportOutput("Connecting to remote resource proxy parsing layer...\nFetching: " + importUrl + "\n");
    try {
      const res = await fetch("/api/meridian/admin/fetch-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (data.status === "SUCCESS") {
        setImportOutput(`HTTP Status Code: ${data.remote_response_code}\nContent Output:\n${data.content}`);
      } else {
        setImportOutput(`SSRF Fetch Error: remote server rejected or threw error.\nContent Output:\n${data.content}`);
      }
    } catch (err) {
      setImportOutput("Proxy parser timeout: host failed to respond inside frame subnet.");
    } finally {
      setImportRunning(false);
      onRefreshSession();
    }
  };

  // Stage 4 (Privilege Escalation) submission
  const handlePrivEscSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrivEscRunning(true);
    setPrivEscOutput("Sending elevated SQL exfiltration transaction...\n");

    let parsedBody = {};
    try {
      if (customBody) {
        parsedBody = JSON.parse(customBody);
      }
    } catch (err) {
      setPrivEscOutput("JSON PARSE ERROR: body parameters must be valid JSON.");
      setPrivEscRunning(false);
      return;
    }

    try {
      const headersObj: Record<string, string> = { "Content-Type": "application/json" };
      if (customHeader) {
        // e.g. "x-admin-key: ADMIN_SIG_XYZ" -> split by colon
        const parts = customHeader.split(":");
        if (parts.length >= 2) {
          headersObj[parts[0].trim()] = parts.slice(1).join(":").trim();
        }
      }

      const res = await fetch("/api/meridian/database/exfiltrate", {
        method: "POST",
        headers: headersObj,
        body: JSON.stringify(parsedBody),
      });
      const data = await res.json();
      if (res.ok) {
        setPrivEscOutput(`EXFILTRATION SUCCESS!\n\n${JSON.stringify(data, null, 2)}`);
        if (data.system_flag) {
          setFlagInput(data.system_flag);
        }
      } else {
        setPrivEscOutput(`DATABASE REJECT (403 Forbidden):\n\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setPrivEscOutput("Security gateway triggered intercept. Sync pipeline broken.");
    } finally {
      setPrivEscRunning(false);
      onRefreshSession();
    }
  };

  // Flag Submit Handler
  const handleFlagSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagInput) return;
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      const result = await onFlagSubmit(flagInput);
      if (result.success) {
        setSubmitMessage({ text: result.message || "Correct flag! Stage cleared.", success: true });
        setFlagInput("");
      } else {
        setSubmitMessage({ text: result.error || "Incorrect flag. Try again.", success: false });
      }
    } catch (err) {
      setSubmitMessage({ text: "Failed to submit flag. Network issue.", success: false });
    } finally {
      setSubmitting(false);
    }
  };

  // AI assistant console query
  const handleConsoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalPrompt.trim()) return;

    const query = terminalPrompt.trim();
    setTerminalPrompt("");
    setAiChatLogs((prev) => [...prev, { sender: "user", text: query }]);
    setAiLoading(true);

    try {
      const res = await fetch("/api/lab/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: query }),
      });
      const data = await res.json();
      setAiChatLogs((prev) => [...prev, { sender: "pwndora", text: data.response || "No response received." }]);
    } catch (err) {
      setAiChatLogs((prev) => [...prev, { sender: "pwndora", text: "CONNECTION INTERRUPTED: AI co-pilot offline." }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Quick preset queries for the terminal co-pilot
  const sendPresetQuery = (text: string) => {
    setTerminalPrompt(text);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="playground-workspace">
      {/* LEFT COLUMN: Target Enterprise Application (8 cols) */}
      <div className="xl:col-span-7 flex flex-col space-y-6">
        {/* Stage Active HUD banner */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center justify-between" id="active-hud-hud">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/35 rounded-lg text-amber-500 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">ACTIVE MISSION SURFACE</p>
              <h3 className="text-sm font-mono font-bold text-zinc-200">
                Stage {activeStage.id}: {activeStage.name}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-1 rounded">
              Gated Flag: L{activeStage.id}
            </span>
          </div>
        </div>

        {/* Fictional Sandbox HR App (Meridian HR portal) */}
        <div className="bg-zinc-100 rounded-2xl border border-zinc-300 shadow-xl overflow-hidden min-h-[480px] flex flex-col text-zinc-800" id="meridian-hr-sandbox">
          {/* Mock Browser Header Bar */}
          <div className="bg-zinc-200 border-b border-zinc-300 px-4 py-3 flex items-center justify-between select-none">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="bg-white/80 text-[10px] font-mono text-zinc-500 px-3 py-1 rounded-md border border-zinc-300 w-1/2 text-center truncate">
              http://internal-portal.meridian.hr/admin/login.php
            </div>
            <span className="text-[10px] font-bold text-zinc-500 tracking-wider">MERIDIAN HR v1.8</span>
          </div>

          {/* Sandbox Application Frame (Varies based on stage) */}
          <div className="flex-1 p-6 flex flex-col justify-center bg-zinc-50 font-sans">
            {session.completedStages.includes(activeStage.id) ? (
              <div className="text-center py-12 max-w-sm mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-300">
                  <Key className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-zinc-800">Stage {activeStage.id} Cleared!</h4>
                <p className="text-xs text-zinc-600">
                  You have compromised this section of the vulnerability chain. The secure key was recorded in your Red Team logs.
                </p>
                <div className="bg-zinc-100 border border-zinc-300 p-3 rounded font-mono text-xs select-all text-amber-600 font-semibold">
                  {activeStage.flag}
                </div>
                <p className="text-[10px] text-zinc-500">
                  Submit this token in the Red Team Console to advance.
                </p>
              </div>
            ) : activeStage.id === 1 ? (
              /* STAGE 1 WORKSPACE */
              <div className="max-w-md w-full mx-auto space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-extrabold text-indigo-900 tracking-tight">Meridian HR Solutions</h2>
                  <p className="text-xs text-zinc-500 mt-1">Personnel Administrative Portal Sync Layer</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm space-y-4" id="stage1-login-form">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">Corporate Email</label>
                    <input
                      type="text"
                      className="w-full text-sm bg-zinc-50 border border-zinc-300 rounded px-3 py-2 text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono"
                      placeholder="admin@meridian.hr"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">Security Password</label>
                    <input
                      type="password"
                      className="w-full text-sm bg-zinc-50 border border-zinc-300 rounded px-3 py-2 text-zinc-800 focus:outline-none focus:border-indigo-500"
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full text-xs font-bold uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded shadow transition-colors cursor-pointer"
                  >
                    Authorize Session
                  </button>
                </form>

                {loginError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-lg font-mono">
                    ⚠️ Error: {loginError}
                  </div>
                )}

                {loginResult && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl space-y-2">
                    <p className="font-bold">✓ SQL Bypass Successful!</p>
                    <p>Logged in as: <span className="font-semibold">{loginResult.user.email}</span> ({loginResult.user.role})</p>
                    <p>Secured stage flag: <span className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-900 select-all font-semibold">{loginResult.flag}</span></p>
                  </div>
                )}
              </div>
            ) : activeStage.id === 2 ? (
              /* STAGE 2 WORKSPACE */
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-1.5">
                    <Cpu className="w-5 h-5 text-indigo-600" /> Diagnostics Utility Hub
                  </h3>
                  <p className="text-xs text-zinc-500">Meridian Internal Web Server Node diagnostic tools.</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                  <form onSubmit={handlePingSubmit} className="flex gap-2" id="stage2-ping-form">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">Target Host Address (ping -c 3)</label>
                      <input
                        type="text"
                        className="w-full text-sm bg-zinc-50 border border-zinc-300 rounded px-3 py-2 text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="127.0.0.1"
                        value={pingHost}
                        onChange={(e) => setPingHost(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={pingRunning}
                      className="self-end text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white px-5 py-2.5 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {pingRunning ? "Pinging..." : "Execute"}
                    </button>
                  </form>

                  {pingOutput && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-500">TERMINAL OUTPUT</span>
                      <pre className="bg-zinc-950 text-emerald-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-52 leading-relaxed">
                        {pingOutput}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : activeStage.id === 3 ? (
              /* STAGE 3 WORKSPACE */
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-5 h-5 text-indigo-600" /> Profile Resume Parser Service
                  </h3>
                  <p className="text-xs text-zinc-500">Sync remote resumes or administrative certificates into corporate DB.</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                  <form onSubmit={handleImportSubmit} className="flex gap-2" id="stage3-import-form">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">Remote JSON/Document Document URL</label>
                      <input
                        type="text"
                        className="w-full text-sm bg-zinc-50 border border-zinc-300 rounded px-3 py-2 text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono"
                        placeholder="http://external-candidates.com/resume-881.json"
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={importRunning}
                      className="self-end text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-400 text-white px-5 py-2.5 rounded shadow transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {importRunning ? "Proxying..." : "Parse File"}
                    </button>
                  </form>

                  {importOutput && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-500">HTTP PROXY LOGS</span>
                      <pre className="bg-zinc-950 text-indigo-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-52 leading-relaxed whitespace-pre-wrap">
                        {importOutput}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* STAGE 4 WORKSPACE */
              <div className="space-y-6 max-w-2xl mx-auto w-full">
                <div className="border-b border-zinc-200 pb-3">
                  <h3 className="text-lg font-bold text-zinc-800 flex items-center gap-1.5">
                    <Lock className="w-5 h-5 text-indigo-600" /> Restricted Database Sync Tool
                  </h3>
                  <p className="text-xs text-zinc-500">Exfiltrate or sync payroll records database. Locked behind signature authentication.</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
                  <form onSubmit={handlePrivEscSubmit} className="space-y-3" id="stage4-exfil-form">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">Custom Auth Header (Key: Value)</label>
                        <input
                          type="text"
                          className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded px-2.5 py-2 text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono"
                          placeholder="x-admin-key: SECURITY_SIGNATURE"
                          value={customHeader}
                          onChange={(e) => setCustomHeader(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1">Request Body Parameters (JSON)</label>
                        <textarea
                          rows={2}
                          className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded px-2.5 py-1.5 text-zinc-800 focus:outline-none focus:border-indigo-500 font-mono"
                          placeholder='{"elevate": true, "user": "admin@meridian.hr"}'
                          value={customBody}
                          onChange={(e) => setCustomBody(e.target.value)}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={privEscRunning}
                      className="w-full text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white py-2.5 rounded shadow transition-colors cursor-pointer"
                    >
                      {privEscRunning ? "Interrogating DB Endpoint..." : "Send Request to DB Endpoint"}
                    </button>
                  </form>

                  {privEscOutput && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-500">METADATA RESPONSE</span>
                      <pre className="bg-zinc-950 text-red-400 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-52 leading-relaxed">
                        {privEscOutput}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source Code Inspector */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h4 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-wider">
              Vulnerable Source Code Inspector
            </h4>
            <span className="text-[10px] font-mono text-red-500">SECURITY GAP ISOLATED</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Examine the vulnerable backend controller processing requests in this stage:
          </p>
          <pre className="bg-zinc-950 p-4 rounded-lg font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed border border-zinc-800">
            {activeStage.id === 1 && `// server.ts - Vulnerable SQL concatenation
app.post("/api/meridian/login", (req, res) => {
  const { email, password } = req.body;
  
  // CRITICAL: Input is directly concatenated into a query without sanitization!
  const query = \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'\`;
  
  db.query(query, (err, user) => {
    if (user.length > 0) {
      res.json({ authenticated: true, flag: "FLAG{M3ridian_Auth_ByPass_2026}" });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });
});`}

            {activeStage.id === 2 && `// server.ts - OS Command Injection
app.post("/api/meridian/diagnostics/ping", (req, res) => {
  const { host } = req.body;
  
  // CRITICAL: Arbitrary shell execution allows piping or appending other commands!
  const command = \`ping -c 3 \${host}\`;
  
  exec(command, (error, stdout, stderr) => {
    res.json({ output: stdout });
  });
});`}

            {activeStage.id === 3 && `// server.ts - Server Side Request Forgery (SSRF)
app.post("/api/meridian/admin/fetch-profile", async (req, res) => {
  const { url } = req.body;
  
  // CRITICAL: Server proxies arbitrary external links, exposing local loopback ports (3000)
  // and cloud metadata endpoints (169.254.169.254)!
  try {
    const remoteResponse = await fetch(url);
    const content = await remoteResponse.text();
    res.json({ status: "SUCCESS", content });
  } catch(err) {
    res.status(500).json({ error: "Fetch failed" });
  }
});`}

            {activeStage.id === 4 && `// server.ts - Privilege Escalation via Static Secret
app.post("/api/meridian/database/exfiltrate", (req, res) => {
  const adminKeyHeader = req.headers["x-admin-key"];
  const { elevate, user } = req.body;
  
  // CRITICAL: Static cryptographic keys leaked in Stage 3 SSRF allow full DB dump.
  // Weak validation check bypasses actual secure authentication/role controls.
  if (adminKeyHeader === "ADMIN_SIG_JWT_SECRET_XYZ_987" && elevate === true) {
    res.json({ executive_payroll_records: [...], system_flag: "FLAG{PR1V_ESC_EXFIL_8830_SUCCESS}" });
  } else {
    res.status(403).json({ error: "Access Denied" });
  }
});`}
          </pre>
        </div>
      </div>

      {/* RIGHT COLUMN: Red Team Command Console, Interceptor Logs, & Flag Submission (5 cols) */}
      <div className="xl:col-span-5 flex flex-col space-y-6">
        {/* Intercepted Proxy Log / Burp-Suite Style */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-500 animate-pulse" /> intercepted api logs
            </h3>
            <button
              onClick={onRefreshSession}
              className="text-[10px] font-mono hover:text-zinc-200 text-zinc-500 flex items-center gap-1 cursor-pointer"
            >
              Clear Buffer
            </button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto font-mono pr-1" id="proxy-log-buffer">
            {session.logs.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No network actions intercepted yet. Interrogating ports...</p>
            ) : (
              session.logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-zinc-950 p-2.5 rounded border border-zinc-900 text-[10px] leading-relaxed space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      log.status === "SUCCESS"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : log.status === "FAILED"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-amber-500 font-bold">{log.method}</span>{" "}
                    <span className="text-zinc-300">{log.path}</span>
                  </div>
                  <div className="text-zinc-500 truncate">
                    Payload: <span className="text-zinc-400 font-mono">{log.payload}</span>
                  </div>
                  <div className="text-zinc-500 truncate">
                    Response: <span className="text-zinc-400 font-mono">{log.response}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Flag Submission Console */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-mono font-bold text-zinc-300 tracking-wider uppercase border-b border-zinc-800 pb-2">
            Submit Captured Flag
          </h3>

          <form onSubmit={handleFlagSubmitForm} className="space-y-3" id="flag-submission-form">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">Flag Format: FLAG{`{...}`}</label>
              <input
                type="text"
                className="w-full text-xs font-mono bg-zinc-950 border border-zinc-800 rounded p-2.5 text-zinc-200 focus:outline-none focus:border-amber-500 placeholder-zinc-700"
                placeholder="FLAG{M3ridian_...}"
                value={flagInput}
                onChange={(e) => setFlagInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !flagInput}
              className="w-full text-xs font-mono bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-2 px-3 rounded shadow cursor-pointer transition-colors"
            >
              {submitting ? "Verifying Token..." : "Submit Flag & Unlock Sequence"}
            </button>
          </form>

          {submitMessage && (
            <div className={`p-3 rounded text-xs font-mono ${
              submitMessage.success
                ? "bg-emerald-950/30 border border-emerald-800/50 text-emerald-400"
                : "bg-red-950/30 border border-red-800/50 text-red-400"
            }`}>
              {submitMessage.text}
            </div>
          )}
        </div>

        {/* PWNDORA AI Cyber Security Co-Pilot */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex-1 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <h3 className="text-xs font-mono font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-amber-500" /> PWNDORA AI TUTOR
            </h3>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-500">
              GEMINI MODEL ACTIVE
            </span>
          </div>

          {/* AI Chatlogs */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-72 text-xs font-mono pr-1 mb-3">
            {aiChatLogs.map((log, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${log.sender === "pwndora" ? "bg-zinc-950 text-zinc-300 border border-zinc-900" : "bg-amber-500/10 text-amber-400 self-end border border-amber-500/10"}`}>
                <span className="text-[10px] font-bold block mb-1 text-zinc-500">
                  {log.sender === "pwndora" ? "◤ PWNDORA" : "◤ USER"}
                </span>
                <p className="leading-relaxed whitespace-pre-wrap">{log.text}</p>
              </div>
            ))}
            {aiLoading && (
              <div className="p-3 rounded-lg bg-zinc-950 text-zinc-500 border border-zinc-900 animate-pulse">
                ◤ PWNDORA is formulating response stream...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Helper Preset chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => sendPresetQuery(`Explain the core vulnerability in Stage ${activeStage.id}`)}
              className="text-[10px] font-mono bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Explain Vulnerability
            </button>
            <button
              onClick={() => sendPresetQuery(`Provide generic payload syntax for Stage ${activeStage.id}`)}
              className="text-[10px] font-mono bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Payload Syntax
            </button>
            <button
              onClick={() => sendPresetQuery("How does sequentially chaining attacks make an audit more comprehensive?")}
              className="text-[10px] font-mono bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Why chain attacks?
            </button>
          </div>

          {/* Prompt Entry Form */}
          <form onSubmit={handleConsoleSubmit} className="flex gap-2" id="ai-tutor-form">
            <input
              type="text"
              disabled={aiLoading}
              className="flex-1 bg-zinc-950 text-xs font-mono border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 placeholder-zinc-700"
              placeholder="Query co-pilot tutor..."
              value={terminalPrompt}
              onChange={(e) => setTerminalPrompt(e.target.value)}
            />
            <button
              type="submit"
              disabled={aiLoading || !terminalPrompt.trim()}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 p-2 rounded text-zinc-300 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Stage Hint Reveal section */}
          <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2">
            {viewedHints.length > 0 && (
              <div className="space-y-2">
                {viewedHints.map((h) => (
                  <div key={h.index} className="bg-amber-950/15 border border-amber-900/35 p-3 rounded-lg text-xs leading-relaxed text-amber-300">
                    <span className="font-bold block mb-0.5 text-amber-400">Tactical Hint {h.index + 1}/3 (−{h.cost} pts):</span>
                    {h.text}
                  </div>
                ))}
              </div>
            )}
            {viewedHints.length < 3 && (
              <button
                onClick={() => handleGetHint(viewedHints.length)}
                disabled={revealingHint}
                className="w-full text-[10px] font-mono bg-zinc-950 hover:bg-zinc-800 text-zinc-500 py-2 border border-zinc-800/80 rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {revealingHint && revealingIndex === viewedHints.length
                  ? "Decrypting Hint..."
                  : `Reveal Hint ${viewedHints.length + 1}/3 (−${HINT_COSTS[viewedHints.length]} points)`}
              </button>
            )}
            {viewedHints.length >= 3 && (
              <div className="text-[10px] font-mono text-zinc-600 text-center py-1">
                All hints revealed for this stage
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
