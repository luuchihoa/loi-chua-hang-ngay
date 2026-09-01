import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferAudioDirectory,
  makeAdminAudioItem,
  validateAdminAudioFile,
} from '../src/utils/adminAudioFiles.js';
import { audioIndexKeyFromObject, validateAdminAudioKey } from '../workers/audio-gateway/src/adminAudio.js';

const audioFile = (name, size = 1024) => ({ name, size, webkitRelativePath: '' });

test('Admin audio upload validation', async (t) => {
  await t.test('infers directories from folders and unambiguous Bible filenames', () => {
    assert.equal(inferAudioDirectory(audioFile('Lc_1v26_to_38.mp3'), 'readings', 'batch/gospel/Lc_1v26_to_38.mp3'), 'gospels');
    assert.equal(inferAudioDirectory(audioFile('Rm_8v28_to_30.mp3'), 'gospels', 'readings/Rm_8v28_to_30.mp3'), 'readings');
    assert.equal(inferAudioDirectory(audioFile('mt_3.mp3'), 'readings'), 'bible');
    assert.equal(inferAudioDirectory(audioFile('r2.mp3'), 'gospels'), 'readings');
  });

  await t.test('rejects legacy and unsafe names before upload', () => {
    assert.match(validateAdminAudioFile(audioFile('gospel_Lc_1v26_to_38.mp3'), 'gospels'), /gospel_/);
    assert.ok(validateAdminAudioFile(audioFile('../Lc.mp3'), 'gospels'));
    assert.ok(validateAdminAudioFile(audioFile('john_chapter.mp3'), 'bible'));
    assert.equal(validateAdminAudioFile(audioFile('Đn_7v9_to_10v13_to_14.mp3'), 'readings'), '');
  });

  await t.test('creates canonical R2 keys and enforces the same rules in the Worker', () => {
    const item = makeAdminAudioItem({ file: audioFile('Mt_16v21_to_27.mp3'), relativePath: 'gospels/Mt_16v21_to_27.mp3' }, 'readings', 1);
    assert.equal(item.key, 'gospels/Mt_16v21_to_27.mp3');
    assert.equal(validateAdminAudioKey(item.key), item.key);
    assert.equal(validateAdminAudioKey('readings/r1.mp3'), 'readings/r1.mp3');
    assert.equal(validateAdminAudioKey('gospels/r1.mp3'), null);
    assert.equal(validateAdminAudioKey('readings/../secret.mp3'), null);
    assert.equal(audioIndexKeyFromObject('bible/mt_3.mp3'), 'mt_3');
  });
});
