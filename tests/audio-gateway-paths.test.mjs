import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAudioRef, resolveAudioPath, resolveLiturgyHlsPrefix } from '../workers/audio-gateway/src/audioPath.js';

test('Audio gateway path resolution', async (t) => {
  await t.test('uses the same stable ref slug as the client', () => {
    assert.equal(normalizeAudioRef('1 Cr 1,11-12'), '1_Cr_1v11_to_12');
    assert.equal(normalizeAudioRef('1 Cr 11,1-12'), '1_Cr_11v1_to_12');
  });

  await t.test('resolves liturgy, music, and Bible paths without accepting arbitrary paths', () => {
    assert.equal(resolveAudioPath({ kind: 'reading', ref: 'Is 22,19-23', section: 'r1' }), 'readings/Is_22v19_to_23.mp3');
    assert.equal(resolveAudioPath({ kind: 'gospel', ref: 'Lc 1,26-38', section: 'gospel' }), 'gospels/Lc_1v26_to_38.mp3');
    assert.equal(resolveAudioPath({ kind: 'reading-intro', section: 'r2' }), 'readings/r2.mp3');
    assert.equal(resolveAudioPath({ kind: 'music', music: 'intro' }), 'music/liturgy_intro_v5.mp3');
    assert.equal(resolveAudioPath({ kind: 'bible', bookId: 'john', chapter: 3 }), 'bible/john_3.mp3');
    assert.equal(resolveAudioPath({ kind: 'bible', bookId: '../private', chapter: 3 }), null);
  });

  await t.test('limits HLS playback to a date and a safe variant directory', () => {
    assert.equal(resolveLiturgyHlsPrefix({ date: '2026-08-28', variant: 'weekday' }), 'hls/liturgy/2026-08-28/weekday');
    assert.equal(resolveLiturgyHlsPrefix({ date: '2026/08/28', variant: 'weekday' }), null);
    assert.equal(resolveLiturgyHlsPrefix({ date: '2026-08-28', variant: '../all-audio' }), null);
  });
});
