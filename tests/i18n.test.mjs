import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage, t, formatLocale, dictionaries } from '../src/ui/i18n.js';
import { languages, isSupportedLanguage } from '../src/ui/languages/registry.js';
import { shareCopy, shareTitle, isDemoShare } from '../src/ui/share-copy.js';
import { catalog } from '../src/core/runtime.mjs';
const real = {
  name: 'Still Grinding. I’m AFK.',
  earnedConditions: [{ metric: 'run.max_minutes', gte: 720 }],
  award: { source: 'live' },
};
test('eight offline locales have the same source keys and localized built-in achievement names', () => {
  assert.equal(Object.keys(languages).length, 8);
  const expected = Object.keys(dictionaries.ja).sort();
  for (const code of ['ja', 'ko', 'es', 'fr', 'de', 'pt']) {
    assert.deepEqual(Object.keys(dictionaries[code]).sort(), expected);
    assert.ok(Object.values(dictionaries[code]).every((s) => typeof s === 'string' && s.trim()));
    for (const badge of catalog())
      assert.ok(dictionaries[code][badge.name.replace(/ \d+$/, '')], `${code}: ${badge.name}`);
  }
  for (const code of Object.keys(languages)) {
    assert.ok(
      Object.entries(dictionaries[code]).every(([key, value]) => key.trim() && value.trim()),
    );
    setLanguage(code);
    assert.equal(formatLocale(), languages[code].locale);
    const caption = shareCopy([real], false, 'https://example.invalid');
    assert.ok(!caption.includes('[Demo]'));
    assert.ok(!caption.includes('.!'));
    assert.ok(!caption.includes('\\'));
    assert.equal(caption.split('\n').length, 4);
    assert.ok(shareCopy([{ ...real, demo: true }], false, 'link').startsWith(`[${t('Demo')}] `));
  }
  setLanguage('invalid');
  assert.equal(formatLocale(), 'en-US');
  assert.equal(isSupportedLanguage('constructor'), false);
});
test('translation normalizes HTML whitespace, respects word boundaries, and preserves unknown text', () => {
  setLanguage('de');
  assert.ok(t(' \n Copy image \n ').includes('Bild kopieren'));
  assert.equal(t('InputDevice'), 'InputDevice');
  assert.equal(t('CommunityCustomAchievement'), 'CommunityCustomAchievement');
  assert.ok(t('Token Voyager 01').includes('Token-Reisender'));
  setLanguage('en');
  assert.equal(t('Copy image'), 'Copy image');
});
test('every share entry point labels fictional sources while genuine records stay clean', () => {
  setLanguage('en');
  assert.equal(shareTitle([real], false), 'Achievement unlocked: Still Grinding. I’m AFK.');
  for (const award of [
    { ...real, demo: true },
    { ...real, source: 'demo' },
    { ...real, award: { source: 'demo' } },
  ]) {
    assert.ok(isDemoShare([award]));
    assert.ok(shareTitle([award]).startsWith('[Demo]'));
  }
  assert.ok(isDemoShare([real], true));
  assert.equal(isDemoShare([real]), false);
});
