const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// SiteSense icon - dark blue with "SS"
const createIconSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#0f172a"/>
  <text x="${size/2}" y="${size * 0.66}" font-family="Arial, sans-serif" font-size="${size * 0.43}" font-weight="bold" fill="white" text-anchor="middle">SS</text>
</svg>`;

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate icon SVGs
iconSizes.forEach(size => {
  const svgContent = createIconSVG(size);
  const filename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(filename, svgContent.trim());
  console.log(`Created: icon-${size}x${size}.svg`);
});

console.log('\nAll SVG icons created!');
console.log('Run: node scripts/convert-to-png.js to convert to PNG');
