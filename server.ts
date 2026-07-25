import "dotenv/config";
import express, { Request, Response } from "express";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { createServer as createViteServer } from "vite";
import { connectDB, getDB } from "./src/lib/mongo";
import { HackerLog, SessionState, Stage, User } from "./src/types";

const app = express();
const PORT = 3000;

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OpenRouter AI Client (OpenAI-compatible)
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
function getOpenRouterKey(): string | null {
  const key = process.env.OPEN_ROUTER_API;
  return key && key !== "sk-or-v1-placeholder" ? key : null;
}

async function callOpenRouter(
  messages: { role: string; content: string }[],
  systemPrompt?: string,
  jsonMode = false
): Promise<string> {
  const key = getOpenRouterKey();
  if (!key) throw new Error("OpenRouter API key not configured");

  const body: any = {
    model: "openai/gpt-4o-mini",
    messages: systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `OpenRouter API error (${res.status})`);
  return data.choices[0].message.content;
}

// ==========================================
// SESSION MANAGEMENT (MongoDB-backed)
// ==========================================
const COOKIE_NAME = "pwndora_sid";

function createDefaultSession(userId: string | null, username = "Spector"): SessionState {
  return {
    sessionId: crypto.randomUUID(),
    userId,
    username,
    startTime: Date.now(),
    endTime: null,
    currentStage: 1,
    completedStages: [],
    flagsFound: [],
    hintsUsed: [],
    hintsByStage: {},
    stageArtifacts: {},
    logs: [],
  };
}

function parseCookies(req: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((c) => {
    const [key, ...val] = c.split("=");
    if (key) cookies[key.trim()] = val.join("=").trim();
  });
  return cookies;
}

function getSessionId(req: Request): string | null {
  const cookies = parseCookies(req);
  return cookies[COOKIE_NAME] || null;
}

function setSessionCookie(res: Response, sessionId: string): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
}

async function getSessionFromDB(sessionId: string): Promise<SessionState | null> {
  const doc = await getDB().collection("sessions").findOne({ sessionId });
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as unknown as SessionState;
}

async function saveSessionToDB(session: SessionState): Promise<void> {
  await getDB().collection("sessions").updateOne(
    { sessionId: session.sessionId },
    { $set: session },
    { upsert: true }
  );
}

async function getOrCreateSession(req: Request, res: Response): Promise<SessionState> {
  const sid = getSessionId(req);
  if (sid) {
    const existing = await getSessionFromDB(sid);
    if (existing) return existing;
  }
  // Create new anonymous session
  const session = createDefaultSession(null);
  await saveSessionToDB(session);
  setSessionCookie(res, session.sessionId);
  return session;
}

async function getSession(req: Request): Promise<SessionState | null> {
  const sid = getSessionId(req);
  if (!sid) return null;
  return getSessionFromDB(sid);
}

// Define standard stages
const STAGES: Stage[] = [
  {
    id: 1,
    name: "Authentication Bypass",
    category: "Auth/Authz",
    vulnerability: "SQL Injection on Login",
    description: "Bypass the Meridian HR login screen to access the Administrator's Dashboard.",
    hints: [
      "The login form concatenates user input directly into a SQL query. Look at the email field — does it sanitize special characters?",
      "Try entering: admin@meridian.hr' OR '1'='1' -- in the email field. This closes the SQL string and adds a tautology (always-true condition).",
      "Full bypass payload: Email = admin@meridian.hr' OR '1'='1' -- , Password = anything. The -- comments out the password check, so authentication succeeds for the admin account.",
    ],
    flag: "FLAG{M3ridian_Auth_ByPass_2026}",
    points: 100,
    owaspCategory: "A03:2021 – Injection",
    mitreTechnique: "T1190",
    cweId: "CWE-89",
    cvssScore: 8.1,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
  },
  {
    id: 2,
    name: "Command Injection",
    category: "Injection",
    vulnerability: "OS Command Injection via Diagnostics",
    description: "Leverage the internal ping diagnostic tool to execute system commands and locate hidden backup credentials.",
    hints: [
      "The ping diagnostic tool takes a host parameter and passes it to a shell command. Can you append additional commands?",
      "Use a semicolon (;) or ampersand (&) to chain commands after the IP address. Try: 127.0.0.1; ls",
      "Read the secrets file: 127.0.0.1; cat /var/secrets/internal_endpoints.json — this reveals the SSRF vault URL and access token for Stage 3.",
    ],
    flag: "FLAG{C0mmand_In_T3st_9921}",
    points: 150,
    owaspCategory: "A03:2021 – Injection",
    mitreTechnique: "T1059.004",
    cweId: "CWE-78",
    cvssScore: 9.8,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  },
  {
    id: 3,
    name: "Server-Side Request Forgery",
    category: "SSRF/Server-side",
    vulnerability: "SSRF on Profile Parser",
    description: "Force the server to fetch credentials from the restricted internal metadata microservice found in Stage 2.",
    hints: [
      "The profile fetcher accepts any URL and fetches it server-side. What if you point it at an internal address instead of an external one?",
      "Use the resume importer profile tool with this URL: http://127.0.0.1:3000/api/internal/vault?token=SVC_KEY_7493201",
      "The SVC_KEY_7493201 token from Stage 2's secrets file unlocks the internal vault, which returns the admin JWT secret needed for Stage 4.",
    ],
    flag: "FLAG{SSRF_Vau1t_Bypas5_5512}",
    points: 200,
    owaspCategory: "A10:2021 – Server-Side Request Forgery",
    mitreTechnique: "T1190",
    cweId: "CWE-918",
    cvssScore: 7.5,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
  },
  {
    id: 4,
    name: "Privilege Escalation",
    category: "Privilege Escalation",
    vulnerability: "JWT Signature Forgery / Broken Access Control",
    description: "Forge an administrative token using the private key leaked from the SSRF vault, or invoke the elevated database sync with privileged headers.",
    hints: [
      "The database exfiltrate endpoint checks for a specific header and body parameters. Look at what headers it validates.",
      "Set the x-admin-key header to ADMIN_SIG_JWT_SECRET_XYZ_987 (leaked from the vault in Stage 3).",
      "Send POST to /api/meridian/database/exfiltrate with header x-admin-key: ADMIN_SIG_JWT_SECRET_XYZ_987 and body {\"elevate\": true, \"user\": \"admin@meridian.hr\"}.",
    ],
    flag: "FLAG{PR1V_ESC_EXFIL_8830_SUCCESS}",
    points: 250,
    owaspCategory: "A01:2021 – Broken Access Control",
    mitreTechnique: "T1078",
    cweId: "CWE-269",
    cvssScore: 9.1,
    cvssVector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
  },
];

