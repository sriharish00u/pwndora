import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, FileCode, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { Stage } from "../types";

interface CodeReviewProps {
  stages: Stage[];
  currentStageId: number;
}

export default function CodeReview({ stages, currentStageId }: CodeReviewProps) {
  const [selectedStageId, setSelectedStageId] = useState<number>(currentStageId);

  const selectedStage = stages.find((s) => s.id === selectedStageId) || stages[0];

  return (
    <div className="space-y-6" id="defensive-code-review">
      {/* Selector tab row */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
        {stages.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStageId(s.id)}
            className={`px-4 py-2 font-mono text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              selectedStageId === s.id
                ? "bg-amber-500/10 border-amber-500 text-amber-500"
                : "bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <div>Stage 0{s.id}: {s.category}</div>
            <div className="text-[9px] opacity-60 mt-0.5">
              {s.cweId} • CVSS {s.cvssScore}
            </div>
          </button>
        ))}
      </div>

      {/* Code Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vulnerable Side */}
        <div className="bg-zinc-950 border border-red-900/40 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-red-950/15 border-b border-red-900/30 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Vulnerable Implementation
            </span>
            <span className="text-[10px] font-mono text-red-500/80">RISK: EXPLOITABLE</span>
          </div>
          <div className="p-4 flex-1">
            <pre className="text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed h-96 select-text">
              {selectedStageId === 1 && `// server.ts - INSECURE LOGIN ROUTE
app.post("/api/meridian/login", (req, res) => {
  const { email, password } = req.body;

  // CRITICAL FAILURE: Direct SQL interpolation.
  // This allows SQL Injection because the database engine
  // interprets special characters like single quotes (') 
  // as query separators instead of raw string values.
  const query = \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'\`;

  db.query(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length > 0) {
      res.json({ authenticated: true, user: rows[0] });
    } else {
      res.status(401).json({ error: "Invalid login" });
    }
  });
});`}

              {selectedStageId === 2 && `// server.ts - INSECURE DIAGNOSTICS ROUTE
app.post("/api/meridian/diagnostics/ping", (req, res) => {
  const { host } = req.body;

  // CRITICAL FAILURE: Shell command concatenation.
  // Passing unsanitized user inputs straight to shell
  // interpreters (exec) lets attackers append commands
  // using operators like ';', '&&', or '|'.
  const command = \`ping -c 3 \${host}\`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ output: stdout });
  });
});`}

              {selectedStageId === 3 && `// server.ts - INSECURE SSRF PROXY ROUTE
app.post("/api/meridian/admin/fetch-profile", async (req, res) => {
  const { url } = req.body;

  // CRITICAL FAILURE: Unrestricted remote resource fetch.
  // The backend fetches any web URL provided. This allows
  // attackers to access internal-only services (such as
  // localhost, metadata endpoints, or cloud keys) which 
  // are normally hidden behind firewalls.
  try {
    const remoteResponse = await fetch(url);
    const content = await remoteResponse.text();
    res.json({ status: "SUCCESS", content });
  } catch (err) {
    res.status(500).json({ error: "Fetch pipeline failed" });
  }
});`}

              {selectedStageId === 4 && `// server.ts - INSECURE EXFILTRATION VALIDATION
app.post("/api/meridian/database/exfiltrate", (req, res) => {
  const adminKeyHeader = req.headers["x-admin-key"];
  const { elevate, user } = req.body;

  // CRITICAL FAILURE: Static password / bypass token validation.
  // Using static tokens (e.g. from env files) leaked in SSRF
  // bypassing actual session identity validation or JWT checks
  // enables administrative privilege escalation.
  if (adminKeyHeader === "ADMIN_SIG_JWT_SECRET_XYZ_987") {
    // Release critical corporate DB
    res.json({ sensitive_database_records: [...] });
  } else {
    res.status(403).json({ error: "Unauthorized" });
  }
});`}
            </pre>
          </div>
        </div>

        {/* Patched Side */}
        <div className="bg-zinc-950 border border-emerald-900/40 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-emerald-950/15 border-b border-emerald-900/30 px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> SECURE DEFENSE (PATCHED)
            </span>
            <span className="text-[10px] font-mono text-emerald-500/80">REMEDIATED</span>
          </div>
          <div className="p-4 flex-1">
            <pre className="text-xs font-mono text-zinc-300 overflow-x-auto leading-relaxed h-96 select-text">
              {selectedStageId === 1 && `// server.ts - SECURE REMEDIATED LOGIN ROUTE
app.post("/api/meridian/login", (req, res) => {
  const { email, password } = req.body;

  // SECURE REMEDIATION: Use Parameterized Queries.
  // By using placeholder symbols (?), the database engine
  // compiles the query structure first. User input is then
  // evaluated strictly as data parameters, never as SQL syntax.
  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  const params = [email, password];

  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Internal Error" });
    if (rows.length > 0) {
      res.json({ authenticated: true, user: rows[0] });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });
});`}

              {selectedStageId === 2 && `// server.ts - SECURE DIAGNOSTICS ROUTE
app.post("/api/meridian/diagnostics/ping", (req, res) => {
  const { host } = req.body;

  // SECURE REMEDIATION: Complete Sanitization or Avoid exec().
  // 1. Enforce strict character whitelisting (regex only).
  // 2. Validate host is a valid IPv4/Domain pattern.
  // 3. Alternatively, use Node's standard dgram socket library
  //    rather than calling shell interpreters.
  const ipv4Pattern = /^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$/;
  if (!ipv4Pattern.test(host)) {
    return res.status(400).json({ error: "Invalid host format. IPv4 only." });
  }

  // Safe execution with spawn() instead of exec()
  const pingProcess = spawn("ping", ["-c", "3", host]);
  pingProcess.stdout.on("data", (data) => {
    res.json({ output: data.toString() });
  });
});`}

              {selectedStageId === 3 && `// server.ts - SECURE SSRF REMEDIATION ROUTE
app.post("/api/meridian/admin/fetch-profile", async (req, res) => {
  const { url } = req.body;

  try {
    const parsedUrl = new URL(url);

    // SECURE REMEDIATION: Restrict Domain Whitelists & Private Ranges.
    // 1. Implement strict domain lookup whitelisting.
    // 2. Verify resolving IP is NOT a local private subnet range
    //    (e.g., 127.0.0.0/8, 10.0.0.0/8, 169.254.0.0/16, ::1).
    const isPrivate = isPrivateSubnet(parsedUrl.hostname);
    if (isPrivate) {
      return res.status(403).json({ error: "Prohibited network destination." });
    }

    const remoteResponse = await fetch(parsedUrl.href);
    const content = await remoteResponse.text();
    res.json({ status: "SUCCESS", content });
  } catch (err) {
    res.status(500).json({ error: "Fetch pipeline blocked" });
  }
});`}

              {selectedStageId === 4 && `// server.ts - SECURE JWT AUTHORIZATION
app.post("/api/meridian/database/exfiltrate", (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied" });
  }

  const token = authHeader.split(" ")[1];

  // SECURE REMEDIATION: Cryptographically verified JWT.
  // Instead of static key headers, sign tokens using salted asymmetric
  // keys (RS256) on authentication. Validate both expiration and
  // specific user permissions.
  jwt.verify(token, process.env.JWT_PUBLIC_KEY, { algorithms: ["RS256"] }, (err, payload) => {
    if (err || payload.role !== "SuperAdmin") {
      return res.status(403).json({ error: "Insufficient database privileges." });
    }
    
    // Release records safely
    db.dumpRecords((err, data) => res.json({ data }));
  });
});`}
            </pre>
          </div>
        </div>
      </div>

      {/* OWASP / MITRE / CVSS Metrics for Selected Stage */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3">
        <h4 className="text-sm font-mono font-bold text-zinc-200 uppercase tracking-wide">
          Vulnerability Classification — Stage 0{selectedStage.id}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[11px] font-mono">
          <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block mb-0.5">CVSS v3.1</span>
            <span className={`font-bold text-lg ${selectedStage.cvssScore >= 9.0 ? 'text-red-400' : selectedStage.cvssScore >= 7.0 ? 'text-orange-400' : 'text-amber-400'}`}>
              {selectedStage.cvssScore}
            </span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block mb-0.5">OWASP Top 10</span>
            <span className="text-zinc-200 font-bold leading-tight block">{selectedStage.owaspCategory}</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block mb-0.5">MITRE ATT&CK</span>
            <span className="text-zinc-200 font-bold">{selectedStage.mitreTechnique}</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800/60">
            <span className="text-zinc-500 block mb-0.5">CWE ID</span>
            <span className="text-zinc-200 font-bold">{selectedStage.cweId}</span>
          </div>
          <div className="bg-zinc-950/80 p-3 rounded border border-zinc-800/60 col-span-2 md:col-span-1">
            <span className="text-zinc-500 block mb-0.5">CVSS Vector</span>
            <span className="text-zinc-400 text-[9px] break-all leading-tight">{selectedStage.cvssVector}</span>
          </div>
        </div>
      </div>

      {/* Cyber Audit Context Guidance */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-mono font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-1.5">
          <Lightbulb className="w-5 h-5 text-amber-500" /> Defense-in-Depth Remediation Principles
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-950/85 p-4 rounded border border-zinc-800/80 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold block">1. Parameterize Queries</span>
            <p className="text-zinc-400 leading-relaxed">
              Never stitch strings together to form database queries. Prepared statements ensure special character parameters are treated as literal constants, rendering Injection attacks useless.
            </p>
          </div>
          <div className="bg-zinc-950/85 p-4 rounded border border-zinc-800/80 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold block">2. Input Whitelisting</span>
            <p className="text-zinc-400 leading-relaxed">
              Enforce strict whitelisting. Use regular expressions to validate text parameter patterns (such as IPs, filenames, or alphanumeric text) before allowing routing logic to proceed.
            </p>
          </div>
          <div className="bg-zinc-950/85 p-4 rounded border border-zinc-800/80 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold block">3. Access Control Gating</span>
            <p className="text-zinc-400 leading-relaxed">
              Secure critical assets behind session identity verification. Use cryptographically signed JWT tokens with salt, enforce brief expirations, and perform role validation on all microservice endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

}
