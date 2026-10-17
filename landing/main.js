const APP_PATH = "/app/";

// Phones get the app itself, full screen; the framed preview only makes sense on larger screens.
// The path check avoids a reload loop if the server ever answers /app/ with this page.
if (matchMedia("(max-width: 500px)").matches && location.pathname !== APP_PATH) {
  location.replace(APP_PATH);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    showAppLink(new URL(APP_PATH, location.origin).href);
  });
}

function showAppLink(url) {
  const plainUrl = url.replace(/^https?:\/\//, "");
  const link = document.getElementById("app-url");
  link.href = url;
  link.textContent = plainUrl;
  document.getElementById("qr").replaceChildren(qrSvg(encodeQr(url), `QR code for ${plainUrl}`));
}

// QR code rendering

const SVG_NS = "http://www.w3.org/2000/svg";
const QUIET_ZONE = 4; // light modules a scanner needs around the code

function qrSvg(modules, label) {
  const size = modules.length + QUIET_ZONE * 2;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  svg.setAttribute("shape-rendering", "crispEdges");

  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", size);
  background.setAttribute("height", size);
  background.setAttribute("fill", "#fff");

  let d = "";
  modules.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) d += `M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`;
    }),
  );
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "currentColor");

  svg.append(background, path);
  return svg;
}

// QR code encoder (ISO/IEC 18004): byte mode, error correction level M, versions 1 to 40.
// Returns the symbol as rows of booleans, true for a dark module.

// For error correction level M, indexed by version - 1.
const EC_CODEWORDS_PER_BLOCK = [
  10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
];
const EC_BLOCKS = [
  1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26,
  28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
];
const FORMAT_BITS_LEVEL_M = 0b00;
const BYTE_MODE = 0b0100;

const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function encodeQr(text) {
  const bytes = new TextEncoder().encode(text);
  const version = smallestVersion(bytes.length);
  const qr = createSymbol(version);
  placeCodewords(qr, addErrorCorrection(dataCodewords(bytes, version), version));
  applyBestMask(qr);
  return qr.modules;
}

// Capacity

function totalCodewords(version) {
  // Modules left after the function patterns, per the standard's table of symbol capacities.
  let modules = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const alignments = Math.floor(version / 7) + 2;
    modules -= (25 * alignments - 10) * alignments - 55;
    if (version >= 7) modules -= 36;
  }
  return Math.floor(modules / 8);
}

function dataCapacity(version) {
  const ecTotal = EC_CODEWORDS_PER_BLOCK[version - 1] * EC_BLOCKS[version - 1];
  return totalCodewords(version) - ecTotal;
}

function countBits(version) {
  return version < 10 ? 8 : 16;
}

function smallestVersion(byteLength) {
  for (let version = 1; version <= 40; version++) {
    if (4 + countBits(version) + byteLength * 8 <= dataCapacity(version) * 8) return version;
  }
  throw new RangeError("Text is too long for a QR code");
}

// Data and error correction codewords

function dataCodewords(bytes, version) {
  const bits = [];
  const append = (value, length) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  append(BYTE_MODE, 4);
  append(bytes.length, countBits(version));
  bytes.forEach((byte) => append(byte, 8));

  const capacity = dataCapacity(version);
  append(0, Math.min(4, capacity * 8 - bits.length)); // terminator
  append(0, (8 - (bits.length % 8)) % 8);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  for (let i = 0; codewords.length < capacity; i++) codewords.push(i % 2 === 0 ? 0xec : 0x11);
  return codewords;
}

function addErrorCorrection(data, version) {
  const blockCount = EC_BLOCKS[version - 1];
  const ecLength = EC_CODEWORDS_PER_BLOCK[version - 1];
  const total = totalCodewords(version);
  // Blocks share the codewords evenly; the last few carry one extra data codeword.
  const shortBlocks = blockCount - (total % blockCount);
  const shortDataLength = Math.floor(total / blockCount) - ecLength;
  const generator = reedSolomonGenerator(ecLength);

  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  for (let i = 0; i < blockCount; i++) {
    const length = shortDataLength + (i < shortBlocks ? 0 : 1);
    const block = data.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(reedSolomonRemainder(block, generator));
  }
  return [...interleave(dataBlocks), ...interleave(ecBlocks)];
}

function interleave(blocks) {
  const result = [];
  const longest = Math.max(...blocks.map((block) => block.length));
  for (let i = 0; i < longest; i++) {
    for (const block of blocks) if (i < block.length) result.push(block[i]);
  }
  return result;
}

// Reed-Solomon over GF(256), reduced by the QR polynomial x^8 + x^4 + x^3 + x^2 + 1.

function gfMultiply(a, b) {
  let product = 0;
  for (let i = 7; i >= 0; i--) {
    product = (product << 1) ^ ((product >>> 7) * 0x11d);
    product ^= ((b >>> i) & 1) * a;
  }
  return product;
}