// Log helper to add entries to the web-based Hacker Console
function addHackerLog(
  session: SessionState,
  method: string,
  path: string,
  payload: string,
  response: string,
  status: "SUCCESS" | "FAILED" | "INFO"
) {
  const logEntry: HackerLog = {
    id: Math.random().toString(36).substring(2, 9).toUpperCase(),
    timestamp: new Date().toLocaleTimeString(),
    method,
    path,
    payload: typeof payload === "string" ? payload : JSON.stringify(payload),
    response: typeof response === "string" ? response : JSON.stringify(response),
    status,
  };
  session.logs.unshift(logEntry);
  if (session.logs.length > 50) {
    session.logs.pop();
  }
  saveSessionToDB(session).catch(() => {});
}

// ==========================================
// 0. AUTH ROUTES
// ==========================================

// Register
app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = getDB();
  const existing = await db.collection("users").findOne({ email });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.collection("users").insertOne({
    email,
    password: hashedPassword,
    displayName: displayName || email.split("@")[0],
    role: "player",
    createdAt: new Date(),
    lastLogin: null,
  });

  // Create a session for the new user
  const session = createDefaultSession(result.insertedId.toString(), displayName || email.split("@")[0]);
  await db.collection("sessions").insertOne(session as any);
  setSessionCookie(res, session.sessionId);

  // Update lastLogin
  await db.collection("users").updateOne({ _id: result.insertedId }, { $set: { lastLogin: new Date() } });

  res.json({
    user: { email, displayName: displayName || email.split("@")[0], role: "player" },
    session,
  });
});

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = getDB();
  const user = await db.collection("users").findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password as string);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // Update lastLogin
  await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

  // Find or create session for this user
  let session = await db.collection("sessions").findOne({ userId: user._id.toString() }) as unknown as SessionState | null;
  if (!session) {
    session = createDefaultSession(user._id.toString(), (user as any).displayName || email.split("@")[0]);
    await db.collection("sessions").insertOne(session as any);
  }

  setSessionCookie(res, session.sessionId);

  res.json({
    user: { email, displayName: (user as any).displayName, role: user.role },
    session,
  });
});

// Logout
app.post("/api/auth/logout", async (req: Request, res: Response) => {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  res.json({ success: true });
});

// Get current user
app.get("/api/auth/me", async (req: Request, res: Response) => {
  const session = await getSession(req);
  if (!session || !session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const db = getDB();
  let user;
  try {
    user = await db.collection("users").findOne({ _id: new ObjectId(session.userId) });
  } catch {
    return res.status(401).json({ error: "Invalid session" });
  }
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  res.json({
    user: {
      email: user.email,
      displayName: (user as any).displayName,
      role: user.role,
    },
  });
});

// ==========================================
// 1. LAB PLATFORM CONTROL API ROUTES
// ==========================================

// Auth middleware for lab routes
function requireAuth(req: Request, res: Response, next: Function) {
  getSession(req).then((session) => {
    if (!session || !session.userId) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }
    (req as any)._session = session;
    next();
  }).catch(() => {
    res.status(500).json({ error: "Session lookup failed" });
  });
}

