import {clean} from "./sources.mjs";
import {campusGlyphs} from "./campus-glyphs.mjs";

const maxPostingBytes = 200_000;
const maxFontBytes = 150_000;
const decoder = new TextDecoder();
const privateUse = /[\uE000-\uF8FF]/gu;

export async function readLimitedBytes(body, limit) {
  let size = 0;
  return new Uint8Array(await new Response(body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > limit) throw new Error("Job source exceeded size limit");
      controller.enqueue(chunk);
    },
  }))).arrayBuffer());
}

function fromBase64(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

function fontTables(bytes) {
  const directory = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = new Map();
  for (let index = 0; index < directory.getUint16(4); index++) {
    const record = 12 + index * 16;
    const tag = decoder.decode(bytes.subarray(record, record + 4));
    const offset = directory.getUint32(record + 8);
    const size = directory.getUint32(record + 12);
    tables.set(tag, new DataView(bytes.buffer, bytes.byteOffset + offset, size));
  }
  return tables;
}

function format4Cmap(cmap) {
  for (let index = 0; index < cmap.getUint16(2); index++) {
    const offset = cmap.getUint32(8 + index * 8);
    if (cmap.getUint16(offset) === 4) {
      return new DataView(cmap.buffer, cmap.byteOffset + offset, cmap.getUint16(offset + 2));
    }
  }
  throw new Error("Unsupported campus font character map");
}

function glyphIndex(cmap, code) {
  const segments = cmap.getUint16(6) / 2;
  for (let index = 0; index < segments; index++) {
    const end = cmap.getUint16(14 + index * 2);
    if (code > end) continue;
    const start = cmap.getUint16(16 + segments * 2 + index * 2);
    if (code < start) return 0;
    const delta = cmap.getInt16(16 + segments * 4 + index * 2);
    const rangeField = 16 + segments * 6 + index * 2;
    const range = cmap.getUint16(rangeField);
    const glyph = range ? cmap.getUint16(rangeField + range + 2 * (code - start)) : code;
    return glyph ? (glyph + delta) & 0xffff : 0;
  }
  return 0;
}

async function campusCharacters(font, characters) {
  const tables = fontTables(font);
  const cmap = format4Cmap(tables.get("cmap"));
  const glyf = tables.get("glyf");
  const loca = tables.get("loca");
  const shortOffsets = tables.get("head").getInt16(50) === 0;
  const offset = index => shortOffsets ? 2 * loca.getUint16(index * 2) : loca.getUint32(index * 4);
  const pairs = await Promise.all([...characters].map(async char => {
    const index = glyphIndex(cmap, char.charCodeAt(0));
    if (!index) return [char, undefined];
    const start = offset(index);
    let end = offset(index + 1);
    if (end > glyf.byteLength || end <= start) return [char, undefined];
    // Font subsets retain the original glyph bytes, apart from alignment padding.
    while (end > start && glyf.getUint8(end - 1) === 0) end--;
    const record = new Uint8Array(glyf.buffer, glyf.byteOffset + start, end - start);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", record));
    const key = Array.from(digest.subarray(0, 8), byte => byte.toString(16).padStart(2, "0")).join("");
    return [char, campusGlyphs[key]];
  }));
  return new Map(pairs);
}

export async function loadCampusPosting(url, html, fetcher) {
  const section = html.match(/职位详情\s*<\/h5>([\s\S]*?)(?=<h5\b|$)/iu)?.[1] ?? "";
  const contentId = section.match(/<section\b[^>]*\bid="(content\d+)"/iu)?.[1];
  let posting = section;
  if (contentId) {
    const payload = html.match(new RegExp(`\\$\\("#${contentId}"\\)[\\s\\S]{0,140}?Base64\\.decode\\(unzip\\("([A-Za-z0-9+/=]+)"\\)\\.substr\\((\\d{1,3})\\)\\)\\.substr\\((\\d{1,3})\\)`, "u"));
    if (!payload) return [];
    const compressed = new Blob([fromBase64(payload[1])]).stream();
    const text = decoder.decode(await readLimitedBytes(compressed.pipeThrough(new DecompressionStream("deflate")), maxPostingBytes));
    posting = decoder.decode(fromBase64(text.slice(Number(payload[2])))).slice(Number(payload[3]));
  }
  const lines = posting.replace(/<\/(?:p|li|div|h[1-6])>|<br\s*\/?>/giu, "\n")
    .split(/\r?\n/u).map(clean).filter(Boolean);
  const characters = new Set(lines.flatMap(line => line.match(privateUse) ?? []));
  if (!characters.size) return lines;
  if (characters.size > 512) return [];
  const fontPath = html.match(/font-family:\s*f0;[^}]*?url\(['"]?(\/static\/enfonts\/f0[A-Za-z0-9_-]{4,24}\.ttf)['"]?\)/u)?.[1];
  if (!fontPath) return [];
  const font = await fetcher(new URL(fontPath, url).href, {redirect:"manual", signal:AbortSignal.timeout(3500)});
  if (!font.ok || !font.body) {
    await font.body?.cancel();
    return [];
  }
  const charactersByGlyph = await campusCharacters(await readLimitedBytes(font.body, maxFontBytes), characters);
  return lines.map(line => line.replace(privateUse, char => charactersByGlyph.get(char) ?? char))
    .filter(line => !/[\uE000-\uF8FF]/u.test(line));
}
