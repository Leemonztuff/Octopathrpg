import fs from "fs";
import { createCanvas, loadImage } from "canvas";

const INPUT = process.argv[2];
const OUTPUT = process.argv[3] || "atlas.json";

if (!INPUT) {
  console.log("Usage: node generateAtlas.js ui.png atlas.json");
  process.exit(1);
}

function isTransparent(r, g, b, a) {
  return a < 10;
}

function getPixel(data, x, y, width) {
  const i = (y * width + x) * 4;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2],
    a: data[i + 3],
  };
}

function floodFill(data, visited, width, height, startX, startY) {
  const stack = [[startX, startY]];
  let minX = startX, maxX = startX;
  let minY = startY, maxY = startY;

  while (stack.length) {
    const [x, y] = stack.pop();
    const key = `${x},${y}`;

    if (
      x < 0 || y < 0 || x >= width || y >= height ||
      visited.has(key)
    ) continue;

    const p = getPixel(data, x, y, width);
    if (isTransparent(p.r, p.g, p.b, p.a)) continue;

    visited.add(key);

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    stack.push([x + 1, y]);
    stack.push([x - 1, y]);
    stack.push([x, y + 1]);
    stack.push([x, y - 1]);
  }

  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function classify(rect) {
  const { w, h } = rect;

  if (w > 400 && h > 400) return "panel";
  if (w > 300 && h < 150) return "bar";
  if (w === h && w >= 200) return "button";
  if (w === h && w <= 150) return "slot";

  return "unknown";
}

function nineSlice(rect) {
  const border = Math.floor(Math.min(rect.w, rect.h) * 0.15);

  return {
    top: border,
    bottom: border,
    left: border,
    right: border,
  };
}

async function run() {
  const img = await loadImage(INPUT);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, img.width, img.height);

  const visited = new Set();
  const rects = [];

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;

      const p = getPixel(data, x, y, img.width);
      if (isTransparent(p.r, p.g, p.b, p.a)) continue;

      const rect = floodFill(data, visited, img.width, img.height, x, y);

      if (rect.w < 20 || rect.h < 20) continue; // ruido

      rects.push(rect);
    }
  }

  const atlas = {
    meta: {
      image: INPUT,
      size: { w: img.width, h: img.height },
    },
    frames: {},
  };

  rects.forEach((r, i) => {
    const type = classify(r);

    atlas.frames[`sprite_${i}`] = {
      frame: r,
      type,
      nineSlice: type === "panel" || type === "slot" ? nineSlice(r) : null,
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(atlas, null, 2));

  console.log("Atlas generado:", OUTPUT);
}

run();
