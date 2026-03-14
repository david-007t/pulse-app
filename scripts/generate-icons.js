const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7C3AED"/>
  <text
    x="256"
    y="340"
    text-anchor="middle"
    font-size="320"
    fill="white"
    font-family="Arial, sans-serif"
    font-weight="bold"
  >P</text>
</svg>
`;

const svgBuffer = Buffer.from(svg);

async function generate() {
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192x192.png"));
  console.log("✓ icon-192x192.png");

  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512x512.png"));
  console.log("✓ icon-512x512.png");

  console.log("Icons generated in public/icons/");
}

generate().catch(console.error);
