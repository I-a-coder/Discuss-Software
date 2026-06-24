import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { rateLimit } from "@/lib/rate-limit";

const AI_BASE = process.env.AI_API_BASE_URL || "https://api.groq.com/openai/v1";
const AI_KEY  = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "llama-3.3-70b-versatile";

const LANG_NAMES: Record<string, string> = {
  es: "Spanish", fr: "French", de: "German", ar: "Arabic",
  zh: "Chinese (Simplified)", ja: "Japanese", pt: "Portuguese",
  hi: "Hindi", ur: "Urdu",
};

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  // Rate limit: 30 translations per minute per user
  const limited = rateLimit(session!.user.id, { max: 30, windowMs: 60_000, label: "translate" });
  if (limited) return limited;
  if (!AI_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }
  const { lang, texts } = (await req.json()) as { lang: string; texts: string[] };
  if (!lang || !texts?.length) {
    return NextResponse.json({ error: "lang and texts required" }, { status: 400 });
  }
  
  // 1. Check if another user already translated these in the database
  const existing = await prisma.translationCache.findMany({
    where: { lang, key: { in: texts } },
  });
  const existingMap = new Map(existing.map(e => [e.key, e.value]));
  
  const toTranslate = texts.filter(t => !existingMap.has(t));
  const finalTranslations: string[] = [];

  // 2. If all texts are already in the DB, just return them
  if (toTranslate.length === 0) {
    return NextResponse.json({
      translations: texts.map(t => existingMap.get(t) || t)
    });
  }

  const langName = LANG_NAMES[lang] || lang;
  const numbered = toTranslate.map((t, i) => `${i + 1}. ${t}`).join("\n");

  const systemPrompt =
    `You are a professional UI translator. Translate each numbered item from English to ${langName}. ` +
    `Keep the same tone and brevity as the original (UI labels, button text, short descriptions). ` +
    `Do NOT add explanations. Return ONLY the translated numbered list, one item per line, same numbering.`;

  try {
    const res = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: numbered },
        ],
        temperature: 0.2,
        max_tokens: 2000,
      }),
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error("[translate] AI error:", err);
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }
    
    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content || "";

    const lines = raw.split("\n").filter((l) => l.trim());
    const newTranslations = toTranslate.map((original, i) => {
      const pattern = new RegExp(`^${i + 1}[.\\)\\s]+(.+)$`);
      const match = lines.find((l) => pattern.test(l.trim()));
      if (match) {
        const m = match.trim().match(pattern);
        return m ? m[1].trim() : original;
      }
      return original;
    });

    // 3. Save the new translations to the database permanently
    await Promise.all(
      toTranslate.map((text, i) => 
        prisma.translationCache.upsert({
          where: { lang_key: { lang, key: text } },
          create: { lang, key: text, value: newTranslations[i] },
          update: { value: newTranslations[i] }
        })
      )
    );

    // 4. Merge old and new for the response
    texts.forEach(text => {
      if (existingMap.has(text)) {
        finalTranslations.push(existingMap.get(text)!);
      } else {
        const idx = toTranslate.indexOf(text);
        finalTranslations.push(newTranslations[idx]);
      }
    });

    return NextResponse.json({ translations: finalTranslations });
  } catch (e) {
    console.error("[translate] error:", e);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
