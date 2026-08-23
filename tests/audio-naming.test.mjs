import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAudioRef,
  getReadingAudioFilename,
  getGospelAudioFilename
} from '../src/utils/audioNaming.js';

describe('Audio filename convention', () => {
  it('normalizes database refs into one stable shared-reading filename', () => {
    assert.equal(normalizeAudioRef('  1 Cr 13,1 - 13  '), '1_Cr_13v1_to_13');
    assert.equal(getReadingAudioFilename('1 Cr 13,1 - 13'), '1_Cr_13v1_to_13.mp3');
    assert.equal(getReadingAudioFilename('1 Cr 13,1 - 13.'), '1_Cr_13v1_to_13.mp3');
  });

  it('keeps the gospel namespace separate and strips unsafe filename characters', () => {
    assert.equal(getGospelAudioFilename('Mt 5: 1/12'), 'Mt_5v112.mp3');
    assert.equal(normalizeAudioRef(''), '');
  });

  it('does not collide refs with different chapter and verse boundaries', () => {
    assert.equal(getReadingAudioFilename('1 Cr 1,11-12'), '1_Cr_1v11_to_12.mp3');
    assert.equal(getReadingAudioFilename('1 Cr 11,1-12'), '1_Cr_11v1_to_12.mp3');
  });
});
