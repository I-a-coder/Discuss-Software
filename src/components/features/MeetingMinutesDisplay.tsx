"use client";

import { Copy, Download, FileText, FileType, Users } from "lucide-react";
import {
  downloadTextFile,
  downloadWordFromMarkdown,
  downloadPdfViaPrint,
} from "@/lib/export-minutes";

function renderMarkdownBlock(md: string) {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length) {
      nodes.push(
        <ul key={key++} className="list-disc pl-6 space-y-1.5 text-gray-700 mb-4">
          {listItems.map((li, i) => (
            <li key={i}>{formatInline(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("# ")) {
      flushList();
      nodes.push(
        <h2 key={key++} className="text-xl font-bold text-[#5D3A8C] border-b border-[#F3EEF8] pb-2 mb-4 mt-2">
          {formatInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold text-[#4A2E70] uppercase tracking-wide mt-6 mb-2">
          {formatInline(line.slice(3))}
        </h3>
      );
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
    } else if (line.startsWith("```")) {
      /* skip fence */
    } else if (line.trim() && !line.startsWith("```")) {
      flushList();
      if (line.includes("Meeting link:")) {
        nodes.push(
          <p key={key++} className="text-sm text-[#5D3A8C] bg-[#F3EEF8] rounded-lg px-3 py-2 mb-3">
            {formatInline(line)}
          </p>
        );
      } else {
        nodes.push(
          <p key={key++} className="text-sm text-gray-700 mb-2 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();
  return nodes;
}

function formatInline(text: string) {
  const parts = text.split(/(\*\*.+?\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-gray-900">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return p.replace(/_(.+?)_/g, "$1");
  });
}

/**
 * Injects a ## Participants block into the markdown string right after
 * the Executive Summary section, if participants are provided and the
 * markdown doesn't already contain a Participants heading.
 */
function injectParticipants(markdown: string, participants: string[]): string {
  if (!participants.length) return markdown;
  // Don't inject if already present
  if (/##\s+participants/i.test(markdown)) return markdown;

  // Comma-separated single line instead of a bullet list
  const participantBlock = `## Participants\n${participants.join(", ")}\n\n`;

  // Insert after executive summary section (before the next ## heading or end)
  const execMatch = markdown.match(/##\s+executive\s+summary/i);
  if (execMatch && execMatch.index !== undefined) {
    const afterExec = markdown.indexOf("\n## ", execMatch.index + execMatch[0].length);
    if (afterExec !== -1) {
      return (
        markdown.slice(0, afterExec) +
        "\n\n" +
        participantBlock +
        markdown.slice(afterExec + 1)
      );
    }
    return markdown + "\n\n" + participantBlock;
  }

  const firstH2 = markdown.indexOf("\n## ");
  if (firstH2 !== -1) {
    const insertAt = markdown.indexOf("\n## ", firstH2 + 4);
    if (insertAt !== -1) {
      return markdown.slice(0, insertAt) + "\n\n" + participantBlock + markdown.slice(insertAt + 1);
    }
  }
  return participantBlock + markdown;
}

export function MeetingMinutesDisplay({
  markdown,
  title = "Meeting minutes",
  participants = [],
}: {
  markdown: string;
  title?: string;
  participants?: string[];
}) {
  // Inject participants before rendering
  const enrichedMarkdown = injectParticipants(markdown, participants);

  const excerptStart = enrichedMarkdown.indexOf("## Full transcript");
  const main =
    excerptStart > 0 ? enrichedMarkdown.slice(0, excerptStart).trim() : enrichedMarkdown;
  const excerpt =
    excerptStart > 0 ? enrichedMarkdown.slice(excerptStart) : "";

  async function copyAll() {
    await navigator.clipboard.writeText(enrichedMarkdown);
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-[#F3EEF8]/40 px-5 py-4">
        <h4 className="font-semibold text-[#5D3A8C]">Generated minutes</h4>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyAll} className="minutes-export-btn">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(enrichedMarkdown, `${title.replace(/\s+/g, "_")}.txt`, "text/plain")
            }
            className="minutes-export-btn"
          >
            <FileText className="h-3.5 w-3.5" /> Notepad (.txt)
          </button>
          <button
            type="button"
            onClick={() => downloadWordFromMarkdown(enrichedMarkdown, title)}
            className="minutes-export-btn"
          >
            <FileType className="h-3.5 w-3.5" /> Word (.doc)
          </button>
          <button
            type="button"
            onClick={() => downloadPdfViaPrint(enrichedMarkdown, title)}
            className="minutes-export-btn"
          >
            <Download className="h-3.5 w-3.5" /> PDF (print)
          </button>
        </div>
      </div>

      <div className="p-6 max-h-[520px] overflow-y-auto bg-white">
        {/* Render main markdown (participants are injected into the markdown already) */}
        {renderMarkdownBlockWithParticipantHighlight(main, participants)}

        {excerpt && (
          <details className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600">
              Transcript excerpt
            </summary>
            <pre className="mt-3 text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
              {excerpt.replace(/^## Full transcript excerpt\n?/i, "").replace(/```/g, "")}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Renders markdown blocks, but for the Participants section renders
 * names as styled pill badges instead of a plain list.
 */
function renderMarkdownBlockWithParticipantHighlight(md: string, _participants: string[]) {
  const lines = md.split("\n");
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];
  let key = 0;
  let inParticipantsSection = false;

  const flushList = () => {
    if (listItems.length) {
      nodes.push(
        <ul key={key++} className="list-disc pl-6 space-y-1.5 text-gray-700 mb-4">
          {listItems.map((li, i) => (
            <li key={i}>{formatInline(li)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flushList();
      inParticipantsSection = false;
      const heading = line.slice(3).trim();
      inParticipantsSection = /^participants$/i.test(heading);
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold text-[#4A2E70] uppercase tracking-wide mt-6 mb-2">
          {formatInline(heading)}
        </h3>
      );
    } else if (line.startsWith("# ")) {
      flushList();
      inParticipantsSection = false;
      nodes.push(
        <h2 key={key++} className="text-xl font-bold text-[#5D3A8C] border-b border-[#F3EEF8] pb-2 mb-4 mt-2">
          {formatInline(line.slice(2))}
        </h2>
      );
    } else if (line.startsWith("- ")) {
      // Bullet lists only appear in non-participants sections now
      listItems.push(line.slice(2).trim());
    } else if (line.startsWith("```")) {
      /* skip fence */
    } else if (line.trim() && !line.startsWith("```")) {
      flushList();
      if (inParticipantsSection) {
        // Render comma-separated participant names as styled inline text
        const raw = line.trim();
        const isPlaceholder = raw.startsWith("_") || /not available/i.test(raw);
        if (isPlaceholder) {
          nodes.push(
            <p key={key++} className="text-xs text-gray-400 italic mb-4">
              {raw.replace(/^_|_$/g, "")}
            </p>
          );
        } else {
          const names = raw.split(",").map((n) => n.trim()).filter(Boolean);
          nodes.push(
            <div key={key++} className="flex flex-wrap items-center gap-1.5 mb-4">
              <Users className="h-3.5 w-3.5 text-[#5D3A8C] shrink-0" />
              {names.map((name, i) => (
                <span key={name + i} className="text-sm text-gray-800 font-medium">
                  {name}{i < names.length - 1 && <span className="text-gray-400">,</span>}
                </span>
              ))}
            </div>
          );
        }
        inParticipantsSection = false;
      } else if (line.includes("Meeting link:")) {
        nodes.push(
          <p key={key++} className="text-sm text-[#5D3A8C] bg-[#F3EEF8] rounded-lg px-3 py-2 mb-3">
            {formatInline(line)}
          </p>
        );
      } else {
        nodes.push(
          <p key={key++} className="text-sm text-gray-700 mb-2 leading-relaxed">
            {formatInline(line)}
          </p>
        );
      }
    }
  }
  flushList();
  return nodes;
}
