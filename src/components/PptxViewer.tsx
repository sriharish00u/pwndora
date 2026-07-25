import React, { useState } from "react";
import { Download, FileSpreadsheet, ExternalLink } from "lucide-react";

const PPTX_PATH = "/Innovative_Ills_PWNDORA_Pitch.pptx";

export default function PptxViewer() {
  const [iframeFailed, setIframeFailed] = useState(false);

  const getViewerUrl = () => {
    const loc = window.location.origin + PPTX_PATH;
    return `https://view.officeapps.live.com/op/embed.php?src=${encodeURIComponent(loc)}`;
  };

  return (
    <div className="relative w-full h-full flex flex-col min-h-[420px]">
      {!iframeFailed ? (
        <iframe
          src={getViewerUrl()}
          className="w-full flex-1 rounded-lg border-0 min-h-[400px]"
          onError={() => setIframeFailed(true)}
          title="PWNDORA Pitch Deck"
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="p-5 bg-gradient-to-br from-emerald-500/15 to-orange-500/15 rounded-2xl text-emerald-400">
            <FileSpreadsheet className="w-12 h-12" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-200 mb-2">PWNDORA Pitch Deck</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Download the presentation to view it locally. The embedded viewer requires a public URL.
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
      )}
    </div>
  );
}
