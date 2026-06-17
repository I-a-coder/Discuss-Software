"use client";

import dynamic from "next/dynamic";
import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const MeetingRoom = dynamic(
  () =>
    import("@/components/features/MeetingRoom").then((m) => ({
      default: m.MeetingRoom,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Joining meeting…</p>
      </div>
    ),
  }
);

export default function MeetingRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { status } = useSession();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("Team Meeting");
  const roomCode = code.toUpperCase();
  const audioOnly = searchParams.get("mode") === "phone";

  useEffect(() => {
    fetch(`/api/meetings/${roomCode}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.meeting?.title) setTitle(d.meeting.title);
      });
  }, [roomCode]);

  if (status === "loading") {
    return <p className="p-8 text-gray-500">Loading…</p>;
  }

  return <MeetingRoom roomCode={roomCode} title={title} audioOnly={audioOnly} />;
}