// Optional session getter for Meridian target routes (logs if session exists, doesn't block)
async function optionalSession(req: Request): Promise<SessionState> {
  try {
    const s = await getSession(req);
    if (s) return s;
  } catch {}
  // Fallback: ephemeral in-memory session for logging (not saved to DB)
  return createDefaultSession(null, "anonymous");
}

// Session getter for gated Meridian target routes (returns null + sends 401 if not authenticated)
async function requireMeridianSession(req: Request, res: Response): Promise<SessionState | null> {
  const session = await getSession(req);
  if (!session) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return null;
  }
  return session;
}

// Get current state
app.get("/api/lab/session", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any)._session as SessionState;
  res.json({
    session,
    stages: STAGES.map(({ id, name, category, description, points, owaspCategory, mitreTechnique, cweId, cvssScore, cvssVector }) => ({
      id,
      name,
      category,
      description,
      points,
      owaspCategory,
      mitreTechnique,
      cweId,
      cvssScore,
      cvssVector,
      isCompleted: session.completedStages.includes(id),
      hintUsed: session.hintsUsed.includes(id),
    })),
  });
});

// Reset lab state
app.post("/api/lab/reset", requireAuth, async (req: Request, res: Response) => {
  const oldSession = (req as any)._session as SessionState;
  const username = req.body.username || oldSession.username || "Spector";
  const newSession = createDefaultSession(oldSession.userId, username);
  newSession.sessionId = oldSession.sessionId; // Keep same session ID so cookie stays valid
  await saveSessionToDB(newSession);
  setSessionCookie(res, oldSession.sessionId);
  addHackerLog(newSession, "SYSTEM", "RESET", `Lab reset by ${username}`, "Session initialized back to Stage 1.", "INFO");
  res.json({ success: true, session: newSession });
});

// Get hints (up to 3 per stage with escalating costs: -10/-20/-30)
const HINT_COSTS = [10, 20, 30];

app.get("/api/lab/hint/:stageId", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any)._session as SessionState;
  const stageId = parseInt(req.params.stageId);
  const rawHintIndex = parseInt(req.query.hintIndex as string, 10);
  const hintIndex = Number.isInteger(rawHintIndex) ? rawHintIndex : 0;
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(404).json({ error: "Stage not found" });
  }

  if (hintIndex < 0 || hintIndex >= stage.hints.length) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(400).json({ error: "Invalid hint index" });
  }

  // Ensure hints are revealed sequentially
  const revealed = session.hintsByStage[stageId] || [];
  if (hintIndex > 0 && !revealed.includes(hintIndex - 1)) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    return res.status(400).json({ error: "You must reveal previous hints first" });
  }

  if (!revealed.includes(hintIndex)) {
    revealed.push(hintIndex);
    session.hintsByStage[stageId] = revealed;
    if (!session.hintsUsed.includes(stageId)) {
      session.hintsUsed.push(stageId);
    }
    saveSessionToDB(session).catch(() => {});
    addHackerLog(session, "HACKER", "RECON", `Requested hint ${hintIndex + 1}/3 for Stage ${stageId}: ${stage.name}`, `Hint revealed. Penalty: -${HINT_COSTS[hintIndex]} points.`, "INFO");
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  console.log(`[HINT] stage=${stageId} idx=${hintIndex} returning="${stage.hints[hintIndex]?.slice(0, 60)}"`);
  res.json({
    hint: stage.hints[hintIndex],
    hintIndex,
    cost: HINT_COSTS[hintIndex],
    totalHints: stage.hints.length,
    revealedCount: (session.hintsByStage[stageId] || []).length,
  });
});

// Flag submission validation
app.post("/api/lab/submit-flag", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any)._session as SessionState;
  const { flag } = req.body;
  if (!flag) {
    return res.status(400).json({ error: "Flag input is empty" });
  }

  const cleanFlag = flag.trim();
  const matchedStage = STAGES.find((s) => s.flag === cleanFlag);

  if (!matchedStage) {
    addHackerLog(session, "SUBMIT", "/api/lab/submit-flag", `Flag: ${cleanFlag}`, "INVALID FLAG SUBMITTED", "FAILED");
    return res.status(400).json({ success: false, error: "Incorrect flag. Analyze the vulnerability further." });
  }

  // Ensure stages are completed sequentially
  if (matchedStage.id > session.currentStage) {
    addHackerLog(
      session,
      "SUBMIT",
      "/api/lab/submit-flag",
      `Flag: ${cleanFlag}`,
      `Stage Out of Order. You must complete Stage ${session.currentStage} first!`,
      "FAILED"
    );
    return res.status(400).json({
      success: false,
      error: `Stage bypass detected! You must solve Stage ${session.currentStage} before submitting flags for Stage ${matchedStage.id}.`,
    });
  }

  if (session.completedStages.includes(matchedStage.id)) {
    return res.json({ success: true, message: "Flag already verified for this stage!", session });
  }

  // Record completion
  session.completedStages.push(matchedStage.id);
  session.flagsFound.push(cleanFlag);

  // Sign and store artifact for the completed stage
  const artifact = STAGE_ARTIFACTS[matchedStage.id];
  if (artifact) {
    session.stageArtifacts[matchedStage.id] = signArtifact(matchedStage.id, session.sessionId, artifact.value);
  }

  addHackerLog(
    session,
    "SUBMIT",
    "/api/lab/submit-flag",
    `Flag: ${cleanFlag}`,
    `CORRECT! Stage ${matchedStage.id} (${matchedStage.name}) completed successfully!`,
    "SUCCESS"
  );

  if (session.completedStages.length === STAGES.length) {
    session.endTime = Date.now();
    addHackerLog(session, "SYSTEM", "CONGRATULATIONS", "All stages cleared!", "Vulnerability chain fully compromised.", "SUCCESS");
  } else {
    session.currentStage = Math.max(...session.completedStages, 0) + 1;
  }

  saveSessionToDB(session).catch(() => {});
  res.json({ success: true, message: `Correct flag! Stage ${matchedStage.id} cleared.`, session });
});

