import React from "react";
import { ShieldCheck, FileText, Share2, Download, AlertCircle, Copy, CheckCircle2, Printer } from "lucide-react";
import { PentestReport } from "../types";

interface ReportViewerProps {
  report: PentestReport | null;
  onCopyReport: () => void;
  copied: boolean;
}

function generatePrintableHTML(report: PentestReport): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${report.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; color: #1a1a1a; background: #fff; padding: 40px; font-size: 11px; line-height: 1.6; }
  h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 3px solid #000; padding-bottom: 8px; margin-bottom: 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { font-size: 12px; margin: 16px 0 6px; }
  .meta { font-size: 10px; color: #666; margin-bottom: 16px; }
  .severity { font-weight: bold; }
  .critical { color: #dc2626; }
  .high { color: #ea580c; }
  .medium { color: #d97706; }
  .finding { border: 1px solid #ddd; padding: 12px; margin: 10px 0; page-break-inside: avoid; }
  .finding-header { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 8px; }
  .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 8px 0; }
  .metric { background: #f5f5f5; padding: 6px; border: 1px solid #e5e5e5; }
  .metric-label { font-size: 9px; color: #888; text-transform: uppercase; }
  .metric-value { font-weight: bold; font-size: 12px; }
  pre { background: #f5f5f5; padding: 8px; border: 1px solid #e5e5e5; overflow-x: auto; font-size: 10px; white-space: pre-wrap; word-break: break-word; }
  ul { padding-left: 20px; }
  li { margin: 4px 0; }
  @media print { body { padding: 20px; } .finding { break-inside: avoid; } }
</style></head><body>
<h1>${report.title}</h1>
<div class="meta">Scope: ${report.target} | Generated: ${report.generatedAt} | Classification: STRICT COMPLIANCE</div>
<h2>1. Executive Summary</h2>
<p>${report.executiveSummary}</p>
<h3>Overall Threat Level: <span class="severity critical">${report.overallImpact}</span></h3>
<h2>2. Detailed Findings</h2>
${report.stages.map((s) => `
<div class="finding">
  <div class="finding-header">
    <strong>0${s.id}. ${s.name} — ${s.category}</strong>
    <span>Severity: <span class="severity ${s.impact.toLowerCase()}">${s.impact}</span> | Status: ${s.status}</span>
  </div>
  <p><strong>Vulnerability:</strong> ${s.description}</p>
  <div class="metrics">
    <div class="metric"><div class="metric-label">CVSS v3.1</div><div class="metric-value">${s.cvssScore}</div></div>
    <div class="metric"><div class="metric-label">OWASP</div><div class="metric-value" style="font-size:9px">${s.owaspCategory}</div></div>
    <div class="metric"><div class="metric-label">MITRE</div><div class="metric-value">${s.mitreTechnique}</div></div>
    <div class="metric"><div class="metric-label">CWE</div><div class="metric-value">${s.cweId}</div></div>
    <div class="metric"><div class="metric-label">CVSS Vector</div><div class="metric-value" style="font-size:8px">${s.cvssVector}</div></div>
  </div>
  <h3>Proof of Exploitation</h3>
  <pre>${s.exploitPoC}</pre>
  <h3>Remediation</h3>
  <p>${s.remediation}</p>
</div>`).join("")}
<h2>3. Remediation Roadmap</h2>
<ul>${report.recommendations.map((r) => `<li>${r}</li>`).join("")}</ul>
</body></html>`;
}

export default function ReportViewer({ report, onCopyReport, copied }: ReportViewerProps) {
  if (!report) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-8 text-center max-w-md mx-auto space-y-4" id="empty-report">
        <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-mono font-bold text-zinc-200 uppercase tracking-wide">
          Compliance Report Pending
        </h4>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Unlock your vulnerability findings and generate your penetration testing report from the active control panel on the main Dashboard view.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="report-view-root">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          STANDARDIZED CYBER ASSESSMENT
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const w = window.open("", "_blank");
              if (w) {
                w.document.write(generatePrintableHTML(report));
                w.document.close();
                w.print();
              }
            }}
            className="flex items-center gap-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded transition-colors cursor-pointer"
            id="btn-download-report"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            onClick={onCopyReport}
            className="flex items-center gap-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded transition-colors cursor-pointer"
            id="btn-copy-report-json"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Copied JSON!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy Raw Report Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Styled Printable Penetration Report */}
      <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-6 md:p-8 space-y-6 text-zinc-200 shadow-xl select-text leading-relaxed font-sans" id="auditable-report-paper">
        {/* Document Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-mono font-bold text-zinc-100 tracking-tight uppercase">
              {report.title}
            </h2>
            <p className="text-xs text-zinc-500">
              Audit Scope: <span className="text-zinc-300 font-mono font-semibold">{report.target}</span>
            </p>
          </div>
          <div className="text-left md:text-right text-[11px] font-mono text-zinc-500 space-y-0.5">
            <div>Security Level: <span className="text-red-500 font-bold">STRICT COMPLIANCE</span></div>
            <div>Generated: <span className="text-zinc-300">{report.generatedAt}</span></div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest">
            ◤ 1. EXECUTIVE SUMMARY
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {report.executiveSummary}
          </p>
        </div>

        {/* Overall Threat Matrix */}
        <div className="bg-zinc-900/40 border border-zinc-850 p-4 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 block">THREAT COMPROMISE SEVERITY LEVEL</span>
            <span className="text-sm font-mono font-bold text-red-500 uppercase tracking-wide">
              {report.overallImpact}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/5 px-2.5 py-1.5 border border-emerald-950 rounded">
            <ShieldCheck className="w-4 h-4 text-emerald-500" /> AUDIT COMPLIANT
          </div>
        </div>

        {/* Stage-by-Stage Findings */}
        <div className="space-y-4">
          <h3 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest border-b border-zinc-850 pb-2">
            ◤ 2. DETAILED CYBER CHAIN FINDINGS
          </h3>

          <div className="space-y-4">
            {report.stages.map((stage) => (
              <div
                key={stage.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  stage.status === "Exploited"
                    ? "bg-zinc-950 border-amber-900/30"
                    : "bg-zinc-950 border-zinc-800 opacity-60"
                }`}
              >
                {/* Stage Headline */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-500">0{stage.id}.</span>
                    <h4 className="text-sm font-bold font-mono text-zinc-200">{stage.name}</h4>
                    <span className="text-[9px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">
                      {stage.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-zinc-500">Severity:</span>
                    <span className={`font-bold ${
                      stage.impact === "Critical"
                        ? "text-red-500"
                        : stage.impact === "High"
                        ? "text-orange-400"
                        : "text-amber-500"
                    }`}>
                      {stage.impact}
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className={`font-bold ${stage.status === "Exploited" ? "text-red-400" : "text-zinc-500"}`}>
                      {stage.status}
                    </span>
                  </div>
                </div>

                {/* Stage description */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 block">VULNERABILITY SURFACE</span>
                  <p className="text-xs text-zinc-400">{stage.description}</p>
                </div>

                {/* Proof of Concept */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 block">PROOF OF EXPLOTATION (PoC)</span>
                  <pre className="bg-zinc-900 p-2.5 rounded font-mono text-[10px] text-zinc-400 overflow-x-auto">
                    {stage.exploitPoC}
                  </pre>
                </div>

                {/* CVSS / OWASP / MITRE Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px] font-mono">
                  <div className="bg-zinc-900/60 border border-zinc-900 p-2 rounded">
                    <span className="text-zinc-500 block">CVSS Score</span>
                    <span className={`font-bold ${stage.cvssScore >= 9.0 ? 'text-red-400' : stage.cvssScore >= 7.0 ? 'text-orange-400' : 'text-amber-400'}`}>
                      {stage.cvssScore}
                    </span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-900 p-2 rounded">
                    <span className="text-zinc-500 block">OWASP</span>
                    <span className="text-zinc-300 font-bold">{stage.owaspCategory}</span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-900 p-2 rounded">
                    <span className="text-zinc-500 block">MITRE ATT&CK</span>
                    <span className="text-zinc-300 font-bold">{stage.mitreTechnique}</span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-900 p-2 rounded">
                    <span className="text-zinc-500 block">CWE</span>
                    <span className="text-zinc-300 font-bold">{stage.cweId}</span>
                  </div>
                  <div className="bg-zinc-900/60 border border-zinc-900 p-2 rounded col-span-2 md:col-span-1">
                    <span className="text-zinc-500 block">CVSS Vector</span>
                    <span className="text-zinc-400 text-[9px] break-all">{stage.cvssVector}</span>
                  </div>
                </div>

                {/* Remediation Patch recommendation */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 block">REMEDIATION RECOMMENDATION</span>
                  <p className="text-xs text-zinc-400 bg-zinc-900/40 p-2.5 rounded border border-zinc-900 leading-relaxed italic">
                    {stage.remediation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Recommendations */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold text-amber-500 uppercase tracking-widest border-b border-zinc-850 pb-2">
            ◤ 3. REMEDIATION ROADMAP RECOMMENDATIONS
          </h3>
          <ul className="list-decimal pl-5 space-y-2 text-xs text-zinc-400">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="leading-relaxed">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
