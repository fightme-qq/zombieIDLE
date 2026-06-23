# Pre-Submission Checklist

Before packaging:

- `npm run build` passes.
- `npm run validate:yandex` passes.
- No external CDN links.
- SDK path `/sdk.js` is present.
- `LoadingAPI.ready()` is reachable in all startup paths.
- `GameplayAPI.start/stop` are used.
- `game_api_pause/resume` handlers exist.
- No production `console` or `debugger`.
- No browser scrollbars.
- Context menu and text selection disabled.
- All visible text localized.
- Save/progress works after refresh if game has progression.
- Archive uncompressed size is within Yandex limits.
- ZIP contains `index.html` at root.
