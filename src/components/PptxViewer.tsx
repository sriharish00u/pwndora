import React from "react";
import { Download, FileSpreadsheet, ExternalLink, Presentation } from "lucide-react";

const PPTX_PATH = "/Innovative_Ills_PWNDORA_Pitch.pptx";

export default function PptxViewer() {
  return (
    <div className="relative w-full h-full flex flex-col min-h-[420px] p-6">
      <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center">
        {/* Slide preview grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="aspect-[16/10] rounded-lg border border-zinc-700/60 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center overflow-hidden hover:border-emerald-500/30 transition-all duration-300"
            >
              <Presentation className="w-6 h-6 text-zinc-600" />
            </div>
          ))}
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-500/15 to-orange-500/15 rounded-2xl text-emerald-400">
          <FileSpreadsheet className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-zinc-200 mb-1">PWNDORA Pitch Deck</h3>
          <p className="text-[11px] text-zinc-500 max-w-xs">
            Presentation covering the vulnerability chain lab architecture, stages, and demo walkthrough.
          </p>
        </div>

        <div className="flex gap-3">
          <a
            href={PPTX_PATH}
            download
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-orange-500 hover:from-emerald-400 hover:to-orange-400 text-zinc-950 font-bold text-xs rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
          >
            <Download className="w-4 h-4" /> Download PPTX
          </a>
          <a
            href={PPTX_PATH}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 font-bold text-xs rounded-lg transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4" /> Open File
          </a>
        </div>
      </div>
    </div>
  );
}
