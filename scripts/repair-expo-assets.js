const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const assetDir = path.resolve(__dirname, "../assets");
const assetNames = ["icon.png", "splash-icon.png", "adaptive-icon.png", "favicon.png"];
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function isValidPng(filePath) {
  try {
    const png = fs.readFileSync(filePath);
    if (png.length < 45 || !png.subarray(0, 8).equals(SIGNATURE)) return false;
    let offset = 8;
    let sawHeader = false;
    let sawEnd = false;
    const imageData = [];
    while (offset + 12 <= png.length) {
      const length = png.readUInt32BE(offset);
      const end = offset + 12 + length;
      if (end > png.length) return false;
      const type = png.toString("ascii", offset + 4, offset + 8);
      const data = png.subarray(offset + 8, offset + 8 + length);
      const storedCrc = png.readUInt32BE(offset + 8 + length);
      if (crc32(png.subarray(offset + 4, offset + 8 + length)) !== storedCrc) return false;
      if (type === "IHDR") {
        if (length !== 13) return false;
        sawHeader = true;
      }
      if (type === "IDAT") imageData.push(data);
      if (type === "IEND") { sawEnd = true; offset = end; break; }
      offset = end;
    }
    if (!sawHeader || !sawEnd || offset !== png.length || imageData.length === 0) return false;
    zlib.inflateSync(Buffer.concat(imageData));
    return true;
  } catch {
    return false;
  }
}

function createNutriLiftPng(size = 512) {
  const scanlineLength = 1 + size * 4;
  const raw = Buffer.alloc(scanlineLength * size);
  for (let y = 0; y < size; y++) {
    const row = y * scanlineLength;
    raw[row] = 0; // PNG filter: None
    for (let x = 0; x < size; x++) {
      const scale = size / 256;
      const px = x / scale;
      const py = y / scale;
      const left = px >= 58 && px <= 86 && py >= 48 && py <= 208;
      const right = px >= 170 && px <= 198 && py >= 48 && py <= 208;
      const diagonal = py >= 48 && py <= 208 && px >= 58 + (py - 48) * 0.70 && px <= 86 + (py - 48) * 0.70;
      const glyph = left || right || diagonal;
      const p = row + 1 + x * 4;
      raw[p] = glyph ? 0 : 10;
      raw[p + 1] = glyph ? 212 : 10;
      raw[p + 2] = glyph ? 170 : 15;
      raw[p + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;  // bit depth
  header[9] = 6;  // RGBA
  header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const assetPaths = assetNames.map((name) => path.join(assetDir, name));
if (assetPaths.every(isValidPng)) {
  console.log("Expo PNG assets passed integrity checks.");
  process.exit(0);
}

fs.mkdirSync(assetDir, { recursive: true });
const generated = createNutriLiftPng();
for (const filePath of assetPaths) fs.writeFileSync(filePath, generated);
if (!assetPaths.every(isValidPng)) throw new Error("Generated Expo PNG assets failed integrity checks.");
console.log("Repaired invalid Expo PNG assets with validated NutriLift artwork.");
