import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Mobile Safe Area Insets & Dynamic Viewport Modals Tests', () => {
  const rootDir = process.cwd();

  it('verifies LiturgyPage search modal integrates safe-area-inset-top, safe-area-inset-bottom, and 100dvh', () => {
    const liturgyPagePath = path.join(rootDir, 'src', 'pages', 'LiturgyPage.jsx');
    assert.ok(fs.existsSync(liturgyPagePath), 'LiturgyPage.jsx must exist');
    const content = fs.readFileSync(liturgyPagePath, 'utf-8');

    // 1. Search modal header must contain safe-area-inset-top padding
    assert.match(
      content,
      /paddingTop:\s*['"`]calc\(0\.75rem\s*\+\s*env\(safe-area-inset-top/i,
      'LiturgyPage search header must have paddingTop with calc(0.75rem + env(safe-area-inset-top, ...))'
    );

    // 2. Search modal body/results area must contain safe-area-inset-bottom padding
    assert.match(
      content,
      /paddingBottom:\s*['"`]calc\(1\.5rem\s*\+\s*env\(safe-area-inset-bottom/i,
      'LiturgyPage search body must have paddingBottom with calc(1.5rem + env(safe-area-inset-bottom, ...))'
    );

    // 3. Modal container must use 100dvh for mobile height to prevent virtual keyboard jitter
    assert.ok(
      content.includes('h-[100dvh]'),
      'LiturgyPage search modal must use dynamic viewport h-[100dvh] for mobile screens'
    );
  });

  it('verifies BibleSearchModal container includes safe-area-inset-top and safe-area-inset-bottom', () => {
    const bibleSearchModalPath = path.join(rootDir, 'src', 'components', 'reader', 'BibleSearchModal.jsx');
    assert.ok(fs.existsSync(bibleSearchModalPath), 'BibleSearchModal.jsx must exist');
    const content = fs.readFileSync(bibleSearchModalPath, 'utf-8');

    // 1. Modal root container must have paddingTop with safe-area-inset-top
    assert.match(
      content,
      /paddingTop:\s*['"`]calc\(1rem\s*\+\s*env\(safe-area-inset-top/i,
      'BibleSearchModal container must include paddingTop with calc(1rem + env(safe-area-inset-top, ...))'
    );

    // 2. Modal root container must have paddingBottom with safe-area-inset-bottom
    assert.match(
      content,
      /paddingBottom:\s*['"`]calc\(1rem\s*\+\s*env\(safe-area-inset-bottom/i,
      'BibleSearchModal container must include paddingBottom with calc(1rem + env(safe-area-inset-bottom, ...))'
    );
  });

  it('verifies BiblePage GoTo modal has safe positioning with safe-area-inset-top', () => {
    const biblePagePath = path.join(rootDir, 'src', 'pages', 'BiblePage.jsx');
    assert.ok(fs.existsSync(biblePagePath), 'BiblePage.jsx must exist');
    const content = fs.readFileSync(biblePagePath, 'utf-8');

    // GoTo modal must use safe top offset avoiding notch and Dynamic Island
    assert.match(
      content,
      /top:\s*['"`]calc\(4\.5rem\s*\+\s*env\(safe-area-inset-top/i,
      'BiblePage GoTo modal must set top with calc(4.5rem + env(safe-area-inset-top, ...))'
    );
  });

  it('verifies all modal safe-area calculations provide a 0px fallback for desktop compatibility', () => {
    const filesToCheck = [
      path.join(rootDir, 'src', 'pages', 'LiturgyPage.jsx'),
      path.join(rootDir, 'src', 'components', 'reader', 'BibleSearchModal.jsx'),
      path.join(rootDir, 'src', 'pages', 'BiblePage.jsx')
    ];

    for (const filePath of filesToCheck) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const safeAreaMatches = content.match(/env\(safe-area-inset-(?:top|bottom)[^)]*\)/g) || [];
      assert.ok(safeAreaMatches.length > 0, `File ${path.basename(filePath)} should contain safe-area definitions`);

      for (const match of safeAreaMatches) {
        assert.ok(
          match.includes('0px') || match.includes('0'),
          `Safe-area call "${match}" in ${path.basename(filePath)} must specify a fallback (e.g., 0px)`
        );
      }
    }
  });
});