// ==========================================
// 2. FICTIONAL TARGET: MERIDIAN HR PORTAL API
// ==========================================

// STAGE 1: Vulnerable Login Endpoint
app.post("/api/meridian/login", async (req: Request, res: Response) => {
  const session = await optionalSession(req);
  const { email, password } = req.body;

  // Log the raw incoming parameters for hacker inspection
  const payloadStr = `email="${email}", password="${password}"`;

  // SQL Injection vulnerable logic simulation
  // Realistic unescaped string check
  const isSQLiMatch =
    (email && (email.includes("' OR") || email.includes("'or") || email.includes("' OR '1'='1") || email.includes("' or '1'='1"))) ||
    (password && (password.includes("' OR") || password.includes("'or")));

  const isAdminEmail = email && email.toLowerCase().includes("admin");

  if (isSQLiMatch || (email === "admin@meridian.hr" && password === "superSecretAdminPass123")) {
    const responseBody = {
      authenticated: true,
      user: {
        email: "admin@meridian.hr",
        role: "HR_Administrator",
        token: "M3RIDIAN_ADMIN_SESSION_998231",
      },
      flag: STAGES[0].flag,
      message: "Welcome back, System Administrator. SQL bypass succeeded.",
    };

    addHackerLog(
      session,
      "POST",
      "/api/meridian/login",
      payloadStr,
      `200 OK - Authenticated. Flag: ${STAGES[0].flag}`,
      "SUCCESS"
    );

    return res.json(responseBody);
  } else {
    const errorBody = { authenticated: false, error: "Invalid credentials or database match failed." };
    addHackerLog(
      session,
      "POST",
      "/api/meridian/login",
      payloadStr,
      `401 Unauthorized - ${JSON.stringify(errorBody)}`,
      "FAILED"
    );
    return res.status(401).json(errorBody);
  }
});

