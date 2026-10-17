// The in-app camera: permission, readiness, torch and taking a photo. The web has no in-app camera.
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRef, useState } from "react";
import { Platform } from "react-native";

/** The camera is asked for the smallest picture size that still covers this long edge. */
const PICTURE_LONG_EDGE = 1600;
/** Found once per app session: changing the size restarts the camera, so later checks start with it. */
let chosenPictureSize: string | undefined;

export function useCamera() {
  const native = Platform.OS !== "web";
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [pictureSize, setPictureSize] = useState(chosenPictureSize);
  const [torch, setTorch] = useState(false);

  const onReady = async () => {
    setReady(true);
    if (pictureSize || !cameraRef.current) return;
    try {
      const sizes = await cameraRef.current.getAvailablePictureSizesAsync();
      const fitting = sizes
        .map((s) => ({ s, long: Math.max(...s.split("x").map(Number)) }))
        .filter((x) => x.long >= PICTURE_LONG_EDGE)
        .sort((a, b) => a.long - b.long);
      chosenPictureSize = fitting[0]?.s;
      setPictureSize(chosenPictureSize);
    } catch {
      // The default size works too; it is only slower to capture.
    }
  };

  /** Takes a photo. The preview freezes on it, unless a second angle is still to come. */
  const takePhoto = async ({ keepPreview = false } = {}) => {
    const shot = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      exif: false,
      shutterSound: false,
    });
    if (!keepPreview) cameraRef.current?.pausePreview().catch(() => undefined);
    return shot ?? null;
  };

  const resume = () => {
    if (native && ready) cameraRef.current?.resumePreview().catch(() => undefined);
  };

  return {
    native,
    granted: native && !!permission?.granted,
    needsPermission: native && !!permission && !permission.granted,
    requestPermission,
    cameraRef,
    ready,
    pictureSize,
    torch,
    toggleTorch: () => setTorch((on) => !on),
    onReady,
    takePhoto,
    resume,
  };
}
