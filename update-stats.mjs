// Legge iscritti e ultimo video dall'API di YouTube e riscrive stats.json solo se qualcosa è cambiato.
// Variabili: YOUTUBE_API_KEY (obbligatoria), YOUTUBE_HANDLE (default "BsQuik"), YT_API_BASE (solo per test).
import { readFile, writeFile } from 'node:fs/promises';

const KEY = process.env.YOUTUBE_API_KEY;
const HANDLE = (process.env.YOUTUBE_HANDLE || 'BsQuik').replace(/^@/, '');
const BASE = process.env.YT_API_BASE || 'https://www.googleapis.com/youtube/v3';
const FILE = new URL('../stats.json', import.meta.url);

if (!KEY) { console.error('Manca YOUTUBE_API_KEY (Settings → Secrets → Actions).'); process.exit(1); }

async function yt(path, params) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

let prev = {};
try { prev = JSON.parse(await readFile(FILE, 'utf8')); } catch { /* primo avvio */ }

const ch = (await yt('/channels', { part: 'statistics,contentDetails', forHandle: HANDLE })).items?.[0];
if (!ch) throw new Error(`Canale @${HANDLE} non trovato.`);

const stats = ch.statistics;
const subscribers = stats.hiddenSubscriberCount ? prev.subscribers ?? null : Number(stats.subscriberCount);

let latestVideo = prev.latestVideo ?? null;
const uploads = ch.contentDetails?.relatedPlaylists?.uploads;
if (uploads) {
  const v = (await yt('/playlistItems', { part: 'snippet,contentDetails', playlistId: uploads, maxResults: 1 })).items?.[0];
  if (v) latestVideo = {
    id: v.contentDetails.videoId,
    title: v.snippet.title,
    publishedAt: v.contentDetails.videoPublishedAt || v.snippet.publishedAt,
  };
}

const next = { subscribers, latestVideo };
const strip = ({ updatedAt, ...rest }) => JSON.stringify(rest);

if (strip(prev) === strip(next)) { console.log('Nessuna novità, stats.json invariato.'); process.exit(0); }

await writeFile(FILE, JSON.stringify({ ...next, updatedAt: new Date().toISOString() }, null, 2) + '\n');
console.log('stats.json aggiornato:', next.subscribers, 'iscritti');
