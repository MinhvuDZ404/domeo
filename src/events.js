// Deterministic world events for Domeo 5.1.
//
// An event is decided by (world seed, time band) only, so the same journey
// always sees the same weather-like moods at the same moments, and a reload in
// the middle of one simply carries on. Events are transient by design: they are
// never written to the save, and none of them hands out a permanent reward that
// could be farmed by re-entering the band. Crystal bonuses apply per gather, not
// as a stored stack.
import { clamp } from './config.js';

export const EVENT_BAND = 300; // 5 simulated minutes: five bands in a 24-minute day.

export const WORLD_EVENTS = {
  fireflies: {
    label: 'Đom đóm bừng sáng',
    note: 'Cả khu rừng lấp lánh những đốm sáng nhỏ.',
    nightOnly: true,
    mood: 'calm',
    darkness: -0.08,
  },
  mistSurge: {
    label: 'Sương dâng',
    note: 'Sương về nhanh hơn mọi ngày. Đi chậm và nhớ đường.',
    mood: 'hush',
    darkness: 0.05,
  },
  crystalSong: {
    label: 'Tinh thể ngân lên',
    note: 'Các mạch tinh thể quanh đây sáng hơn thường lệ.',
    mood: 'bright',
    darkness: -0.04,
    crystalBonus: 1,
  },
  ancientGlow: {
    label: 'Ánh cổ xưa',
    note: 'Một luồng sáng mờ phía xa, như có gì đó đang gọi.',
    mood: 'mystery',
    darkness: -0.02,
    requiresBiome: 'ancient',
  },
};

const TYPES = Object.keys(WORLD_EVENTS);

function bandHash(seed, band) {
  let h = (seed >>> 0) ^ Math.imul(band + 0x2545f491, 2654435761);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  h = Math.imul(h ^ (h >>> 16), 0x27d4eb2f);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * The event active at `elapsed` for this seed, or null.
 * `isNight` and `biome` only ever *filter* an event, they never re-roll it, so
 * walking into a different biome cannot shuffle the event stream.
 */
export function getWorldEvent(elapsed, seed = 0, { isNight = false, biome = 'woodland' } = {}) {
  const safe = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const band = Math.floor(safe / EVENT_BAND);
  const roll = bandHash(seed, band);
  if (roll % 100 >= 34) return null; // Roughly one band in three carries an event.
  const type = TYPES[(roll >>> 8) % TYPES.length];
  const config = WORLD_EVENTS[type];
  if (config.nightOnly && !isNight) return null;
  if (config.requiresBiome && biome !== config.requiresBiome) return null;
  const startedAt = band * EVENT_BAND;
  const t = (safe - startedAt) / EVENT_BAND;
  // Intensity eases in and out so the world never snaps between moods.
  const intensity = clamp(Math.sin(clamp(t, 0, 1) * Math.PI) * 1.15, 0, 1);
  return {
    id: `${type}:${band}`,
    type,
    label: config.label,
    note: config.note,
    mood: config.mood,
    startedAt,
    endsAt: startedAt + EVENT_BAND,
    progress: clamp(t, 0, 1),
    intensity,
    darkness: config.darkness ?? 0,
    crystalBonus: config.crystalBonus ?? 0,
  };
}

/** Label of the active event, used by the HUD and the debug overlay. */
export function worldEventLabel(event) {
  return event ? event.label : '';
}
