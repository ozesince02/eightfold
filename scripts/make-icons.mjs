// Draws the notification icons from the crane mark: a full-colour icon and a
// one-colour badge (Android shows badges as a white silhouette).
import sharp from 'sharp';

const crane = (a, b) => `
  <path d="M22 34 L5 13 L29 31 Z" fill="${b}"/><path d="M41 34 L56 9 L35 31 Z" fill="${b}"/>
  <path d="M56 9 L63 15 L55 13 Z" fill="${b}"/><path d="M19 34 L32 41 L45 34 L32 29 Z" fill="${a}"/>
  <path d="M25 31 L35 1 L40 31 Z" fill="${a}"/>`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="20" fill="#E6E5E1"/>
  <g transform="translate(16 22)">${crane('#C8302C', '#1E1B18')}</g></svg>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <g transform="translate(6 14) scale(1.31)">${crane('#fff', '#fff')}</g></svg>`;

await sharp(Buffer.from(icon)).resize(192, 192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(icon)).resize(512, 512).png().toFile('public/icon-512.png');
await sharp(Buffer.from(badge)).resize(96, 96).png().toFile('public/badge-96.png');
console.log('icons written');
