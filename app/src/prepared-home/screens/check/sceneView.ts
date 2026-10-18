// Where the demo camera looks in its scene: pan and zoom that keep the scene filling the frame.

export interface Size {
  width: number;
  height: number;
}

/** The scene's top-left corner in the frame (px) and its scale (frame px per scene px). */
export interface SceneView {
  x: number;
  y: number;
  scale: number;
}

const MAX_ZOOM = 4;

const coverScale = (frame: Size, image: Size) =>
  Math.max(frame.width / image.width, frame.height / image.height);

/** Keeps the scene filling the frame: never smaller than the frame, at most MAX_ZOOM times closer. */
export function clampView(view: SceneView, frame: Size, image: Size): SceneView {
  const min = coverScale(frame, image);
  const scale = Math.min(Math.max(view.scale, min), min * MAX_ZOOM);
  const x = Math.min(0, Math.max(frame.width - image.width * scale, view.x));
  const y = Math.min(0, Math.max(frame.height - image.height * scale, view.y));
  return { x, y, scale };
}

/** The whole frame filled, centred. */
export function startView(frame: Size, image: Size): SceneView {
  const scale = coverScale(frame, image);
  return {
    x: (frame.width - image.width * scale) / 2,
    y: (frame.height - image.height * scale) / 2,
    scale,
  };
}

/** Zooms around a point in the frame, so what is under the cursor or fingers stays there. */
export function zoomAt(
  view: SceneView,
  factor: number,
  point: { x: number; y: number },
  frame: Size,
  image: Size,
): SceneView {
  const scale = clampView({ ...view, scale: view.scale * factor }, frame, image).scale;
  const k = scale / view.scale;
  const zoomed = {
    scale,
    x: point.x - (point.x - view.x) * k,
    y: point.y - (point.y - view.y) * k,
  };
  return clampView(zoomed, frame, image);
}
