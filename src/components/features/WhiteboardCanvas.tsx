"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Eraser,
  Pencil,
  Square,
  Circle,
  Type,
  MousePointer2,
  Save,
  Trash2,
  Monitor,
  FolderOpen,
  PencilLine,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { HexColorPicker } from "@/components/ui/HexColorPicker";
import { useLanguage } from "@/contexts/LanguageContext";

type Tool = "select" | "pen" | "eraser" | "rect" | "circle" | "text";

type Point = { x: number; y: number };

type BoardElement =
  | { id: string; type: "path"; tool: "pen" | "eraser"; color: string; points: Point[] }
  | { id: string; type: "rect"; color: string; x: number; y: number; w: number; h: number }
  | { id: string; type: "circle"; color: string; cx: number; cy: number; r: number }
  | { id: string; type: "text"; color: string; x: number; y: number; text: string; fontSize: number };

const ERASER_SIZE = 24;
const ERASER_DOT = 12;

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function hitElement(el: BoardElement, p: Point): boolean {
  if (el.type === "rect") {
    const x1 = Math.min(el.x, el.x + el.w);
    const x2 = Math.max(el.x, el.x + el.w);
    const y1 = Math.min(el.y, el.y + el.h);
    const y2 = Math.max(el.y, el.y + el.h);
    return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
  }
  if (el.type === "circle") {
    return Math.hypot(p.x - el.cx, p.y - el.cy) <= el.r + 8;
  }
  if (el.type === "text") {
    const w = el.text.length * el.fontSize * 0.55;
    return p.x >= el.x && p.x <= el.x + w && p.y >= el.y - el.fontSize && p.y <= el.y + 8;
  }
  if (el.type === "path") {
    return el.points.some((pt) => Math.hypot(pt.x - p.x, pt.y - p.y) < 12);
  }
  return false;
}

type SavedBoard = { id: string; name: string; createdAt: string };

