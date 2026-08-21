import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node environment test
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

globalThis.localStorage = localStorageMock;

import { saveStudioDraft, getStudioDraft, deleteStudioDraft } from '../src/utils/indexedDbStorage.js';

describe('Auto-Save & Storage Persistence Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('saves and retrieves studio draft state successfully', async () => {
    const testProject = {
      ref: '1 V 3,5.7-12',
      intro: 'Bài trích sách Các Vua',
      content: 'Lạy Chúa, xin ban cho tôi tớ Chúa...',
      voice: 'trieu_duong',
      section: 'r1',
      paragraphPause: 0.8,
      sentencePause: 0.5
    };

    const saved = await saveStudioDraft('test_audio_project', testProject);
    assert.strictEqual(saved, true, 'Draft should be saved successfully');

    const loaded = await getStudioDraft('test_audio_project');
    assert.ok(loaded, 'Loaded draft should not be null');
    assert.deepStrictEqual(loaded.data, testProject, 'Loaded data must match original project state');
    assert.ok(typeof loaded.updatedAt === 'number', 'updatedAt must be a valid timestamp');
  });

  test('updates existing draft on subsequent save', async () => {
    await saveStudioDraft('test_audio_project', { title: 'Version 1' });
    let loaded = await getStudioDraft('test_audio_project');
    assert.strictEqual(loaded.data.title, 'Version 1');

    await saveStudioDraft('test_audio_project', { title: 'Version 2 (Modified)' });
    loaded = await getStudioDraft('test_audio_project');
    assert.strictEqual(loaded.data.title, 'Version 2 (Modified)');
  });

  test('deletes draft cleanly when requested', async () => {
    await saveStudioDraft('test_audio_project', { title: 'Temporary Draft' });
    const loadedBefore = await getStudioDraft('test_audio_project');
    assert.ok(loadedBefore !== null);

    const deleted = await deleteStudioDraft('test_audio_project');
    assert.strictEqual(deleted, true);

    const loadedAfter = await getStudioDraft('test_audio_project');
    assert.strictEqual(loadedAfter, null, 'Draft should be completely deleted');
  });
});
