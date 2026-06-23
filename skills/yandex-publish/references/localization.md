# Localization

Yandex requirements:

- Minimum English and Russian if those languages are selected.
- All visible text must be localized.
- Use `ysdk.environment.i18n.lang` for language detection.
- Read `i18n.lang` from the SDK object after `YaGames.init()`.
- Do not rely only on `navigator.language`.

Common missed text:

- HUD labels.
- Buttons.
- Tooltips.
- Floating combat text.
- Error messages.
- Upgrade names.
- Rewarded ad buttons.
- Promo/screenshot text.

Keep the game name consistent across game UI and draft materials.
