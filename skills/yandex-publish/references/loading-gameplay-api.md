# LoadingAPI And GameplayAPI

LoadingAPI:

- Call `ysdk.features.LoadingAPI?.ready()` when the game is loaded and ready.
- Must be called in success and fallback/error paths.
- Do not let Yandex loading overlay remain forever.

GameplayAPI:

- Call `GameplayAPI.start()` when active gameplay begins.
- Call `GameplayAPI.stop()` when gameplay pauses, ends, ads open, or blocking overlays appear.

Pause/resume:

- Subscribe to `game_api_pause`.
- Subscribe to `game_api_resume`.
- Actually pause/resume the Phaser loop.
- Mute/unmute audio if audio exists.

Verification:

- Use Yandex debug panel if available.
- Pause button must visibly freeze gameplay.
