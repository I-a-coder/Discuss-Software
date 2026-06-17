/** Browser speech recognition & text-to-speech helpers */

export const VOICE_PREF_KEY = "yusi-ai-voice-enabled";

export function getVoicePref(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(VOICE_PREF_KEY) === "true";
}

export function setVoicePref(enabled: boolean) {
  localStorage.setItem(VOICE_PREF_KEY, enabled ? "true" : "false");
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stripForSpeech(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/[#*`_\[\]()]/g, "")
    .replace(/\n+/g, ". ")
    .trim();
}

export function speakText(
  text: string,
  onEnd?: () => void,
  attempt = 0
): void {
  if (!isSpeechSynthesisSupported()) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length && attempt < 4) {
    setTimeout(() => speakText(text, onEnd, attempt + 1), 120);
    return;
  }

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(stripForSpeech(text));
  utter.rate = 1.08;
  utter.pitch = 1.28;
  utter.volume = 1;
  const femaleHints = [
    "female",
    "woman",
    "zira",
    "samantha",
    "victoria",
    "karen",
    "moira",
    "aria",
    "eva",
    "jenny",
    "sonia",
    "alloy",
    "nova",
    "shimmer",
  ];
  const preferred =
    voices.find((v) => {
      const n = v.name.toLowerCase();
      return v.lang.startsWith("en") && femaleHints.some((hint) => n.includes(hint));
    }) ||
    voices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        v.lang.startsWith("en") &&
        (n.includes("female") || n.includes("woman") || n.includes("girl"))
      );
    }) ||
    voices.find((v) => {
      const n = v.name.toLowerCase();
      return (
        v.lang.startsWith("en") &&
        n.includes("google") &&
        !n.includes("male")
      );
    }) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utter.voice = preferred;
  if (onEnd) utter.onend = onEnd;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) window.speechSynthesis.cancel();
}

type RecognitionCtor = new () => SpeechRecognition;

export function createSpeechRecognition(): SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const SR = (window.SpeechRecognition ||
    window.webkitSpeechRecognition) as RecognitionCtor | undefined;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-US";
  rec.maxAlternatives = 1;
  return rec;
}