// STAGE 2: Vulnerable Diagnostics Ping Tool
app.post("/api/meridian/diagnostics/ping", async (req: Request, res: Response) => {
  const session = await requireMeridianSession(req, res);
  if (!session) return;
  const { host } = req.body;

  if (!host) {
    return res.status(400).json({ error: "No host parameter provided" });
  }

  // Artifact gate: require Stage 1 completion before exposing command injection simulation
  if (!session.completedStages.includes(1) || !validateArtifact(session, 1)) {
    addHackerLog(session, "POST", "/api/meridian/diagnostics/ping", `host="${host}"`, "403 - Stage 1 artifact not validated", "FAILED");
    return res.status(403).json({ error: "Prerequisite stage not completed. Complete Stage 1 first." });
  }

  // Command injection simulation
  const input = host.trim();
  const hasInjection = input.includes(";") || input.includes("&") || input.includes("|") || input.includes("\n");

  let stdout = `PING ${host} (127.0.0.1) 56(84) bytes of data.\n`;
  stdout += `64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.045 ms\n`;
  stdout += `64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.038 ms\n`;
  stdout += `--- ${host} ping statistics ---\n`;
  stdout += `2 packets transmitted, 2 received, 0% packet loss, time 1004ms\n`;

  if (hasInjection) {
    // Check for specific target command executions
    const containsCatSecrets =
      input.includes("cat /var/secrets/internal_endpoints.json") ||
      input.includes("cat /var/secrets/*") ||
      (input.includes("cat") && input.includes("internal_endpoints"));

    const containsLs = input.includes("ls");
    const containsCatSecretTxt = input.includes("cat secret.txt");

    let injectedOutput = "\n[SYSTEM SHELL FORKED]\n";

    if (containsCatSecrets) {
      injectedOutput += `File: /var/secrets/internal_endpoints.json\n`;
      injectedOutput += JSON.stringify(
        {
          status: "ACTIVE",
          internal_metadata_service: "http://127.0.0.1:3000/api/internal/vault",
          ssrf_access_token: "SVC_KEY_7493201",
          note: "SSRF verification key for cloud parser sync.",
          flag: STAGES[1].flag,
        },
        null,
        2
      ) + "\n";

      addHackerLog(
        session,
        "POST",
        "/api/meridian/diagnostics/ping",
        `host="${host}"`,
        `200 OK - Compromised via command injection. Secret leaked. Flag: ${STAGES[1].flag}`,
        "SUCCESS"
      );
      stdout += injectedOutput;
    } else if (containsLs) {
      injectedOutput += `total 16\n`;
      injectedOutput += `drwxr-xr-x 2 microservice hr_staff 4096 Jul 10 22:15 .\n`;
      injectedOutput += `drwxr-xr-x 5 microservice hr_staff 4096 Jul 10 22:15 ..\n`;
      injectedOutput += `-rw-r----- 1 microservice hr_staff  242 Jul 10 22:15 internal_endpoints.json\n`;
      injectedOutput += `-rwxr-xr-x 1 microservice hr_staff  120 Jul 10 22:15 ping_diagnostic.sh\n`;
      injectedOutput += `-rw-r--r-- 1 microservice hr_staff   68 Jul 10 22:15 secret.txt\n`;
      stdout += injectedOutput;

      addHackerLog(
        session,
        "POST",
        "/api/meridian/diagnostics/ping",
        `host="${host}"`,
        `200 OK - Shell ls command executed`,
        "INFO"
      );
    } else if (containsCatSecretTxt) {
      injectedOutput += `File: secret.txt\n`;
      injectedOutput += `Keep digging! The vault file is at /var/secrets/internal_endpoints.json\n`;
      stdout += injectedOutput;

      addHackerLog(
        session,
        "POST",
        "/api/meridian/diagnostics/ping",
        `host="${host}"`,
        `200 OK - Read secret.txt`,
        "INFO"
      );
    } else {
      injectedOutput += `sh: command not found or restricted. Hint: read '/var/secrets/internal_endpoints.json'.\n`;
      stdout += injectedOutput;

      addHackerLog(
        session,
        "POST",
        "/api/meridian/diagnostics/ping",
        `host="${host}"`,
        `200 OK (Simulation Error) - Attempted command execution failed`,
        "FAILED"
      );
    }
  } else {
    addHackerLog(session, "POST", "/api/meridian/diagnostics/ping", `host="${host}"`, `200 OK - Safe ping run`, "INFO");
  }

  res.json({ output: stdout });
});

// STAGE 3: Vulnerable SSRF Profile Resume Parser
app.post("/api/meridian/admin/fetch-profile", async (req: Request, res: Response) => {
  const session = await requireMeridianSession(req, res);
  if (!session) return;
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "No profile URL parameter provided" });
  }

  addHackerLog(session, "POST", "/api/meridian/admin/fetch-profile", `url="${url}"`, "Proxying request to remote resource...", "INFO");

  // SSRF Vulnerability Simulator
  const targetUrl = url.trim();

  // If pointing to the simulated internal vault endpoint
  if (
    targetUrl.startsWith("http://127.0.0.1:3000/api/internal/vault") ||
    targetUrl.startsWith("http://localhost:3000/api/internal/vault") ||
    targetUrl.startsWith("http://localhost/api/internal/vault")
  ) {
    // Check token parameter
    const urlObj = new URL(targetUrl);
    const token = urlObj.searchParams.get("token");

    if (token === "SVC_KEY_7493201") {
      // Server-side artifact gate: require Stage 2 completion
      if (!session.completedStages.includes(2) || !validateArtifact(session, 2)) {
        addHackerLog(session, "POST", "/api/meridian/admin/fetch-profile", `url="${url}"`, "403 - Stage 2 artifact not validated", "FAILED");
        return res.json({
          status: "ERROR",
          remote_response_code: 403,
          content: JSON.stringify({ error: "Access Denied: SSRF token not validated. Complete Stage 2 first." }),
        });
      }

      const internalVaultData = {
        vault_identity: "Internal HR Encryption Key Vault",
        status: "DECRYPTED",
        vault_master_key: "ADMIN_SIG_JWT_SECRET_XYZ_987",
        privilege_escalation_endpoint: "/api/meridian/database/exfiltrate",
        required_headers: {
          "x-admin-key": "ADMIN_SIG_JWT_SECRET_XYZ_987",
        },
        flag: STAGES[2].flag,
        message: "SYSTEM ALERT: Unauthenticated SSRF loopback detected in container stack.",
      };

      addHackerLog(
        session,
        "POST",
        "/api/meridian/admin/fetch-profile",
        `url="${url}"`,
        `200 OK - SSRF Vault accessed! Internal Token Leaked! Flag: ${STAGES[2].flag}`,
        "SUCCESS"
      );

      return res.json({
        status: "SUCCESS",
        remote_response_code: 200,
        content: JSON.stringify(internalVaultData, null, 2),
      });
    } else {
      const rejectBody = { error: "Unidentified local loopback credential token." };
      addHackerLog(
        session,
        "POST",
        "/api/meridian/admin/fetch-profile",
        `url="${url}"`,
        `200 OK - Remote vault returned 403. Invalid loopback token.`,
        "FAILED"
      );
      return res.json({
        status: "ERROR",
        remote_response_code: 403,
        content: JSON.stringify(rejectBody),
      });
    }
  } else if (targetUrl.toLowerCase().includes("169.254.169.254")) {
    const cloudMetadata = {
      message: "Simulated AWS/GCP Metadata Endpoint: Access denied. Hint: Use the local server vault key found in Stage 2.",
    };
    return res.json({
      status: "SUCCESS",
      remote_response_code: 200,
      content: JSON.stringify(cloudMetadata),
    });
  } else {
    // Default mock response for regular external URLs
    const externalMock = `<html><body><p>Parsing external resume document at ${targetUrl}...</p><p>Error: Non-meridian standard format. Sync aborted.</p></body></html>`;
    addHackerLog(session, "POST", "/api/meridian/admin/fetch-profile", `url="${url}"`, "Processed external fetch - Parse Fail.", "FAILED");
    res.json({
      status: "SUCCESS",
      remote_response_code: 200,
      content: externalMock,
    });
  }
});

