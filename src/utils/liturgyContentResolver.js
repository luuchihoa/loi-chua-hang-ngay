import { getLiturgyInfo, getLiturgicalYear } from './liturgyCalendar.js';

const CONTENT_FIELDS = [
  'title', 'mass_title', 'quote',
  'r1_ref', 'r1_quote', 'r1_intro', 'r1_content',
  'psalm_ref', 'psalm_content',
  'r2_ref', 'r2_quote', 'r2_intro', 'r2_content',
  'gospel_ref', 'gospel_alleluia', 'gospel_intro', 'gospel_content',
  'reflection', 'extra_readings',
];

const hasValue = (value) => {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).replace(/<[^>]*>/g, '').trim().length > 0;
};

export function getLiturgicalCycles(year) {
  return {
    sundayCycle: ['C', 'A', 'B'][year % 3],
    weekdayCycle: year % 2 === 0 ? 'II' : 'I',
  };
}

export function mergeLiturgyRowsForKey(rows, targetKey, cycles, preferredCycle = null) {
  if (!targetKey) return null;
  const matches = rows.filter((row) => row.liturgy_key === targetKey);
  if (!matches.length) return null;

  const sundayRow = matches.find((row) => row.cycle === (preferredCycle || cycles.sundayCycle));
  const weekdayCycle = preferredCycle === 'I' || preferredCycle === 'II'
    ? preferredCycle
    : cycles.weekdayCycle;
  const weekdayRow = matches.find((row) => row.cycle === weekdayCycle);
  const allRow = matches.find((row) => row.cycle === 'all');
  const fallbackRow = matches.find((row) => !['all', 'I', 'II', 'A', 'B', 'C'].includes(row.cycle)) || matches[0];
  const merged = {};

  for (const field of CONTENT_FIELDS) {
    const value = [sundayRow?.[field], weekdayRow?.[field], allRow?.[field], fallbackRow?.[field]].find(hasValue);
    if (value !== undefined) merged[field] = value;
  }

  return Object.keys(merged).length ? merged : null;
}

const mergeFeastOverWeekday = (weekdayData, feastData) => {
  const merged = { ...(weekdayData || {}) };
  for (const [field, value] of Object.entries(feastData || {})) {
    if (hasValue(value)) merged[field] = value;
  }
  merged.reflection = hasValue(feastData?.reflection) ? feastData.reflection : null;
  merged.extra_readings = Array.isArray(feastData?.extra_readings) && feastData.extra_readings.length
    ? feastData.extra_readings
    : null;
  return merged;
};

export function resolveLiturgyContentForDate(date, rows) {
  const info = getLiturgyInfo(date);
  const cycles = getLiturgicalCycles(getLiturgicalYear(date));
  const monthPadded = String(date.getMonth() + 1).padStart(2, '0');
  const dayPadded = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const getForKey = (key, preferredCycle = null) => mergeLiturgyRowsForKey(rows, key, cycles, preferredCycle);

  const feastData = getForKey(info.key)
    || getForKey(`feast_${monthPadded}_${dayPadded}`)
    || getForKey(`fixed_${monthPadded}_${dayPadded}`)
    || getForKey(`feast_${month}_${day}`)
    || getForKey(`fixed_${month}_${day}`);
  const weekdayData = info.seasonKey ? getForKey(info.seasonKey) : null;

  let content;
  if (info.key === 'feast_tat_nien' || info.key === 'feast_giao_thua') {
    content = info.isSunday
      ? weekdayData
      : getForKey('feast_tat_nien') || getForKey('feast_giao_thua') || weekdayData;
  } else if (['feast_tet_1', 'feast_tet_2', 'feast_tet_3'].includes(info.key) && feastData) {
    content = feastData;
  } else {
    const isMemorial = info.feastType === 'memorial_obligatory' || info.feastType === 'memorial_optional';
    const hasFeastReadings = hasValue(feastData?.r1_ref) || hasValue(feastData?.gospel_ref) || hasValue(feastData?.gospel_content);
    const hasWeekdayReadings = hasValue(weekdayData?.r1_ref) || hasValue(weekdayData?.gospel_ref);

    if (isMemorial && hasFeastReadings && hasWeekdayReadings) content = weekdayData;
    else if (feastData) content = mergeFeastOverWeekday(weekdayData, feastData);
    else content = weekdayData;
  }

  return { content: content || null, info, cycles };
}

export function hasCompletePrimaryLiturgyContent(content) {
  return Boolean(
    hasValue(content?.r1_ref)
    && hasValue(content?.r1_content)
    && hasValue(content?.psalm_content)
    && hasValue(content?.gospel_ref)
    && hasValue(content?.gospel_content)
  );
}
