"use client";

import { useCallback, useEffect, useRef } from "react";

type PeerMap = Map<string, RTCPeerConnection>;

export function useMeetingWebRTC(
  roomCode: string,
  userId: string,
  localStream: MediaStream | null
) {
  const peersRef = useRef<PeerMap>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
  const lastSignalRef = useRef(0);
  const onRemoteStreamRef = useRef<
    ((peerId: string, stream: MediaStream) => void) | null
  >(null);

  const setOnRemoteStream = useCallback(
    (cb: (peerId: string, stream: MediaStream) => void) => {
      onRemoteStreamRef.current = cb;
    },
    []
  );

  const sendSignal = useCallback(
    async (to: string, type: "offer" | "answer" | "ice", payload: string) => {
      await fetch(`/api/meetings/${roomCode}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, type, payload }),
      });
    },
    [roomCode]
  );

  const createPeer = useCallback(
    (peerId: string, initiator: boolean) => {
      if (peersRef.current.has(peerId) || peerId === userId) return;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      localStream?.getTracks().forEach((t) => pc.addTrack(t, localStream));

      pc.ontrack = (ev) => {
        const stream = ev.streams[0];
        if (stream) {
          remoteStreamsRef.current.set(peerId, stream);
          onRemoteStreamRef.current?.(peerId, stream);
        }
      };

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          sendSignal(peerId, "ice", JSON.stringify(ev.candidate));
        }
      };

      peersRef.current.set(peerId, pc);

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            if (pc.localDescription) {
              sendSignal(peerId, "offer", JSON.stringify(pc.localDescription));
            }
          })
          .catch(console.error);
      }

      return pc;
    },
    [localStream, sendSignal, userId]
  );

  const handleSignal = useCallback(
    async (from: string, type: string, payload: string) => {
      if (from === userId) return;
      let pc = peersRef.current.get(from);
      if (!pc) {
        pc = createPeer(from, false);
      }
      if (!pc) return;

      const data = JSON.parse(payload);
      if (type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(from, "answer", JSON.stringify(pc.localDescription));
      } else if (type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (type === "ice") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch {
          /* ignore stale candidates */
        }
      }
    },
    [createPeer, sendSignal, userId]
  );

  useEffect(() => {
    if (!localStream) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/meetings/${roomCode}/signal?since=${lastSignalRef.current}`
        );
        if (!res.ok) return;
        const { signals } = await res.json();
        for (const s of signals) {
          if (s.at > lastSignalRef.current) lastSignalRef.current = s.at;
          if (s.from !== userId) {
            await handleSignal(s.from, s.type, s.payload);
          }
        }
      } catch {
        /* network blip */
      }
    };

    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, [roomCode, userId, localStream, handleSignal]);

  const connectToPeer = useCallback(
    (peerId: string) => {
      if (peerId !== userId && localStream) {
        createPeer(peerId, true);
      }
    },
    [createPeer, localStream, userId]
  );

  const replaceTracks = useCallback((stream: MediaStream | null) => {
    peersRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      stream?.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else if (stream) pc.addTrack(track, stream);
      });
    });
  }, []);

  const cleanup = useCallback(() => {
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
  }, []);

  return { connectToPeer, replaceTracks, cleanup, setOnRemoteStream };
}