// STAGE 3 SIMULATED METADATA ENDPOINT (LOCKED TO INTERNAL LOCALHOST FETCH)
app.get("/api/internal/vault", (req: Request, res: Response) => {
  // Normally accessed via SSRF
  res.status(403).json({ error: "Access Denied: Local microservice locked to internal container network queries only." });
});

// STAGE 4: Privilege Escalation & Exfiltration Endpoint
app.post("/api/meridian/database/exfiltrate", async (req: Request, res: Response) => {
  const session = await requireMeridianSession(req, res);
  if (!session) return;
  const adminKeyHeader = req.headers["x-admin-key"];
  const { elevate, user } = req.body;

  const payloadStr = `Headers: x-admin-key="${adminKeyHeader}", Body: elevate=${elevate}, user="${user}"`;

  const isKeyValid = adminKeyHeader === "ADMIN_SIG_JWT_SECRET_XYZ_987";
  const isBodyValid = elevate === true && user === "admin@meridian.hr";

  // Server-side artifact gate: require Stage 3 completion
  const hasValidArtifact = session.completedStages.includes(3) && validateArtifact(session, 3);

  if (isKeyValid && isBodyValid && hasValidArtifact) {
    const exfiltratedDatabase = {
      executive_payroll_records: [
        { id: 1, name: "CEO Alistair Vance", base_salary: "$920,000", bonus: "15% equity", security_clearance: "L4" },
        { id: 2, name: "CFO Beatrice Thorne", base_salary: "$480,000", bonus: "$120,000", security_clearance: "L3" },
        { id: 3, name: "CTO Marcus Vance", base_salary: "$410,000", bonus: "$90,000", security_clearance: "L3" },
      ],
      system_flag: STAGES[3].flag,
      message: "CRITICAL: Administrative SQL Dump complete. Flag extracted successfully.",
    };

    addHackerLog(
      session,
      "POST",
      "/api/meridian/database/exfiltrate",
      payloadStr,
      `200 OK - EXECUTIVE DB EXFILTRATED! Flag: ${STAGES[3].flag}`,
      "SUCCESS"
    );

    return res.json(exfiltratedDatabase);
  } else {
    const failBody = {
      error: "Access Denied: Insufficient privilege level to execute direct database dump.",
      hint: "Requires SUPER_ADMIN signature key and administrative parameters inside request scope.",
    };

    addHackerLog(
      session,
      "POST",
      "/api/meridian/database/exfiltrate",
      payloadStr,
      `403 Forbidden - ${JSON.stringify(failBody)}`,
      "FAILED"
    );

    return res.status(403).json(failBody);
  }
});

// ==========================================
// 3. SETTINGS & GEMINI AI POWERED CO-PILOT & REPORTING
// ==========================================

// Settings endpoint - check if AI is available
app.get("/api/lab/settings", (req: Request, res: Response) => {
  res.json({
    geminiAvailable: !!getOpenRouterKey(),
  });
});

