// Reads the pixel size of a JPEG from its frame header, without decoding the image.

export interface JpegSize {
  width: number;
  height: number;
}

export function isJpeg(buf: Uint8Array): boolean {
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
}

// Start-of-frame markers: C0-CF except C4 (DHT), C8 (JPG) and CC (DAC).
function isSof(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

/** Returns the size from the first SOF segment, or null when the bytes are not a readable JPEG. */
export function jpegSize(buf: Uint8Array): JpegSize | null {
  if (!isJpeg(buf)) return null;
  let i = 2;
  while (i + 3 < buf.length) {
    if (buf[i] !== 0xff) return null;
    let marker = buf[i + 1];
    // Fill bytes (0xFF padding) before a marker.
    while (marker === 0xff && i + 2 < buf.length) {
      i += 1;
      marker = buf[i + 1];
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2; // standalone markers carry no length
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end of image or start of scan before any frame header
    if (i + 3 >= buf.length) return null;
    const segLen = (buf[i + 2] << 8) | buf[i + 3];
    if (segLen < 2) return null;
    if (isSof(marker)) {
      if (i + 8 >= buf.length) return null;
      const height = (buf[i + 5] << 8) | buf[i + 6];
      const width = (buf[i + 7] << 8) | buf[i + 8];
      if (width === 0 || height === 0) return null;
      return { width, height };
    }
    i += 2 + segLen;
  }
  return null;
}

export const MAX_LONG_EDGE = 2576;
