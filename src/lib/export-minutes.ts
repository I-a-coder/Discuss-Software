export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadWordFromMarkdown(markdown: string, title: string) {
  const html = markdownToHtml(markdown, title);
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:Calibri,Arial,sans-serif;max-width:800px;margin:40px auto;line-height:1.6;color:#222}
h1{color:#5D3A8C;border-bottom:2px solid #5D3A8C;padding-bottom:8px}h2{color:#4A2E70;margin-top:24px}
ul{margin:8px 0 16px 24px}li{margin:4px 0}pre{background:#f5f5f5;padding:12px;border-radius:8px;white-space:pre-wrap;font-size:12px}</style>
</head><body>${html}</body></html>`;
  downloadTextFile(doc, `${sanitizeFilename(title)}.doc`, "application/msword");
}

export function downloadPdfViaPrint(markdown: string, title: string) {
  const html = markdownToHtml(markdown, title);
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:Georgia,serif;max-width:700px;margin:32px auto;line-height:1.55;color:#111}
h1{color:#5D3A8C;font-size:22px}h2{color:#333;font-size:16px;margin-top:20px}ul{padding-left:20px}
@media print{body{margin:20px}}</style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
  }, 400);
}

function sanitizeFilename(s: string) {
  return s.replace(/[^a-z0-9-_]/gi, "_").slice(0, 60) || "meeting_minutes";
}

function markdownToHtml(md: string, title: string): string {
  const lines = md.split("\n");
  let html = "";
  let inCode = false;
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (!inCode) {
        if (inList) {
          html += "</ul>";
          inList = false;
        }
        html += "<pre>";
        inCode = true;
      } else {
        html += "</pre>";
        inCode = false;
      }
      continue;
    }
    if (inCode) {
      html += escapeHtml(line) + "\n";
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h1>${inlineFormat(line.slice(2))}</h1>`;
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      html += `<h2>${inlineFormat(line.slice(3))}</h2>`;
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineFormat(line.slice(2))}</li>`;
      continue;
    }
    if (!line.trim()) {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      continue;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    html += `<p>${inlineFormat(line)}</p>`;
  }
  if (inList) html += "</ul>";
  if (!html.includes("<h1>")) {
    html = `<h1>${escapeHtml(title)}</h1>` + html;
  }
  return html;
}

function inlineFormat(s: string) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
