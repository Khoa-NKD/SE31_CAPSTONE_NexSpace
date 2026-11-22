import fs from 'node:fs';
import { BRAND_MARK_LEFT, BRAND_MARK_RIGHT, BRAND_MARK_SEAM, BRAND_VIEWBOX } from '../src/components/brand/logo-artwork.ts';

const defs = `<linearGradient id="left" x1="0" y1="0" x2="19" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#9685FF"/><stop offset=".48" stop-color="#8062F8"/><stop offset="1" stop-color="#6D35EA"/></linearGradient><linearGradient id="right" x1="49" y1="5" x2="53" y2="64" gradientUnits="userSpaceOnUse"><stop stop-color="#719BFF"/><stop offset="1" stop-color="#2458E6"/></linearGradient><linearGradient id="word"><stop stop-color="#9685FF"/><stop offset="1" stop-color="#8062F8"/></linearGradient>`;
const mark = `<path d="${BRAND_MARK_RIGHT}" fill="url(#right)"/><path d="${BRAND_MARK_LEFT}" fill="url(#left)"/><path d="${BRAND_MARK_SEAM}" stroke="#D7CFFF" stroke-opacity=".55" stroke-width=".35"/>`;
const font = fs.readFileSync(new URL('../public/fonts/inter/inter-latin-wght-normal.woff2', import.meta.url)).toString('base64');
const typography = `<style>@font-face{font-family:NexSpaceBrand;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:100 900}text{font-family:NexSpaceBrand,Inter,Arial,sans-serif}</style>`;
for (const dark of [false, true]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BRAND_VIEWBOX}" width="340" height="66" fill="none" role="img" aria-label="NexSpace — Flexible Workspace"><title>NexSpace — Flexible Workspace</title><defs>${defs}</defs>${typography}<g transform="translate(1 1)">${mark}</g><text x="81" y="42" font-size="52" font-weight="700" letter-spacing="-.025em"><tspan fill="${dark ? '#F4F5FF' : '#151927'}">Nex</tspan><tspan fill="url(#word)">Space</tspan></text><text x="82" y="62.5" font-size="8.3" font-weight="500" letter-spacing="3.6" fill="${dark ? '#AAB3C8' : '#64748B'}">FLEXIBLE WORKSPACE</text></svg>`;
  fs.writeFileSync(new URL(dark ? '../public/logo-dark.svg' : '../public/logo.svg', import.meta.url), svg);
}
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -2 66 68" fill="none" role="img" aria-label="NexSpace"><title>NexSpace</title><defs>${defs}</defs>${mark}</svg>`;
for (const filename of ['logo-mark.svg', 'favicon.svg']) fs.writeFileSync(new URL(`../public/${filename}`, import.meta.url), icon);
console.log('Generated light/dark lockups, compact mark and favicon from approved artwork.');
