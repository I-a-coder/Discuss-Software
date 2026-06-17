"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Star, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "./PageHeader";

function ReviewInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = searchParams.get("meetingId") || "";
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [meetingLink, setMeetingLink] = useState("");

  useEffect(() => {
    if (!meetingId) return;
    fetch(`/api/meetings/reviews?meetingId=${meetingId}`)
      .then((r) => r.json())
      .then((d) => {
        setAvg(d.average || 0);
        setCount(d.count || 0);
        if (d.meetingLink) setMeetingLink(d.meetingLink);
        if (d.mine) {
          setStars(d.mine.stars);
          setComment(d.mine.comment || "");
          setSubmitted(true);
        }
      });
  }, [meetingId]);

  async function submit() {
    if (!meetingId || stars < 1) return;
    await fetch("/api/meetings/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, stars, comment }),
    });
    setSubmitted(true);
    const d = await fetch(`/api/meetings/reviews?meetingId=${meetingId}`).then((r) =>
      r.json()
    );
    setAvg(d.average || 0);
    setCount(d.count || 0);
  }

  if (!meetingId) {
    return (
      <p className="text-gray-500 p-8 text-center">
        No meeting selected.{" "}
        <Link href="/dashboard/meetings" className="text-[#5D3A8C] underline">
          Back to meetings
        </Link>
      </p>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader
        title="Rate this meeting"
        description="Your feedback helps the team improve. Authorities see aggregate ratings."
      />
      <div className="card p-8 text-center space-y-6">
        <Sparkles className="mx-auto h-10 w-10 text-[#5D3A8C]" />
        <p className="text-gray-600 text-sm">
          How was the meeting experience? Tap stars to rate.
        </p>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(n)}
              className="p-1 transition hover:scale-110"
            >
              <Star
                className={`h-10 w-10 ${
                  n <= (hover || stars)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        <textarea
          className="input-field min-h-[100px] text-left"
          placeholder="Optional comment for authorities…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={stars < 1}
          className="btn-primary w-full"
        >
          {submitted ? "Update review" : "Submit review"}
        </button>
        {count > 0 && (
          <p className="text-xs text-gray-500">
            Team average: <strong>{avg.toFixed(1)}</strong> / 5 ({count} review
            {count !== 1 ? "s" : ""})
          </p>
        )}
        <div className="flex flex-col gap-2 pt-2">
          <Link
            href={
              meetingLink
                ? `/dashboard/meetings?ended=1&link=${encodeURIComponent(meetingLink)}`
                : "/dashboard/meetings?ended=1"
            }
            className="btn-secondary"
          >
            AI meeting notes
          </Link>
          <button
            type="button"
            onClick={() => router.push("/dashboard/meetings")}
            className="text-sm text-gray-500 hover:text-[#5D3A8C]"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

export function MeetingReviewPanel() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-500">Loading…</p>}>
      <ReviewInner />
    </Suspense>
  );
}