export function WhiteboardCanvas({
  embedded = false,
  roomCode,
  onPresentToMeeting,
  onSaved,
}: {
  embedded?: boolean;
  roomCode?: string;
  onPresentToMeeting?: (stream: MediaStream) => void;
  onSaved?: (msg: string) => void;
} = {}) {
  const { t } = useLanguage();

  const TOOLS: { id: Tool; label: string; icon: React.ElementType }[] = [
    { id: "select", label: t("whiteboard.select"), icon: MousePointer2 },
    { id: "pen",    label: t("whiteboard.pen"),    icon: Pencil },
    { id: "eraser", label: t("whiteboard.eraser"), icon: Eraser },
    { id: "rect",   label: t("whiteboard.rect"),   icon: Square },
    { id: "circle", label: t("whiteboard.circle"), icon: Circle },
    { id: "text",   label: t("whiteboard.text_tool"), icon: Type },
  ];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#5D3A8C");
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BoardElement | null>(null);
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [savedBoards, setSavedBoards] = useState<SavedBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState("Team Whiteboard");
  const drawing = useRef(false);
  const dragMode = useRef<"draw" | "move" | "resize" | null>(null);
  const resizeHandle = useRef<string | null>(null);
  const startPoint = useRef<Point | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const elementsRef = useRef<BoardElement[]>([]);
  const draftRef = useRef<BoardElement | null>(null);
  const skipSyncRef = useRef(true);
  const localEditUntil = useRef(0);
  const lastRemoteAt = useRef(0);
  const lastRemoteJson = useRef("");

  async function loadSavedList() {
    const res = await fetch("/api/whiteboard");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        setSavedBoards(data);
        if (data[0] && !initialLoadDone.current) {
          initialLoadDone.current = true;
          loadBoard(data[0].id);
        }
      }
    }
  }

  async function loadBoard(id: string) {
    const res = await fetch(`/api/whiteboard?id=${id}`);
    if (!res.ok) return;
    const snap = await res.json();
    try {
      const parsed = JSON.parse(snap.data);
      if (Array.isArray(parsed)) setElements(parsed);
      setActiveBoardId(snap.id);
      setBoardName(snap.name);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (roomCode) {
      skipSyncRef.current = true;
      const applyRemote = (d: { data?: string; updatedAt?: number }) => {
        if (drawing.current || draftRef.current) return;
        if (localEditUntil.current > Date.now()) return;
        const remoteAt = d.updatedAt ?? 0;
        if (remoteAt > 0 && remoteAt <= lastRemoteAt.current) return;
        try {
          const parsed = JSON.parse(d.data || "[]");
          if (!Array.isArray(parsed)) return;
          const remoteJson = JSON.stringify(parsed);
          if (remoteJson === lastRemoteJson.current) return;
          const localJson = JSON.stringify(elementsRef.current);
          if (remoteJson === localJson) {
            lastRemoteJson.current = remoteJson;
            lastRemoteAt.current = remoteAt;
            return;
          }
          lastRemoteJson.current = remoteJson;
          lastRemoteAt.current = remoteAt;
          setElements(parsed);
        } catch {
          /* ignore */
        }
      };

      const load = () =>
        fetch(`/api/meetings/${roomCode}/whiteboard`)
          .then((r) => r.json())
          .then(applyRemote);

      load().finally(() => {
        setTimeout(() => {
          skipSyncRef.current = false;
        }, 600);
      });
      const t = setInterval(load, 5000);
      return () => clearInterval(t);
    }
    if (!roomCode) loadSavedList();
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode || skipSyncRef.current) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      const payload = JSON.stringify(elements);
      lastRemoteJson.current = payload;
      fetch(`/api/meetings/${roomCode}/whiteboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: elements }),
      });
    }, 1000);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [elements, roomCode]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const all = [...elements, ...(draft ? [draft] : [])];
    all.forEach((el) => drawElement(ctx, el));

    if (selectedId && tool === "select") {
      const sel = elements.find((e) => e.id === selectedId);
      if (sel) drawSelection(ctx, sel);
    }
  }, [elements, draft, selectedId, tool]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function drawElement(ctx: CanvasRenderingContext2D, el: BoardElement) {
    if (el.type === "path") {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (el.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = "rgba(0,0,0,1)";
        ctx.lineWidth = ERASER_SIZE;
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 3;
      }
      if (el.points.length < 2) {
        const p = el.points[0];
        if (el.tool === "eraser") {
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.arc(p.x, p.y, ERASER_DOT, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        } else {
          ctx.fillStyle = el.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        return;
      }
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      el.points.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color + "22";
    ctx.lineWidth = 2;
    if (el.type === "rect") {
      ctx.strokeRect(el.x, el.y, el.w, el.h);
    } else if (el.type === "circle") {
      ctx.beginPath();
      ctx.arc(el.cx, el.cy, el.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === "text") {
      ctx.fillStyle = el.color;
      ctx.font = `600 ${el.fontSize}px Inter, sans-serif`;
      ctx.fillText(el.text, el.x, el.y);
    }
  }

  function getBounds(el: BoardElement) {
    if (el.type === "rect") {
      const x1 = Math.min(el.x, el.x + el.w);
      const y1 = Math.min(el.y, el.y + el.h);
      return { x1, y1, x2: x1 + Math.abs(el.w), y2: y1 + Math.abs(el.h) };
    }
    if (el.type === "circle") {
      return {
        x1: el.cx - el.r,
        y1: el.cy - el.r,
        x2: el.cx + el.r,
        y2: el.cy + el.r,
      };
    }
    if (el.type === "text") {
      const w = el.text.length * el.fontSize * 0.55;
      return { x1: el.x, y1: el.y - el.fontSize, x2: el.x + w, y2: el.y + 8 };
    }
    if (el.type === "path" && el.points.length) {
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      return {
        x1: Math.min(...xs) - 8,
        y1: Math.min(...ys) - 8,
        x2: Math.max(...xs) + 8,
        y2: Math.max(...ys) + 8,
      };
    }
    return { x1: 0, y1: 0, x2: 0, y2: 0 };
  }

  function drawSelection(ctx: CanvasRenderingContext2D, el: BoardElement) {
    const { x1, y1, x2, y2 } = getBounds(el);
    ctx.strokeStyle = "#5D3A8C";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    ctx.setLineDash([]);
    const handles = [
      [x1, y1],
      [x2, y1],
      [x1, y2],
      [x2, y2],
    ];
    handles.forEach(([hx, hy]) => {
      ctx.fillStyle = "#5D3A8C";
      ctx.fillRect(hx - 5, hy - 5, 10, 10);
    });
  }

  function pos(e: React.MouseEvent): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function getResizeHandle(el: BoardElement, p: Point): string | null {
    const { x1, y1, x2, y2 } = getBounds(el);
    const handles: Record<string, Point> = {
      nw: { x: x1, y: y1 },
      ne: { x: x2, y: y1 },
      sw: { x: x1, y: y2 },
      se: { x: x2, y: y2 },
    };
    for (const [name, hp] of Object.entries(handles)) {
      if (Math.hypot(hp.x - p.x, hp.y - p.y) < 12) return name;
    }
    return null;
  }

  function updateSelected(updater: (el: BoardElement) => BoardElement) {
    if (!selectedId) return;
    setElements((els) =>
      els.map((el) => (el.id === selectedId ? updater(el) : el))
    );
  }

  function onMouseDown(e: React.MouseEvent) {
    const p = pos(e);
    startPoint.current = p;

    if (tool === "text") {
      setTextPrompt(p);
      setTextInput("");
      return;
    }

    if (tool === "select") {
      if (selectedId) {
        const sel = elements.find((el) => el.id === selectedId);
        if (sel) {
          const handle = getResizeHandle(sel, p);
          if (handle) {
            dragMode.current = "resize";
            resizeHandle.current = handle;
            return;
          }
          if (hitElement(sel, p)) {
            dragMode.current = "move";
            return;
          }
        }
      }
      const hit = [...elements].reverse().find((el) => hitElement(el, p));
      setSelectedId(hit?.id ?? null);
      if (hit) dragMode.current = "move";
      return;
    }

    drawing.current = true;
    dragMode.current = "draw";

    if (tool === "pen" || tool === "eraser") {
      setDraft({
        id: "draft",
        type: "path",
        tool,
        color: tool === "eraser" ? "#000000" : color,
        points: [p],
      });
    } else if (tool === "rect") {
      setDraft({ id: "draft", type: "rect", x: p.x, y: p.y, w: 0, h: 0, color });
    } else if (tool === "circle") {
      setDraft({ id: "draft", type: "circle", cx: p.x, cy: p.y, r: 0, color });
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    const p = pos(e);
    const start = startPoint.current;
    if (!start) return;

    if (dragMode.current === "move" && selectedId) {
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      updateSelected((el) => {
        if (el.type === "rect") return { ...el, x: el.x + dx, y: el.y + dy };
        if (el.type === "circle") return { ...el, cx: el.cx + dx, cy: el.cy + dy };
        if (el.type === "text") return { ...el, x: el.x + dx, y: el.y + dy };
        if (el.type === "path")
          return {
            ...el,
            points: el.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
          };
        return el;
      });
      startPoint.current = p;
      requestAnimationFrame(redraw);
      return;
    }

    if (dragMode.current === "resize" && selectedId && resizeHandle.current) {
      updateSelected((el) => {
        if (el.type !== "rect" && el.type !== "circle") return el;
        const { x1, y1, x2, y2 } = getBounds(el);
        let nx1 = x1,
          ny1 = y1,
          nx2 = x2,
          ny2 = y2;
        const h = resizeHandle.current!;
        if (h.includes("n")) ny1 = p.y;
        if (h.includes("s")) ny2 = p.y;
        if (h.includes("w")) nx1 = p.x;
        if (h.includes("e")) nx2 = p.x;
        if (el.type === "rect") {
          return { ...el, x: nx1, y: ny1, w: nx2 - nx1, h: ny2 - ny1 };
        }
        const cx = (nx1 + nx2) / 2;
        const cy = (ny1 + ny2) / 2;
        const r = Math.max(Math.abs(nx2 - nx1), Math.abs(ny2 - ny1)) / 2;
        return { ...el, cx, cy, r };
      });
      requestAnimationFrame(redraw);
      return;
    }

    if (!drawing.current || !draft) return;

    if (draft.type === "path") {
      setDraft({ ...draft, points: [...draft.points, p] });
    } else if (draft.type === "rect" && start) {
      setDraft({
        ...draft,
        w: p.x - start.x,
        h: p.y - start.y,
      });
    } else if (draft.type === "circle" && start) {
      setDraft({
        ...draft,
        r: Math.hypot(p.x - start.x, p.y - start.y),
      });
    }
    requestAnimationFrame(redraw);
  }

  function onMouseUp() {
    if (dragMode.current === "move" || dragMode.current === "resize") {
      dragMode.current = null;
      resizeHandle.current = null;
      startPoint.current = null;
      return;
    }

    if (draft && drawing.current) {
      const finalized = { ...draft, id: uid() } as BoardElement;
      if (
        finalized.type === "path" &&
        finalized.points.length >= 1
      ) {
        setElements((els) => [...els, finalized]);
        localEditUntil.current = Date.now() + 2000;
      } else if (
        finalized.type === "rect" &&
        (Math.abs(finalized.w) > 4 || Math.abs(finalized.h) > 4)
      ) {
        setElements((els) => [...els, finalized]);
        localEditUntil.current = Date.now() + 2000;
      } else if (finalized.type === "circle" && finalized.r > 4) {
        setElements((els) => [...els, finalized]);
        localEditUntil.current = Date.now() + 2000;
      }
    }
    setDraft(null);
    drawing.current = false;
    dragMode.current = null;
    startPoint.current = null;
    redraw();
  }

  function addText() {
    if (!textPrompt || !textInput.trim()) {
      setTextPrompt(null);
      return;
    }
    setElements((els) => [
      ...els,
      {
        id: uid(),
        type: "text",
        x: textPrompt.x,
        y: textPrompt.y,
        text: textInput.trim(),
        color,
        fontSize: 22,
      },
    ]);
    setTextPrompt(null);
    setTextInput("");
  }

  async function save() {
    const name =
      boardName.trim() ||
      (embedded ? `Meeting ${roomCode} board` : "Team Whiteboard");
    const res = await fetch("/api/whiteboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: elements,
        name,
        id: activeBoardId || undefined,
      }),
    });
    if (res.ok) {
      const snap = await res.json();
      setActiveBoardId(snap.id);
      setBoardName(snap.name);
      loadSavedList();
      onSaved?.(`Whiteboard "${snap.name}" saved`);
    }
  }

  async function removeBoard(id: string) {
    if (!confirm(t("whiteboard.confirm_delete"))) return;
    await fetch(`/api/whiteboard?id=${id}`, { method: "DELETE" });
    if (activeBoardId === id) {
      setActiveBoardId(null);
      setElements([]);
    }
    loadSavedList();
    onSaved?.(t("whiteboard.deleted"));
  }

  function presentToMeeting() {
    const canvas = canvasRef.current;
    if (!canvas || !onPresentToMeeting) return;
    const stream = canvas.captureStream(15);
    onPresentToMeeting(stream);
    onSaved?.(t("whiteboard.sharing"));
  }

  const canvasW = embedded ? 960 : 1200;
  const canvasH = embedded ? 480 : 600;

  const toolbar = (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTool(id);
                if (id !== "select") setSelectedId(null);
              }}
              title={label}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition ${
                tool === id
                  ? "bg-[#5D3A8C] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-[#F3EEF8]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}

          {tool !== "eraser" && (
            <div className="border-l border-gray-200 pl-2 ml-1">
              <HexColorPicker color={color} onChange={setColor} />
            </div>
          )}

          {embedded && onPresentToMeeting && (
            <button type="button" onClick={presentToMeeting} className="btn-primary">
              <Monitor className="h-4 w-4" /> {t("whiteboard.share_to_meeting")}
            </button>
          )}
          <button type="button" onClick={save} className="btn-primary ml-auto">
            <Save className="h-4 w-4" /> {t("general.save")}
          </button>
          <button
            type="button"
            onClick={() => {
              setElements([]);
              setSelectedId(null);
              setActiveBoardId(null);
              redraw();
            }}
            className="btn-secondary"
          >
            <Trash2 className="h-4 w-4" /> {t("whiteboard.clear")}
          </button>
        </div>
  );

  return (
    <div>
      {!embedded && (
        <PageHeader
          title={t("whiteboard.title")}
          description={t("whiteboard.description")}
          help={t("whiteboard.help")}
        />
      )}
      <div className={embedded ? "" : "flex gap-4"}>
        {!embedded && (
          <aside className="w-56 shrink-0 card p-3 max-h-[700px] overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              {t("whiteboard.saved_boards")}
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveBoardId(null);
                setBoardName(t("whiteboard.new_board_name"));
                setElements([]);
              }}
              className="w-full btn-secondary text-xs py-2 mb-2"
            >
              + {t("whiteboard.new_board")}
            </button>
            <ul className="space-y-1">
              {savedBoards.map((b) => (
                <li
                  key={b.id}
                  className={`rounded-lg border p-2 text-sm ${
                    activeBoardId === b.id
                      ? "border-[#5D3A8C] bg-[#F3EEF8]"
                      : "border-gray-100"
                  }`}
                >
                  <button
                    type="button"
                    className="w-full text-left font-medium truncate"
                    onClick={() => loadBoard(b.id)}
                  >
                    <FolderOpen className="inline h-3 w-3 mr-1" />
                    {b.name}
                  </button>
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      className="text-[10px] text-[#5D3A8C]"
                      onClick={() => loadBoard(b.id)}
                    >
                      <PencilLine className="inline h-3 w-3" /> {t("general.edit")}
                    </button>
                    <button
                      type="button"
                      className="text-[10px] text-red-600"
                      onClick={() => removeBoard(b.id)}
                    >
                      {t("general.delete")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {savedBoards.length === 0 && (
              <p className="text-xs text-gray-500">{t("whiteboard.no_saves")}</p>
            )}
          </aside>
        )}
      <div className={`card overflow-hidden flex-1 ${embedded ? "border-0 shadow-none" : ""}`}>
        {!embedded && (
          <div className="px-3 py-2 border-b border-gray-100">
            <input
              className="input-field text-sm py-2"
              placeholder={t("whiteboard.board_name")}
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
            />
          </div>
        )}
        {toolbar}

        {textPrompt && (
          <div className="flex gap-2 border-b border-gray-100 bg-[#F3EEF8] p-3">
            <input
              className="input-field flex-1"
              placeholder={t("whiteboard.type_text")}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addText()}
              autoFocus
            />
            <button type="button" onClick={addText} className="btn-primary">
              {t("whiteboard.place")}
            </button>
            <button
              type="button"
              onClick={() => setTextPrompt(null)}
              className="btn-secondary"
            >
              {t("general.cancel")}
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          width={canvasW}
          height={canvasH}
          className={`w-full touch-none bg-white ${
            tool === "pen"
              ? "cursor-wb-pen"
              : tool === "eraser"
                ? "cursor-wb-eraser"
                : tool === "select"
                  ? "cursor-default"
                  : "cursor-crosshair"
          }`}
          style={{ maxHeight: embedded ? "50vh" : "60vh" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
          {embedded
            ? t("whiteboard.tip_meeting")
            : t("whiteboard.tip_standalone")}
        </p>
      </div>
      </div>
    </div>
  );
}