// Coefficients of (x - 1)(x - 2)(x - 2^2)...(x - 2^(degree - 1)), highest power first,
// without the leading 1.
function reedSolomonGenerator(degree) {
  const coefficients = new Array(degree).fill(0);
  coefficients[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      coefficients[j] = gfMultiply(coefficients[j], root);
      if (j + 1 < degree) coefficients[j] ^= coefficients[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return coefficients;
}

function reedSolomonRemainder(data, generator) {
  const remainder = new Array(generator.length).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift();
    remainder.push(0);
    generator.forEach((coefficient, i) => {
      remainder[i] ^= gfMultiply(coefficient, factor);
    });
  }
  return remainder;
}

// Module placement

function createSymbol(version) {
  const size = version * 4 + 17;
  const grid = () => Array.from({ length: size }, () => new Array(size).fill(false));
  // `reserved` marks function patterns, which data and masks must leave alone.
  const qr = { version, size, modules: grid(), reserved: grid() };

  for (let i = 0; i < size; i++) {
    setFunctionModule(qr, 6, i, i % 2 === 0);
    setFunctionModule(qr, i, 6, i % 2 === 0);
  }
  drawFinder(qr, 3, 3);
  drawFinder(qr, size - 4, 3);
  drawFinder(qr, 3, size - 4);

  const positions = alignmentPositions(version);
  const last = positions.length - 1;
  positions.forEach((x, i) =>
    positions.forEach((y, j) => {
      const onFinder = (i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0);
      if (!onFinder) drawAlignment(qr, x, y);
    }),
  );

  drawFormatBits(qr, 0); // reserves the area; the real mask is drawn once chosen
  drawVersionBits(qr);
  return qr;
}

function setFunctionModule(qr, x, y, dark) {
  qr.modules[y][x] = dark;
  qr.reserved[y][x] = true;
}

// A 7 × 7 finder plus its light separator, centred on (cx, cy).
function drawFinder(qr, cx, cy) {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      const ring = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < qr.size && y >= 0 && y < qr.size) {
        setFunctionModule(qr, x, y, ring !== 2 && ring !== 4);
      }
    }
  }
}

function drawAlignment(qr, cx, cy) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      setFunctionModule(qr, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
}

function alignmentPositions(version) {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const step = Math.floor((version * 8 + count * 3 + 5) / (count * 4 - 4)) * 2;
  const positions = [6];
  for (let position = version * 4 + 10; positions.length < count; position -= step) {
    positions.splice(1, 0, position);
  }
  return positions;
}

function drawFormatBits(qr, mask) {
  const data = (FORMAT_BITS_LEVEL_M << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const bit = (i) => ((bits >>> i) & 1) === 1;
  const { size } = qr;

  // First copy, around the top-left finder.
  for (let i = 0; i <= 5; i++) setFunctionModule(qr, 8, i, bit(i));
  setFunctionModule(qr, 8, 7, bit(6));
  setFunctionModule(qr, 8, 8, bit(7));
  setFunctionModule(qr, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFunctionModule(qr, 14 - i, 8, bit(i));

  // Second copy, split between the top-right and bottom-left finders.
  for (let i = 0; i < 8; i++) setFunctionModule(qr, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFunctionModule(qr, 8, size - 15 + i, bit(i));
  setFunctionModule(qr, 8, size - 8, true); // always dark
}

function drawVersionBits(qr) {
  if (qr.version < 7) return;
  let remainder = qr.version;
  for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25);
  const bits = (qr.version << 12) | remainder;
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = qr.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(qr, a, b, dark);
    setFunctionModule(qr, b, a, dark);
  }
}

// Data runs in two-module-wide columns from the bottom right, zigzagging up and down;
// column 6 holds the vertical timing pattern and is skipped.
function placeCodewords(qr, codewords) {
  const { size, modules, reserved } = qr;
  let bit = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    const upward = ((right + 1) & 2) === 0;
    for (let i = 0; i < size; i++) {
      const y = upward ? size - 1 - i : i;
      for (const x of [right, right - 1]) {
        if (reserved[y][x] || bit >= codewords.length * 8) continue;
        modules[y][x] = ((codewords[bit >>> 3] >>> (7 - (bit & 7))) & 1) === 1;
        bit++;
      }
    }
  }
}

// Masking

function applyMask(qr, mask) {
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (!qr.reserved[y][x] && MASKS[mask](x, y)) qr.modules[y][x] = !qr.modules[y][x];
    }
  }
}

// Picks the mask that leaves the fewest patterns that confuse scanners.
function applyBestMask(qr) {
  let best = 0;
  let bestPenalty = Infinity;
  for (let mask = 0; mask < MASKS.length; mask++) {
    applyMask(qr, mask);
    drawFormatBits(qr, mask);
    const score = penalty(qr.modules);
    if (score < bestPenalty) {
      best = mask;
      bestPenalty = score;
    }
    applyMask(qr, mask); // masking is an XOR, so applying it again undoes it
  }
  applyMask(qr, best);
  drawFormatBits(qr, best);
}

function penalty(modules) {
  const size = modules.length;
  const columns = modules.map((_, x) => modules.map((row) => row[x]));
  let score = 0;
  for (const line of [...modules, ...columns]) score += linePenalty(line);

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const colour = modules[y][x];
      if (
        colour === modules[y][x + 1] &&
        colour === modules[y + 1][x] &&
        colour === modules[y + 1][x + 1]
      ) {
        score += 3;
      }
    }
  }

  const dark = modules.flat().filter(Boolean).length;
  const total = size * size;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

function linePenalty(line) {
  let score = 0;
  let run = 1;
  for (let i = 1; i <= line.length; i++) {
    if (i < line.length && line[i] === line[i - 1]) {
      run++;
    } else {
      if (run >= 5) score += run - 2;
      run = 1;
    }
  }
  // Finder-like 1:1:3:1:1 runs with four light modules on one side; the quiet zone counts as light.
  const text = `0000${line.map((dark) => (dark ? "1" : "0")).join("")}0000`;
  for (const pattern of ["10111010000", "00001011101"]) {
    for (let i = text.indexOf(pattern); i !== -1; i = text.indexOf(pattern, i + 1)) score += 40;
  }
  return score;
}