// AI Assistant Endpoint - Custom chatbot to help debug their payloads or explain security concepts
app.post("/api/lab/ai-assistant", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any)._session as SessionState;
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  // If OpenRouter API is not configured, fall back to helpful local rule-based security advice
  if (!getOpenRouterKey()) {
    const activeStage = STAGES[session.currentStage - 1] || STAGES[0];
    const mockAdvice = `[SANDBOX HINT ENGINE] (OpenRouter API key not configured in Settings > Secrets. Falling back to local offline support):
    
Currently, you are on Stage ${activeStage.id}: **${activeStage.name}** (${activeStage.category}).
- Objective: ${activeStage.description}
- Diagnostic Hint: ${activeStage.hints[0]}

*Tip: Set your 'OPEN_ROUTER_API' in your .env file to unlock full-stack AI co-pilot reasoning!*`;
    return res.json({ response: mockAdvice });
  }

  try {
    const activeStage = STAGES[session.currentStage - 1] || STAGES[0];
    const systemPrompt = `You are "PWNDORA", a sophisticated offensive cybersecurity simulation AI tutor.
The user is working through a gamified local security lab. You are here to guide them pedagogically, explaining vulnerabilities, teaching them how to test, but NOT giving them the exact flag directly. Focus on explanation, code diagnostics, and testing patterns.

Current Session Details:
- Active User: ${session.username}
- Current Active Stage: Stage ${activeStage.id} - ${activeStage.name} (${activeStage.category})
- Stage Vulnerability Description: ${activeStage.description}
- Stage Patched Code Tip: ${activeStage.hints[0]}
- Completed Stages so far: Stage IDs [${session.completedStages.join(", ")}]

Recent Activity Console Logs:
${JSON.stringify(session.logs.slice(0, 5), null, 2)}

Be technical, realistic, and support the roleplay as a friendly cyber security team trainer. Keep responses concise and focused on teaching the core concepts of the current stage.`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      systemPrompt
    );

    res.json({ response: text || "Assistant timed out. Try again." });
  } catch (err: any) {
    res.status(500).json({ error: `AI Assistant Error: ${err.message}` });
  }
});

// Pentest Report Generator Endpoint
app.post("/api/lab/generate-report", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any)._session as SessionState;

  const mockReport: any = {
    title: "PWNDORA COMPREHENSIVE PENETRATION TEST REPORT",
    target: "Meridian Enterprise HR Platform Stack",
    executiveSummary: `This security assessment was executed against the Meridian HR application suite to evaluate vulnerability chains and simulate real-world data-compromise paths. Under controlled execution, a complete four-stage compromise chain was simulated, progressing from initial external authentication bypass up to ultimate super-admin payroll data exfiltration.`,
    stages: STAGES.map((s) => {
      const isExploited = session.completedStages.includes(s.id);
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        impact: s.id === 4 ? "Critical" : s.id === 3 ? "High" : "Medium",
        exploitPoC: isExploited
          ? `SUCCESSFULLY EXPLOITED. Flag recovered: ${s.flag}.`
          : "PENDING ACTIVE SIMULATION WORK",
        remediation: s.id === 1
          ? "Replace string concatenation in SQL queries with parameterized prepared statements. Use an ORM (e.g., Prisma, TypeORM) or db.prepare() with bound parameters. Never interpolate user input into query strings. Implement input validation on email format before database lookup."
          : s.id === 2
          ? "Eliminate exec() / execSync() calls with shell interpolation. Use child_process.execFile() with an argument array, or spawn() with explicit args. Implement an allowlist of permitted characters (IPv4 regex) on the host parameter. Remove or restrict access to shell-based diagnostic tools in production."
          : s.id === 3
          ? "Implement a server-side URL allowlist for the profile fetcher. Block requests to loopback addresses (127.0.0.1, localhost, 0.0.0.0), private subnets (10.x, 172.16-31.x, 192.168.x), and link-local addresses (169.254.x). Use DNS resolution validation before fetching."
          : "Replace static x-admin-key header authentication with cryptographically signed, short-lived JWTs (RS256 or ES256). Include role claims in the token payload. Implement token refresh rotation. Use an authorization middleware that validates JWT signature, expiry, and role before granting access to sensitive endpoints.",
        status: isExploited ? "Exploited" : "Unresolved",
        owaspCategory: s.owaspCategory,
        mitreTechnique: s.mitreTechnique,
        cweId: s.cweId,
        cvssScore: s.cvssScore,
        cvssVector: s.cvssVector,
      };
    }),
    overallImpact: session.completedStages.length === 4 ? "CRITICAL RISK - Full Enterprise System Compromise" : "MEDIUM RISK - Partially Compromised Chain",
    recommendations: [
      "Transition all login queries to standardized Prepared Statements using modern SQL ORMs.",
      "Completely eliminate shell execution pathways from web applications; use robust sandboxed Node APIs for ping checks or deprecate administrative terminal tools.",
      "Implement a secure domain whitelist on remote resume parsers and loopback proxies, block localhost/127.0.0.1 subnet routes.",
      "Implement cryptographically signed server tokens (e.g. salted RSA-256 JWTs) for administrative tasks instead of relying on static header secrets.",
    ],
    generatedAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
  };

  if (!getOpenRouterKey()) {
    return res.json({ report: mockReport, note: "AI engine offline. Standard report template rendered." });
  }

  try {
    const prompt = `Generate an executive penetration test report based on the following state:
Completed Stages: ${JSON.stringify(session.completedStages)}
Stages Setup: ${JSON.stringify(STAGES)}
Hacker Logs: ${JSON.stringify(session.logs.slice(0, 10))}

Return a JSON document matching this structure:
{
  "title": "string",
  "target": "string",
  "executiveSummary": "string",
  "stages": [
    {
      "id": 1,
      "name": "string",
      "category": "string",
      "description": "string",
      "impact": "High" | "Critical" | "Medium",
      "exploitPoC": "string describing how the user bypassed/exploited this",
      "remediation": "string showing secure code or secure practices specific to this vulnerability type",
      "status": "Exploited" | "Unresolved",
      "owaspCategory": "string (e.g. A03:2021 – Injection)",
      "mitreTechnique": "string (e.g. T1190)",
      "cweId": "string (e.g. CWE-89)",
      "cvssScore": number (0.0-10.0),
      "cvssVector": "string (CVSS v3.1 vector)"
    }
  ],
  "overallImpact": "string",
  "recommendations": ["string", "string"],
  "generatedAt": "string"
}`;

    const text = await callOpenRouter(
      [{ role: "user", content: prompt }],
      "You are an expert Certified Ethical Hacker and Senior Cybersecurity Auditor. Output ONLY valid raw JSON conforming strictly to the requested schema. Do not enclose in markdown blocks.",
      true
    );

    const parsedReport = JSON.parse(text || "{}");
    res.json({ report: parsedReport });
  } catch (err: any) {
    res.json({ report: mockReport, error: err.message });
  }
});

