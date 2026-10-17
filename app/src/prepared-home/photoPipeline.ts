// On-device photo pipeline (docs/CONTRACTS.md §8):
// capture or pick -> resize to PHOTO.maxLongEdge on the long edge -> re-encode JPEG (drops EXIF)
// -> SHA-256 of the exact bytes that will be sent.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { base64ToBytes, bytesToBase64, sha256Hex } from "./bytes";
import { PHOTO } from "./config";
import { downloadBytes } from "./photoStore";

export interface PreparedPhoto {
  base64: string; // exactly the bytes below, base64 without a data-URI prefix
  bytes: Uint8Array;
  sha256: string;
  width: number;
  height: number;
  previewUri: string;
  origin: "camera" | "library" | "sample";
  sampleId?: string;
}

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 1,
  exif: false,
  allowsEditing: false,
  allowsMultipleSelection: false,
};

/** Opens the photo library; null when the customer cancels. Preparing the image is a separate step. */
export async function pickFromLibrary(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return result.canceled ? null : (result.assets?.[0]?.uri ?? null);
}

/** Re-encodes a photo as a JPEG of at most PHOTO.maxLongEdge on the long edge. */
export async function prepareImage(
  uri: string,
  origin: "camera" | "library",
  known?: { width: number; height: number },
): Promise<PreparedPhoto> {
  const fit = (w: number, h: number) =>
    w >= h ? { width: PHOTO.maxLongEdge } : { height: PHOTO.maxLongEdge };
  let ref;
  if (known && Math.max(known.width, known.height) > PHOTO.maxLongEdge) {
    // The camera reports its size, so the photo is decoded and resized in one pass.
    ref = await ImageManipulator.manipulate(uri)
      .resize(fit(known.width, known.height))
      .renderAsync();
  } else {
    ref = await ImageManipulator.manipulate(uri).renderAsync();
    if (Math.max(ref.width, ref.height) > PHOTO.maxLongEdge) {
      ref = await ImageManipulator.manipulate(ref).resize(fit(ref.width, ref.height)).renderAsync();
    }
  }
  const saved = await ref.saveAsync({
    base64: true,
    compress: PHOTO.jpegQuality,
    format: SaveFormat.JPEG,
  });
  if (!saved.base64) throw new Error("No image data");
  const bytes = base64ToBytes(saved.base64);
  return {
    base64: saved.base64,
    bytes,
    sha256: await sha256Hex(bytes),
    width: saved.width,
    height: saved.height,
    previewUri: saved.uri,
    origin,
  };
}

/** Sample photos are sent byte for byte as served, so recorded results match their hash. */
export async function prepareSample(
  url: string,
  sampleId: string,
  knownSize?: { width?: number; height?: number },
): Promise<PreparedPhoto> {
  const bytes = await downloadBytes(url);
  const size =
    jpegSize(bytes) ??
    (knownSize?.width && knownSize?.height
      ? { width: knownSize.width, height: knownSize.height }
      : null);
  if (!size) throw new Error("Not a JPEG");
  return {
    base64: bytesToBase64(bytes),
    bytes,
    sha256: await sha256Hex(bytes),
    width: size.width,
    height: size.height,
    previewUri: url,
    origin: "sample",
    sampleId,
  };
}

/** Reads width and height from a JPEG's start-of-frame marker. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + length;
  }
  return null;
}
