// Phones use the real camera; the demo camera is DemoCamera.web.tsx. This keeps the import resolvable.
import type { DemoCameraProps } from "./demoScenes";

export const DemoCamera: (props: DemoCameraProps) => null = () => null;