// ==========================================
// STAGE ARTIFACT GATING (HMAC-signed tokens)
// ==========================================
const ARTIFACT_SECRET = process.env.ARTIFACT_SECRET || "pwndora-hmac-dev-secret";

// What each stage yields as an artifact
const STAGE_ARTIFACTS: Record<number, { key: string; value: string }> = {
  1: { key: "admin_token", value: "M3RIDIAN_ADMIN_SESSION_998231" },
  2: { key: "ssrf_token", value: "SVC_KEY_7493201" },
  3: { key: "admin_secret", value: "ADMIN_SIG_JWT_SECRET_XYZ_987" },
};

function signArtifact(stageId: number, sessionId: string, artifact: string): string {
  const payload = `${stageId}:${sessionId}:${artifact}:${Date.now()}`;
  const sig = crypto.createHmac("sha256", ARTIFACT_SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64")}.${sig}`;
}

function validateArtifact(session: SessionState, requiredStage: number): boolean {
  const token = session.stageArtifacts[requiredStage];
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, sig] = parts;
  const payload = Buffer.from(payloadB64, "base64").toString();
  const expectedSig = crypto.createHmac("sha256", ARTIFACT_SECRET).update(payload).digest("hex");
  return sig === expectedSig;
}

// Helper to calculate total hint penalty for a session
function calculateHintPenalty(session: SessionState): number {
  let penalty = 0;
  for (const [stageIdStr, indices] of Object.entries(session.hintsByStage)) {
    for (const idx of indices) {
      penalty += HINT_COSTS[idx] || 0;
    }
  }
  // Fallback for legacy sessions without hintsByStage
  if (penalty === 0 && session.hintsUsed.length > 0 && Object.keys(session.hintsByStage).length === 0) {
    penalty = session.hintsUsed.length * 15;
  }
  return penalty;
}

// Leaderboard route
app.get("/api/lab/leaderboard", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any)._session as SessionState;
  const userScore = session.completedStages.length * 100 - calculateHintPenalty(session);
  const userElapsed = session.endTime
    ? `${Math.floor((session.endTime - session.startTime) / 1000)}s`
    : `${Math.floor((Date.now() - session.startTime) / 1000)}s (active)`;

  const defaultLeaderboard = [
    { name: "0xSpecter", stagesCompleted: 4, timeElapsed: "112s", score: 385 },
    { name: "L33tGamer", stagesCompleted: 4, timeElapsed: "189s", score: 370 },
    { name: "CyberGoddess", stagesCompleted: 3, timeElapsed: "240s", score: 270 },
    { name: "MrRobot", stagesCompleted: 2, timeElapsed: "80s", score: 185 },
  ];

  // Append user to leaderboard dynamically
  const userEntry = {
    name: session.username,
    stagesCompleted: session.completedStages.length,
    timeElapsed: userElapsed,
    score: userScore,
    isUser: true,
  };

  const fullLeaderboard = [...defaultLeaderboard, userEntry].sort((a, b) => b.score - a.score);

  res.json({ leaderboard: fullLeaderboard });
});

// ==========================================
// 4. VITE DEV SERVER / PROD DIST ROUTING
// ==========================================

async function startServer() {
  // Connect to MongoDB first
  await connectDB();

  // Serve public directory for static assets (pptx, images, etc.)
  const publicPath = path.join(process.cwd(), "public");
  app.use(express.static(publicPath));

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PWNDORA] Lab server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();


