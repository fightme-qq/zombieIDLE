---
name: yandex-publish
description: Prepare and validate a Phaser HTML5 game for Yandex Games publishing. Use when integrating the Yandex Games SDK, fixing moderation issues, adding ads/localization, validating requirements, creating promo materials, or building a Yandex submission ZIP.
---

# Yandex Games Publish

## Workflow

1. Read `docs/yandex-games.md`.
2. Read `references/sdk-startup.md` before touching SDK initialization.
3. Read `references/loading-gameplay-api.md` before changing loading, scene boot, pause/resume, or gameplay state.
4. Read `references/no-cdn-production.md` before adding fonts/scripts/assets.
5. Read `references/ads.md` before adding interstitial, rewarded, or banner ads.
6. Read `references/localization.md` before adding visible text.
7. Read `references/layout-input-requirements.md` before changing canvas, CSS, input, or scaling.
8. Read `references/promo-materials.md` before preparing store media.
9. Read `references/pre-submission-checklist.md` before packaging.
10. Read `references/windows-zip.md` before creating ZIP on Windows.
11. Before upload, run:

```bash
npm run validate:yandex
npm run build:yandex
```

## Moderation Rules To Remember

- No browser scrollbars or swipe-to-refresh.
- No text selection, context menu, or long-tap selection during play.
- No `console` or `debugger` in production bundle.
- All SDK promises should have `.catch()` handlers.
- All visible text should be localized for selected languages.
- Rewarded ad buttons must clearly say the user watches an ad and what reward is given.
- On Windows, create ZIP with Python, not PowerShell, so ZIP entries use forward slashes.

## Files In This Project

- `src/game/platform/yandexGames.ts`: SDK init, pause/resume, LoadingAPI bridge.
- `docs/yandex-games.md`: release checklist.
- `scripts/make-yandex-zip.py`: upload ZIP creator.
- `scripts/validate-yandex-build.py`: starter validation checks.

