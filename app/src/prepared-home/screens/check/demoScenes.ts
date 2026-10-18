// Scenes for the web demo camera: licensed photos of each check's spot, bundled in public/demo-scenes.
import { useEffect, useState, type Ref } from "react";

import type { PreparedPhoto } from "../../photo/pipeline";

export interface DemoScene {
  file: string;
  author: string;
  licence: string;
  licenceUrl: string;
  /** The file page on Wikimedia Commons. */
  sourceUrl: string;
  title: string;
  /** Where the photo is when it is not one of the bundled scenes. */
  url?: string;
}

export interface DemoCameraHandle {
  /** The scene photo as it is, with its recorded result; null before the scene loads. */
  capture: () => Promise<PreparedPhoto | null>;
}

export interface DemoCameraProps {
  scene: DemoScene;
  ref: Ref<DemoCameraHandle>;
  /** Whether the shutter can take the scene yet. */
  onReady: (ready: boolean) => void;
  hint: string;
}

const BASE = `${process.env.EXPO_BASE_URL ?? ""}/demo-scenes`;

export const sceneUrl = (scene: DemoScene) => scene.url ?? `${BASE}/${scene.file}`;

let loading: Promise<Record<string, DemoScene[]>> | null = null;

function loadScenes(): Promise<Record<string, DemoScene[]>> {
  loading ??= fetch(`${BASE}/scenes.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Record<string, DemoScene[]>>) : {}))
    .catch(() => {
      // A later check tries again rather than keeping the failure.
      loading = null;
      return {};
    });
  return loading;
}

/** The scene shown for a check, and a way to the next one; nothing is fetched unless enabled. */
export function useDemoScenes(checkId: string, enabled: boolean) {
  const [all, setAll] = useState<Record<string, DemoScene[]> | null>(null);
  const [pick, setPick] = useState({ checkId, index: 0 });
  useEffect(() => {
    if (!enabled) return;
    let current = true;
    void loadScenes().then((scenes) => {
      if (current) setAll(scenes);
    });
    return () => {
      current = false;
    };
  }, [enabled]);

  const scenes = all?.[checkId] ?? [];
  // Another check starts again from its first scene.
  const index = pick.checkId === checkId && scenes.length > 0 ? pick.index % scenes.length : 0;
  return {
    loaded: all !== null,
    scene: scenes[index] ?? null,
    count: scenes.length,
    next: () => setPick({ checkId, index: index + 1 }),
  };
}
