// The web demo camera: a licensed photo of the spot as a scene to aim at. Drag to pan; wheel, trackpad
// or pinch to zoom; arrow and +/- keys too. Moves go straight to the image's transform, so aiming never
// re-renders React and stays smooth. The shutter sends the scene photo as it is: its result was recorded
// (server/scripts/record-scenes.ts), so the public demo answers at once, free and the same for everyone.
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { prepareSample } from "../../photo/pipeline";
import { sceneUrl, type DemoCameraProps } from "./demoScenes";
import { clampView, startView, zoomAt, type SceneView, type Size } from "./sceneView";

interface Point {
  x: number;
  y: number;
}

const KEY_STEP = 40;
const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) || 1;

export function DemoCamera({ scene, ref, onReady, hint }: DemoCameraProps) {
  const frame = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const view = useRef<SceneView>({ x: 0, y: 0, scale: 1 });
  const pointers = useRef(new Map<number, Point>());
  const [natural, setNatural] = useState<Size | null>(null);

  const frameSize = (): Size => ({
    width: frame.current?.clientWidth ?? 1,
    height: frame.current?.clientHeight ?? 1,
  });
  const local = (e: { clientX: number; clientY: number }): Point => {
    const rect = frame.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };
  const apply = (next: SceneView, glide = false) => {
    view.current = next;
    const el = img.current;
    if (!el) return;
    // A short glide smooths mouse-wheel steps; drags and pinches follow the pointer exactly.
    el.style.transition = `opacity 250ms ease-out${glide ? ", transform 140ms ease-out" : ""}`;
    el.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${next.scale})`;
  };
  const move = (next: SceneView, glide = false) => {
    if (natural) apply(clampView(next, frameSize(), natural), glide);
  };
  const zoom = (factor: number, at: Point, glide = false) => {
    if (natural) apply(zoomAt(view.current, factor, at, frameSize(), natural), glide);
  };

  useEffect(() => () => onReady(false), [onReady]);

  // The frame changes size with the window or the text size: the scene keeps filling it.
  useEffect(() => {
    const el = frame.current;
    if (!el || !natural) return;
    const observer = new ResizeObserver(() => apply(clampView(view.current, frameSize(), natural)));
    observer.observe(el);
    return () => observer.disconnect();
  });

  // Registered by hand: React's wheel listener is passive, and an unhandled wheel would scroll the
  // page around the frame instead of zooming.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // ctrlKey marks a trackpad pinch, which sends small steps.
      zoom(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)), local(e), Math.abs(dy) >= 50);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  useImperativeHandle(ref, () => ({
    capture: async () =>
      natural ? prepareSample(sceneUrl(scene), `demo:${scene.file}`, natural) : null,
  }));

  const onLoad = () => {
    const el = img.current;
    if (!el) return;
    const size = { width: el.naturalWidth, height: el.naturalHeight };
    setNatural(size);
    apply(startView(frameSize(), size));
    el.style.opacity = "1";
    onReady(true);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
    pointers.current.set(e.pointerId, local(e));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const before = pointers.current.get(e.pointerId);
    if (!before) return;
    const now = local(e);
    pointers.current.set(e.pointerId, now);
    const other = [...pointers.current].find(([id]) => id !== e.pointerId)?.[1];
    const v = view.current;
    if (!other) return move({ ...v, x: v.x + now.x - before.x, y: v.y + now.y - before.y });
    // Two fingers: follow their midpoint and zoom by how far apart they moved.
    const [from, to] = [mid(before, other), mid(now, other)];
    apply({ ...v, x: v.x + to.x - from.x, y: v.y + to.y - from.y });
    zoom(distance(now, other) / distance(before, other), to);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) e.currentTarget.style.cursor = "grab";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const v = view.current;
    const centre = { x: frameSize().width / 2, y: frameSize().height / 2 };
    const pans: Record<string, Point> = {
      ArrowLeft: { x: KEY_STEP, y: 0 },
      ArrowRight: { x: -KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: KEY_STEP },
      ArrowDown: { x: 0, y: -KEY_STEP },
    };
    const pan = pans[e.key];
    if (pan) move({ ...v, x: v.x + pan.x, y: v.y + pan.y }, true);
    else if (e.key === "+" || e.key === "=") zoom(1.25, centre, true);
    else if (e.key === "-") zoom(0.8, centre, true);
    else return;
    e.preventDefault();
  };

  return (
    <div
      ref={frame}
      role="group"
      aria-label={hint}
      tabIndex={0}
      data-testid="demo-camera"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        touchAction: "none",
        cursor: "grab",
        outlineOffset: -4,
      }}
    >
      <img
        ref={img}
        src={sceneUrl(scene)}
        alt=""
        draggable={false}
        onLoad={onLoad}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          maxWidth: "none",
          transformOrigin: "0 0",
          willChange: "transform",
          opacity: 0,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}
