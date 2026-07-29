/** Deterministic gradient shown when an image is missing or fails to load. */
export function fallbackDataUri(seed = 'nightgals', label = '') {
  const hue = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="hsl(${hue},22%,17%)"/>
<stop offset="55%" stop-color="hsl(${(hue + 40) % 360},18%,11%)"/>
<stop offset="100%" stop-color="#0b0a0f"/></linearGradient></defs>
<rect width="600" height="750" fill="url(#g)"/>
<circle cx="300" cy="320" r="106" fill="none" stroke="rgba(217,180,106,.32)" stroke-width="1.5"/>
<text x="300" y="352" text-anchor="middle" font-family="Georgia,serif" font-size="76"
 fill="rgba(217,180,106,.6)">${(label || 'N').slice(0, 1).toUpperCase()}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
