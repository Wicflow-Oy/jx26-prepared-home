// Native photo store: the JPEG bytes that were checked, kept in the app's document folder by SHA-256.
// A copy of each checked photo is kept here. Every photo is also sent to the server (and the Claude API)
// for the check; shared photos are sent again with a claim.
import { Directory, File, Paths } from "expo-file-system";

const FOLDER = "prepared-home-photos";

function folder(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function fileFor(sha256: string): File {
  return new File(folder(), `${sha256}.jpg`);
}

export async function savePhoto(sha256: string, bytes: Uint8Array): Promise<void> {
  const file = fileFor(sha256);
  if (file.exists) return; // same hash, same bytes
  file.create({ overwrite: true });
  await file.write(bytes);
}

export async function loadPhotoBase64(sha256: string): Promise<string | null> {
  const file = fileFor(sha256);
  return file.exists ? file.base64() : null;
}

/** A URI an <Image> can show, or null. */
export async function photoUri(sha256: string): Promise<string | null> {
  const file = fileFor(sha256);
  return file.exists ? file.uri : null;
}

export async function clearPhotos(): Promise<void> {
  const dir = new Directory(Paths.document, FOLDER);
  if (dir.exists) dir.delete();
}

/** Downloads a file (a sample photo) and returns its exact bytes. */
export async function downloadBytes(url: string): Promise<Uint8Array> {
  const tmpDir = new Directory(Paths.cache, "prepared-home-samples");
  if (!tmpDir.exists) tmpDir.create({ intermediates: true, idempotent: true });
  const file = await File.downloadFileAsync(url, tmpDir, { idempotent: true });
  try {
    return await file.bytes();
  } finally {
    try {
      file.delete();
    } catch {
      // A leftover cache file is harmless.
    }
  }
}
