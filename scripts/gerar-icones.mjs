import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
mkdirSync("public/icons", { recursive: true });
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const v of b) {
    c ^= v;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
function icon(size, file) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2,
        dy = y - size / 2,
        r = Math.hypot(dx, dy) / size;
      let color = [14, 22, 24];
      if (r < 0.31) color = [238, 127, 163];
      if (r < 0.265) color = [238, 191, 210];
      if (r < 0.11) color = [127, 81, 151];
      if (Math.hypot(dx + size * 0.02, dy + size * 0.015) < size * 0.065)
        color = [177, 136, 191];
      const theta = Math.atan2(dy, dx);
      if (r > 0.305 && r < 0.365 && Math.cos(theta * 24) > 0.2)
        color = [225, 178, 205];
      const i = x * 4 + 1;
      row[i] = color[0];
      row[i + 1] = color[1];
      row[i + 2] = color[2];
      row[i + 3] = 255;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(Buffer.concat(rows))),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}
icon(192, "public/icons/icon-192.png");
icon(512, "public/icons/icon-512.png");
icon(512, "public/icons/maskable-512.png");
writeFileSync(
  "public/icons/icon.svg",
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="100" fill="#0E1618"/><circle cx="256" cy="256" r="169" fill="#cc97ba"/><circle cx="256" cy="256" r="141" fill="#eebfd2"/><circle cx="256" cy="256" r="57" fill="#7f5197"/><circle cx="246" cy="248" r="33" fill="#b188bf"/></svg>',
);
