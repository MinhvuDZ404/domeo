// Player-facing preferences, stored separately from the journey save so a
// settings mistake can never invalidate progress.
export const SETTINGS_KEY = 'domeo.settings.v1';

export const MOTION_MODES = ['system', 'on', 'off'];

export const DEFAULT_SETTINGS = Object.freeze({
  volume: 0.7,
  ambient: true,
  particles: true,
  motion: 'system',
  debug: false,
});

const number = (value) => typeof value === 'number' && Number.isFinite(value);

// The slider is a 0-100 control while the stored volume is a 0-1 fraction.
// Both conversions live here so the two scales cannot drift apart again.
export const clampVolume = (value) =>
  value !== '' && value !== null && Number.isFinite(Number(value))
    ? Math.min(1, Math.max(0, Number(value)))
    : DEFAULT_SETTINGS.volume;
export const volumeToPercent = (volume) => Math.round(clampVolume(volume) * 100);
// An empty or missing slider value falls back to the default instead of muting.
export const percentToVolume = (percent) =>
  percent === '' || percent === null || percent === undefined
    ? DEFAULT_SETTINGS.volume
    : clampVolume(Number(percent) / 100);

// Unknown keys are dropped and broken values fall back to the default, so a
// stale or hand-edited entry cannot break the game.
export function normalizeSettings(value) {
  const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const settings = { ...DEFAULT_SETTINGS };
  if (number(source.volume)) settings.volume = clampVolume(source.volume);
  for (const key of ['ambient', 'particles', 'debug'])
    if (typeof source[key] === 'boolean') settings[key] = source[key];
  if (MOTION_MODES.includes(source.motion)) settings.motion = source.motion;
  return settings;
}

export function validateSettings(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  if (!number(value.volume) || value.volume < 0 || value.volume > 1) return false;
  for (const key of ['ambient', 'particles', 'debug'])
    if (typeof value[key] !== 'boolean') return false;
  if (!MOTION_MODES.includes(value.motion)) return false;
  return Object.keys(value).length === Object.keys(DEFAULT_SETTINGS).length;
}

export function readSettings(storage) {
  try {
    const raw = (storage ?? globalThis.localStorage).getItem(SETTINGS_KEY);
    if (!raw) return { settings: { ...DEFAULT_SETTINGS }, repaired: false, error: null };
    if (raw.length > 4096)
      return {
        settings: { ...DEFAULT_SETTINGS },
        repaired: true,
        error: 'Cài đặt quá lớn, đã dùng giá trị mặc định.',
      };
    const parsed = JSON.parse(raw);
    const valid = validateSettings(parsed);
    return { settings: normalizeSettings(parsed), repaired: !valid, error: null };
  } catch {
    return {
      settings: { ...DEFAULT_SETTINGS },
      repaired: true,
      error: 'Không đọc được cài đặt, đang dùng giá trị mặc định.',
    };
  }
}

export function writeSettings(settings, storage) {
  const normalized = normalizeSettings(settings);
  try {
    (storage ?? globalThis.localStorage).setItem(SETTINGS_KEY, JSON.stringify(normalized));
    return { ok: true, error: null, settings: normalized };
  } catch {
    return {
      ok: false,
      error: 'Chưa lưu được cài đặt. Bộ nhớ trình duyệt có thể đã đầy hoặc bị chặn.',
      settings: normalized,
    };
  }
}
