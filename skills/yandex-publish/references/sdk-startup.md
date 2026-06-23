# SDK Startup

Required:

- Load SDK synchronously in `index.html` with `<script src="/sdk.js"></script>`.
- Initialize with `YaGames.init()`.
- Store the SDK object on `window.ysdk`.
- Use a fallback path for local dev or SDK init failure.
- Do not block the game forever if SDK is unavailable.

Phaser startup pattern:

1. Start Phaser immediately.
2. Track `__sdkDone`.
3. Track `__bootDone`.
4. Call `LoadingAPI.ready()` only when both are true.

The generated file `src/game/platform/yandexGames.ts` contains the starter version of this bridge.
