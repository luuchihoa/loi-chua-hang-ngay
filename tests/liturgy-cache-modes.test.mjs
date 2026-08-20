import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node.js test environment
const mockStorage = new Map();
global.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (i) => Array.from(mockStorage.keys())[i] || null
};

// Import liturgyCache functions
import { getCachedLiturgy, setCachedLiturgy, getLiturgyDateKey, clearAllLiturgyCache } from '../src/utils/liturgyCache.js';

describe('Liturgy Cache Modes & Memorial Feasts Preservation', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('saves and restores full payload containing readingModes and activeReadingMode', () => {
    const dayMemorial = new Date(2026, 7, 27); // 27/08/2026 (St. Monica)
    
    const weekdayOption = {
      title: 'Ngày 27 tháng 08 - Thánh Mônica - Lễ Nhớ',
      r1_ref: '1 Tx 3,7-13',
      gospel_ref: 'Mt 24,42-51'
    };

    const feastOption = {
      title: 'Ngày 27 tháng 08 - Thánh Mônica - Lễ Nhớ',
      r1_ref: 'Hc 26,1-4.13-16',
      gospel_ref: 'Lc 7,11-17'
    };

    const memorialPayload = {
      content: weekdayOption,
      readingModes: {
        weekday: weekdayOption,
        feast: feastOption
      },
      activeReadingMode: 'weekday'
    };

    // 1. Lưu cache cho ngày có lễ nhớ
    setCachedLiturgy(dayMemorial, memorialPayload, 'page');

    // 2. Mô phỏng chuyển sang ngày thường (Day B)
    const dayRegular = new Date(2026, 7, 28);
    const regularPayload = {
      content: { title: 'Thứ Sáu Tuần XXI Thường Niên' },
      readingModes: { weekday: null, feast: null },
      activeReadingMode: 'weekday'
    };
    setCachedLiturgy(dayRegular, regularPayload, 'page');

    // 3. Khôi phục lại ngày thường
    const restoredRegular = getCachedLiturgy(dayRegular, 'page');
    assert.ok(restoredRegular, 'Phải có cache cho ngày thường');
    assert.equal(restoredRegular.content.title, 'Thứ Sáu Tuần XXI Thường Niên');
    assert.deepEqual(restoredRegular.readingModes, { weekday: null, feast: null });

    // 4. Khôi phục lại ngày Lễ Nhớ (Day A)
    const restoredMemorial = getCachedLiturgy(dayMemorial, 'page');
    assert.ok(restoredMemorial, 'Phải có cache cho ngày Lễ Nhớ');
    assert.equal(restoredMemorial.content.title, 'Ngày 27 tháng 08 - Thánh Mônica - Lễ Nhớ');
    assert.ok(restoredMemorial.readingModes.weekday, 'Phải giữ nguyên tab Lễ Thường');
    assert.ok(restoredMemorial.readingModes.feast, 'Phải giữ nguyên tab Lễ Nhớ');
    assert.equal(restoredMemorial.readingModes.feast.gospel_ref, 'Lc 7,11-17');
    assert.equal(restoredMemorial.activeReadingMode, 'weekday');
  });

  it('preserves switched tab when user selects feast mode', () => {
    const dayMemorial = new Date(2026, 7, 27);
    
    const weekdayOption = { r1_ref: '1 Tx 3,7-13', gospel_ref: 'Mt 24,42-51' };
    const feastOption = { r1_ref: 'Hc 26,1-4.13-16', gospel_ref: 'Lc 7,11-17' };

    // Người dùng bấm đổi sang tab Lễ Nhớ
    const switchedPayload = {
      content: feastOption,
      readingModes: {
        weekday: weekdayOption,
        feast: feastOption
      },
      activeReadingMode: 'feast'
    };

    setCachedLiturgy(dayMemorial, switchedPayload, 'page');

    const restored = getCachedLiturgy(dayMemorial, 'page');
    assert.equal(restored.activeReadingMode, 'feast');
    assert.equal(restored.content.gospel_ref, 'Lc 7,11-17');
    assert.ok(restored.readingModes.weekday, 'Vẫn còn tab Lễ Thường để chuyển lại');
    assert.ok(restored.readingModes.feast, 'Vẫn còn tab Lễ Nhớ');
  });

  it('clearAllLiturgyCache removes all liturgy cache entries', () => {
    const d1 = new Date(2026, 7, 20);
    const d2 = new Date(2026, 7, 21);
    setCachedLiturgy(d1, { content: 'test1' }, 'page');
    setCachedLiturgy(d2, { content: 'test2' }, 'page');

    assert.ok(getCachedLiturgy(d1, 'page'));
    assert.ok(getCachedLiturgy(d2, 'page'));

    clearAllLiturgyCache();

    assert.equal(getCachedLiturgy(d1, 'page'), null);
    assert.equal(getCachedLiturgy(d2, 'page'), null);
  });
});
