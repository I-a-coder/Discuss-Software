/** Meeting minutes & Q&A — rule-based; swap for OpenAI when API key is set */

export type MeetingAiContext = {
  title: string;
  meetingLink?: string | null;
  transcript?: string | null;
  content?: string | null;
  summary?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  participants?: string[] | null;
};

function extractBullets(text: string, keywords: string[]): string[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.filter((l) =>
    keywords.some((k) => l.toLowerCase().includes(k))
  );
}

export function generateMeetingMinutes(ctx: MeetingAiContext): string {
  const transcript = ctx.transcript || ctx.content || "";
  const link = ctx.meetingLink ? `\n**Meeting link:** ${ctx.meetingLink}` : "";
  const when =
    ctx.startedAt || ctx.endedAt
      ? `\n**When:** ${ctx.startedAt || "—"} → ${ctx.endedAt || "ongoing"}`
      : "";

  const decisions = extractBullets(transcript, [
    "decided",
    "decision",
    "agreed",
    "approved",
  ]);
  const actions = extractBullets(transcript, [
    "action",
    "todo",
    "will ",
    "assign",
    "by ",
    "deadline",
  ]);
  const questions = extractBullets(transcript, [
    "?",
    "open question",
    "follow up",
    "tbd",
  ]);

  let minutes = `# Meeting minutes: ${ctx.title}${link}${when}\n\n`;
  minutes += `## Executive summary\n`;
  if (ctx.summary) {
    minutes += ctx.summary + "\n\n";
  } else if (transcript.length > 50) {
    const preview = transcript.replace(/\n+/g, " ").slice(0, 400);
    minutes += `${preview}${transcript.length > 400 ? "…" : ""}\n\n`;
  } else {
    minutes += `Session captured from meeting link/recording. Review sections below for details.\n\n`;
  }

  // Participants section — always present, right below Executive Summary
  minutes += `## Participants\n`;
  if (ctx.participants && ctx.participants.length > 0) {
    minutes += ctx.participants.join(", ") + "\n\n";
  } else {
    // Extract names from "joined the meeting" events.
    // Transcript lines have a timestamp prefix: "[2026-06-15T12:34:56.789Z] Alice joined the meeting"
    const joinedNames = [
      ...new Set(
        transcript
          .split("\n")
          .map((l) => {
            const stripped = l.replace(/^\[[^\]]+\]\s*/, "").trim();
            return stripped.match(/^(.+?)\s+joined the meeting$/i)?.[1]?.trim();
          })
          .filter((n): n is string => !!n && n.length > 0 && n.length < 80)
      ),
    ];
    if (joinedNames.length > 0) {
      minutes += joinedNames.join(", ") + "\n\n";
    } else {
      minutes += `_(Participant list not available — add attendees in the meeting note form)_\n\n`;
    }
  }

  minutes += `## Key decisions\n`;
  minutes +=
    decisions.length > 0
      ? decisions.map((d) => `- ${d}`).join("\n") + "\n\n"
      : "- _(None explicitly tagged — add decided/agreed in notes for auto-detection)_\n\n";

  minutes += `## Action items\n`;
  minutes +=
    actions.length > 0
      ? actions.map((a) => `- ${a}`).join("\n") + "\n\n"
      : "- _(None found — list owners and due dates in transcript/chat)_\n\n";

  minutes += `## Open questions\n`;
  minutes +=
    questions.length > 0
      ? questions.map((q) => `- ${q}`).join("\n") + "\n\n"
      : "- _(None flagged)_\n\n";

  if (transcript.length > 0) {
    minutes += `## Full transcript excerpt\n\`\`\`\n${transcript.slice(0, 3000)}${transcript.length > 3000 ? "\n…" : ""}\n\`\`\`\n`;
  }

  return minutes;
}

export function answerMeetingQuestion(
  ctx: MeetingAiContext,
  question: string
): string {
  const q = question.toLowerCase();
  const corpus = [
    ctx.title,
    ctx.summary || "",
    ctx.transcript || "",
    ctx.content || "",
  ]
    .join("\n")
    .toLowerCase();

  if (!corpus.trim() || corpus.length < 10) {
    return `I don't have enough meeting data yet. Start a call from **Meetings**, or paste a recording/link and generate minutes first.`;
  }

  if (q.includes("who") && (q.includes("attend") || q.includes("present"))) {
    const m = (ctx.transcript || "").match(/joined the meeting/gi);
    const count = m?.length ?? 0;
    return count
      ? `Based on session events, **${count} join event(s)** were logged. Check the transcript for names in chat and join lines.`
      : `Attendee names appear in the chat and session events section of the transcript.`;
  }

  if (q.includes("action") || q.includes("todo") || q.includes("next step")) {
    const minutes = generateMeetingMinutes(ctx);
    const section = minutes.split("## Action items")[1]?.split("##")[0];
    return section?.trim()
      ? `**Action items from this meeting:**\n${section.trim()}`
      : `No clear action items were tagged. Ask participants to use chat or notes with "action" / "todo" keywords.`;
  }

  if (q.includes("decision") || q.includes("decided")) {
    const minutes = generateMeetingMinutes(ctx);
    const section = minutes.split("## Key decisions")[1]?.split("##")[0];
    return section?.trim() || "No decisions were explicitly captured in the transcript.";
  }

  if (q.includes("link") || q.includes("url")) {
    return ctx.meetingLink
      ? `Meeting link: **${ctx.meetingLink}**`
      : "No meeting link was stored for this session.";
  }

  const keywords = q
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const lines = (ctx.transcript || ctx.content || "")
    .split(/\n/)
    .filter((line) => {
      const lower = line.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });

  if (lines.length > 0) {
    return `Here's what I found about **"${question}"**:\n\n${lines.slice(0, 8).map((l) => `- ${l}`).join("\n")}`;
  }

  return `Regarding **"${question}"**: I searched the meeting transcript and notes but didn't find a direct match. Try asking about **action items**, **decisions**, **attendees**, or the **meeting link**. You can also regenerate minutes after adding more chat or recording context.`;
}
