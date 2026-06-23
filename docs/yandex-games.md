# Yandex Games Publishing Notes

This project was generated with the optional Yandex Games pack.

## Commands

```bash
npm run validate:yandex
npm run build:yandex
```

## Blocking Rules

- Load the SDK with `<script src="/sdk.js"></script>`.
- Vite may warn that `/sdk.js` cannot be bundled because it is not `type="module"`; this is expected for the Yandex synchronous SDK script.
- Call `LoadingAPI.ready()` only after SDK init and Phaser boot are both done.
- Call `GameplayAPI.start()` when gameplay starts and `GameplayAPI.stop()` when gameplay pauses or ends.
- Handle `game_api_pause` and `game_api_resume`.
- Do not use external CDN links or remote fonts.
- Strip `console` and `debugger` from production builds.
- Use Python to create the ZIP on Windows so archive paths use forward slashes.
- Keep all visible text localized before submission.
