# 1001 Swords — Архитектурный скилл (Phaser 3 + Vite + Capacitor)

Этот документ описывает архитектуру мобильной idle-clicker / continuous-fight игры «1001 Swords», построенной на Phaser 3 + Vite + Capacitor. Цель — дать разработчику возможность с нуля воссоздать тот же тип игры: непрерывный бой, где герой стоит в центре, орбитальные мечи бьют монстров, а игрок прокачивает экономику, шкалы, питомцев, экипировку и проходит локации. Архитектура заточена под то, что бой должен идти всегда — даже когда игрок открыл магазин, шахту, таверну или просто свернул приложение в фон (offline-progress).

Ключевая идея — слоистая архитектура сцен Phaser, где `BattleScene` живёт постоянно и никогда не останавливается, а поверх неё накладываются вкладки (`HeroScene`, `PetScene`, `ShopScene`, `TownScene`), под-сцены (`MineScene`, `TavernScene`, `WizardTowerScene`) и постоянные оверлеи (`HeaderScene`, `TabBarScene`, `TutorialOverlayScene`). Состояние всегда живёт в одном глобальном `GameStore` с событийной шиной, который персистится в `localStorage` с CRC-целостностью и дебаунсом. Баланс редактируется через CSV-файлы в `public/balance/`, которые при загрузке переопределяют дефолты в коде. Сборка использует git-SHA как cache-buster для ассетов, а Capacitor оборачивает Web-бандл в нативные APK/IPA.

Эта архитектура работает для idle-clickers потому, что: (1) фрейм-driven бой через `update()` синхронен с прокачкой и не зависит от таймеров; (2) сцена `BattleScene` остаётся `active` даже когда скрыта — это позволяет accumulate offline progress «бесплатно»; (3) центральный store + персистентность гарантируют, что состояние не теряется при сворачивании; (4) `BackgroundLifecycle` корректно паузит и возобновляет цикл, не сажая батарею; (5) CSV-баланс позволяет тюнинг без перекомпиляции.

## Стек и базовые решения

- **Engine**: Phaser 3.87
- **Bundler**: Vite 6
- **Mobile shell**: Capacitor 6 (Android + iOS)
- **TypeScript**: strict mode
- **Phaser plugins**: `phaser3-rex-plugins` для дополнительных UI-возможностей
- **Audio/Haptics**: кастомные `AudioManager` (Web Audio API) + `HapticManager` (Capacitor Haptics)
- **Состояние**: один in-memory `GameStore` + `localStorage` с CRC и дебаунсом
- **Баланс**: CSV-файлы в `public/balance/` переопределяют дефолты в `shared/gameConfigs.ts` и `src/store/balanceConstants.ts`
- **IAP / Ads**: Capacitor BillingPlugin (Android) + LevelPlay Swift Plugin (iOS)
- **Cache-busting**: глобальный `__ASSET_V__` (git SHA + dirty + epoch), приклеиваемый к URL ассетов как `?v=...`
- **Ассеты**: индивидуальные PNG (без атласов), отдельные spritesheet'ы для героя, монстров, боссов, эффектов
- **Кросс-границы**: `@shared/*` path alias → `../shared/*` (один источник правды для конфигов клиента и сервера)

## Структура папок

```
phaser-client/
├── src/
│   ├── main.ts                  # Phaser game config, регистрация сцен, BackgroundLifecycle
│   ├── scenes/                  # Все сцены Phaser
│   │   ├── BootScene.ts         # Preload ассетов, регистрация анимаций, запуск всех overlay-сцен
│   │   ├── BattleScene.ts       # Постоянная боевая сцена с режимами (battle/raid/boss/...)
│   │   ├── HeaderScene.ts       # Тонкий overlay с GameHeader (всегда поверх всего)
│   │   ├── TabBarScene.ts       # Нижняя навигация (sleep/wake вкладок)
│   │   ├── TutorialOverlayScene.ts  # Постоянный overlay с туториалом / стрелками
│   │   ├── HeroScene.ts         # Вкладка экипировки/прокачки героя
│   │   ├── PetScene.ts          # Вкладка питомцев
│   │   ├── MuseScene.ts         # Вкладка муз
│   │   ├── ShopScene.ts         # Магазин
│   │   ├── TownScene.ts         # Городская вкладка, родитель Mine/Tavern/...
│   │   ├── MineScene.ts         # Под-сцена шахты
│   │   ├── TavernScene.ts       # Под-сцена таверны
│   │   ├── WizardTowerScene.ts  # Под-сцена башни мага
│   │   ├── MarketScene.ts       # Под-сцена рынка
│   │   ├── RaidScene.ts         # Рейды
│   │   └── StarterPackScene.ts  # Модалка стартер-пака
│   ├── entities/                # Игровые сущности с update()
│   │   ├── Hero.ts              # Герой (8-направленная ходьба, 6-кадровая анимация)
│   │   ├── Sword.ts             # Орбитальный меч (физика орбиты, flashOnHit)
│   │   └── Monster.ts           # Монстр (spritesheet idle, takeDamage, die)
│   ├── ui/                      # UI-компоненты
│   │   ├── Button3D.ts          # Канонический zone-over-graphics-паттерн
│   │   ├── GameHeader.ts        # Верхний HUD (ресурсы, XP, stage)
│   │   ├── TabBar.ts            # Нижняя навигация
│   │   ├── FloatingButtons.ts   # Плавающие кнопки действий
│   │   ├── BoostsPopup.ts       # Модалки бустов
│   │   ├── DropsPopup.ts        # Модалка наград
│   │   ├── SlotUpgradePopup.ts  # Модалка апгрейда слотов
│   │   ├── AdModal.ts           # Модалка рекламы
│   │   ├── DamagePopup.ts       # Пул всплывающих чисел
│   │   ├── CoinAnimation.ts     # Анимация монет
│   │   ├── SummonRevealAnimation.ts  # Открытие сундука
│   │   ├── ExplosionEffect.ts   # Эффект взрыва
│   │   ├── HealthBar.ts         # HP-бар над монстром
│   │   ├── CloseButton.ts       # Универсальная кнопка ×
│   │   └── ServerBossLeaderboard.ts  # Лидерборд серверного босса
│   ├── store/                   # Состояние и баланс
│   │   ├── GameStore.ts         # Центральный store + персистентность
│   │   └── balanceConstants.ts  # Дефолты для рарити, наборов, апгрейдов
│   ├── balance/
│   │   └── loader.ts            # CSV-парсер и applier
│   ├── data/                    # Чисто-данные модули
│   │   ├── locations.ts         # Каталог локаций и спрайтов
│   │   ├── achievements.ts      # 15 ачивок × 10 уровней
│   │   └── guidedQuestsService.ts  # Загрузчик quests JSON
│   ├── lifecycle/
│   │   └── BackgroundLifecycle.ts  # Единая точка для visibilitychange/pagehide/Capacitor App
│   ├── tutorial/
│   │   └── modalLifecycle.ts    # Биндинг модалок к GameStore.modals
│   ├── services/
│   │   └── IAPService.ts        # Мост к Capacitor BillingPlugin
│   └── constants/
│       └── theme.ts             # GameColors, FontFamily, FontSize, Spacing
├── public/
│   ├── balance/                 # CSV-файлы баланса
│   │   ├── pets.csv
│   │   ├── pets_evolutions.csv
│   │   ├── boosts.csv
│   │   ├── milestones.csv
│   │   ├── scalars.csv
│   │   └── README.txt
│   ├── client-assets/           # Скопировано из ../client/assets (build-time)
│   ├── sword-assets/            # 141+ PNG мечей
│   ├── locations/               # 4 локации × 14 spritesheet'ов
│   ├── attached_assets/         # Питомцы, скины, эффекты
│   ├── skin-assets/             # Портреты скинов по тирам
│   ├── raid-art/                # Арт рейдовых баннеров
│   └── fonts/                   # Шрифты
├── scripts/
│   ├── copy-assets.mjs          # Build-time зеркало ассетов из ../client/assets
│   └── dump-balance-to-csv.ts   # Регенератор CSV из кода
├── shared/                      # Через @shared/* alias
│   ├── gameConfigs.ts           # DEFAULT_PETS, DEFAULT_BOOSTS и тип-контракты
│   ├── skinConfigs.ts
│   ├── swordOrder.ts            # SWORD_LEVEL_TO_PATH
│   ├── balance.ts
│   ├── configs.ts
│   └── digEventConfig.ts
├── ios-templates/               # Шаблоны для нативной интеграции iOS
│   ├── LevelPlayAdsPlugin.swift
│   ├── LevelPlayAdsPlugin.m
│   ├── Info.plist.additions.xml
│   ├── podfile-additions.rb
│   └── SETUP.md
├── ios/                         # Capacitor iOS-проект
├── android/                     # Capacitor Android-проект
├── vite.config.ts               # Cache-busting, dev-middleware, esbuild drop
├── tsconfig.json                # @shared/* alias, strict
├── capacitor.config.ts          # appId, webDir
├── package.json                 # Скрипты dev/build/android/ios
└── index.html                   # Splash, версия, safe-area
```

## Пилоны архитектуры

### 1. Сцены и lifecycle

**Зачем:** обеспечить, чтобы боевая сцена жила постоянно (для непрерывного фарма), вкладки переключались мгновенно (через sleep/wake), а под-сцены и модалки корректно очищали ресурсы и не плодили утечек.

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/src/main.ts` — конфиг игры, регистрация сцен (BootScene → BattleScene → overlays → вкладки), интеграция с BackgroundLifecycle.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts` — однократный preload, регистрация анимаций, launch остальных сцен.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts` — постоянная боевая сцена с режимами (battle/raid/boss/server_boss/daily_boss), контракт очистки listeners, lifetime AudioManager.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/HeaderScene.ts` — минимальный overlay, который создаёт постоянный `GameHeader`.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/TabBar.ts` — переключение вкладок, lifecycle под-сцен.
- `/home/agent/Pixel-Dungeon/phaser-client/src/lifecycle/BackgroundLifecycle.ts` — единая точка для visibilitychange/pagehide/Capacitor App.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/TownScene.ts` — пример вкладки, поверх которой запускаются под-сцены (Mine/Tavern/...).
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/TutorialOverlayScene.ts` — постоянный overlay, автоматически выбирающий подсказки.
- `/home/agent/Pixel-Dungeon/phaser-client/src/tutorial/modalLifecycle.ts` — хелперы для регистрации модалок в стеке туториала.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/BoostsPopup.ts` — пример контейнера с таймером и cleanup в DESTROY.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/SlotUpgradePopup.ts` — пример модального контейнера с биндингом в modalLifecycle.

**Паттерны:**

#### Паттерн: Persistent Overlay Pattern

- **Почему:** `HeaderScene` и `TabBarScene` должны жить всё время поверх любых вкладок. Они держат свои камеры с HiDPI-скейлом и слушают глобальные события (`stageChanged`, `currencyChanged`, `tutorialChanged`).
- **Как работает:** в `BootScene.create()` после загрузки баланса запускаются `TabBarScene`, `HeaderScene`, `BattleScene`, `TutorialOverlayScene`. Затем `bringToTop()` гарантирует, что overlay-сцены остаются сверху. Они никогда не stop — переключаются только вкладки под ними.

```typescript
// In BootScene.create() after balance loads:
launchSafe("TabBarScene");
launchSafe("HeaderScene");
launchSafe("BattleScene");
launchSafe("TutorialOverlayScene");
this.scene.bringToTop("HeaderScene");
this.scene.bringToTop("TabBarScene");
this.scene.bringToTop("TutorialOverlayScene");

// HeaderScene is minimal:
class HeaderScene extends Phaser.Scene {
  create(): void {
    setupHiDPICamera(this);
    new GameHeader(this);  // Creates persistent header UI
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/main.ts`

#### Паттерн: Always-Running Fight Scene with Mode Switching

- **Почему:** `BattleScene` обязана жить, пока игрок ходит по вкладкам (Hero/Pet/Muse) и под-сценам (Mine/Tavern). Перезагрузка её при каждом тапе уничтожит монстров, мечи, героя.
- **Как работает:** `BattleScene` стартует один раз в `BootScene.create()` и работает всегда. На `wake` колбек `onSceneWake` смотрит на `GameStore.activeRaid`, `stageBossFight`, `serverBoss`, `dailyBoss` и вызывает `startRaidMode()` / `startBossMode()` / `startBattleMode()`. Каждый режим уничтожает старый UI и спавнит свежих монстров/мечи/героя.

```typescript
// In BattleScene.create():
this.events.on("wake", this.onSceneWake, this);
this.events.on("shutdown", this.cleanupRaidListeners, this);
this.setupStoreListeners();
this.determineInitialMode();  // Check state.activeRaid / stageBossFight

private onSceneWake = (): void => {
  const state = GameStore.getState();
  if (state.activeRaid) {
    this.startRaidMode();
  } else if (state.stageBossFight?.active) {
    this.startBossMode();
  } else {
    this.startBattleMode();
  }
};

private cleanupRaidListeners = (): void => {
  this.events.off("wake", this.onSceneWake, this);
  if (this.audio) this.audio.destroy();
};
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts`

#### Паттерн: Tab & Sub-Scene Launch/Wake Pattern

- **Почему:** переключение между вкладками (HeroScene ↔ TownScene) и открытие под-сцен (MineScene поверх TownScene) требуют разных стратегий. Вкладки должны спать (сохранять состояние), под-сцены — launch'иться поверх родителя.
- **Как работает:** `TabBarScene.switchTab()` зовёт `sleep()` для старой вкладки и `wake()` для новой. Если под-сцена уже спит — `wake`, иначе `launch`. Ключ — проверки `isSleeping`/`isActive`, иначе случится double-launch. `bringToTop()` гарантирует, что `HeaderScene` и `TabBarScene` остаются сверху.

```typescript
// In TabBarScene.switchTab():
private switchTab(targetTab: string): void {
  const sm = this.scene;
  if (this.activeTab === targetTab) return;
  if (this.sceneExists(this.activeTab) && sm.isActive(this.activeTab)) {
    sm.sleep(this.activeTab);
  }
  this.activeTab = targetTab;
  if (sm.isSleeping(targetTab)) {
    sm.wake(targetTab);
  } else {
    sm.run(targetTab);
  }
  sm.bringToTop(targetTab);
  sm.bringToTop("HeaderScene");
  sm.bringToTop("TabBarScene");
}

// In TownScene.onBuildingTap():
if (this.scene.isSleeping("MineScene")) {
  this.scene.wake("MineScene");
} else if (!this.scene.isActive("MineScene")) {
  this.scene.launch("MineScene");
}
this.scene.bringToTop("MineScene");
this.scene.bringToTop("HeaderScene");
this.scene.bringToTop("TabBarScene");
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/TabBar.ts`

#### Паттерн: Scene Shutdown Listener Cleanup Contract

- **Почему:** при `stop()` сцена эмитит `SHUTDOWN`, при `sleep()` — `SLEEP`. Если listeners не убрать — они продолжают палить, дёргать методы у уничтоженных сущностей, плодить утечки. `AudioContext` и таймеры тоже надо явно destroy.
- **Как работает:** в `create()` биндим listener через `GameStore.on()`, отслеживая их в массиве. На `SHUTDOWN` проходим по массиву и зовём `GameStore.off()`. Для owned-объектов (`AudioManager`, таймеры) — их `destroy()`.

```typescript
// In TownScene.create():
private setupListeners(): void {
  const onCurrency = () => this.updateResources();
  GameStore.on("currencyChanged", onCurrency);
  this.boundListeners.push({ event: "currencyChanged", fn: onCurrency });
}

private cleanup(): void {
  for (const { event, fn } of this.boundListeners) {
    GameStore.off(event, fn);
  }
  this.boundListeners = [];
  this.scrollIndicator?.destroy();
}

create(): void {
  this.setupListeners();
  this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
}

// In BattleScene:
private setupStoreListeners(): void {
  GameStore.on("monstersChanged", (monsters) => { /* ... */ });
  GameStore.on("swordsChanged", () => { /* ... */ });
}

private cleanupRaidListeners = (): void => {
  this.events.off("wake", this.onSceneWake, this);
  if (this.audio) {
    this.audio.destroy();
    this.audio = null;
  }
};
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts`

#### Паттерн: Floating Popup Container Pattern

- **Почему:** модалки (BoostsPopup, SlotUpgradePopup, AdModal) — это full-screen overlays со стеком (стрелки туториала должны прятаться, пока модалка открыта) и безопасным cleanup (listeners/tweens/timers).
- **Как работает:** Popup — `Phaser.GameObjects.Container` с высоким depth. Вызывает `bindContainerModalLifecycle()` для регистрации в стеке туториала. В конструкторе вешает DESTROY listener для убирания store listeners и таймеров. Использует `zone(0,0,GAME_WIDTH,GAME_HEIGHT)` с затемнением для перехвата кликов.

```typescript
export class BoostsPopup extends Phaser.GameObjects.Container {
  private tickEvent: Phaser.Time.TimerEvent;
  private storeListener: () => void;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(150);

    const dimZone = scene.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT)
      .setOrigin(0).setInteractive();
    dimZone.on("pointerdown", () => this.close());
    this.add(dimZone);

    // Tick for live countdown updates
    this.tickEvent = scene.time.addEvent({
      delay: 1000, loop: true,
      callback: () => this.refresh(), callbackScope: this,
    });

    this.storeListener = () => this.refresh();
    GameStore.on("currencyChanged", this.storeListener);

    // Cleanup on destroy
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.tickEvent.remove(false);
      GameStore.off("currencyChanged", this.storeListener);
    });
  }

  private close(): void {
    this.destroy();
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/BoostsPopup.ts`

#### Паттерн: Background Lifecycle Halting Game Loop

- **Почему:** когда приложение сворачивается (вкладка скрыта, экран заблокирован), tweens, таймеры и `scene.update()` продолжают палить, разряжая батарею и обрабатывая stale-state (мобы убиваются «пока пользователь спит», события идут не по порядку). Решение — полностью остановить game loop через `game.loop.sleep()`.
- **Как работает:** `BackgroundLifecycle` — singleton, слушающий `visibilitychange` (web), `pagehide`/`pageshow` (Safari) и Capacitor App events (native). На `hide` зовёт `game.loop.sleep()` — `requestAnimationFrame` прекращает запуски. На `show` зовёт `game.loop.wake()` со свежей delta, чтобы tweens не скакнули вперёд. Дебаунс гарантирует, что дубль-события не сломают логику.

```typescript
// In main.ts:
BackgroundLifecycle.install();

BackgroundLifecycle.onHidden(() => {
  try { game.loop.sleep(); } catch (e) { console.warn("sleep failed", e); }
});
BackgroundLifecycle.onShown(() => {
  try { game.loop.wake(); } catch (e) { console.warn("wake failed", e); }
});

// BackgroundLifecycle implementation:
class BackgroundLifecycleImpl {
  private hiddenListeners: Listener[] = [];
  private isHidden = false;

  install(): void {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.handleHidden();
      else this.handleShown();
    });
    window.addEventListener("pagehide", () => this.handleHidden());
    window.addEventListener("pageshow", () => this.handleShown());
    if (Capacitor.isNativePlatform()) {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) this.handleShown();
        else this.handleHidden();
      });
    }
  }

  private handleHidden(): void {
    if (this.isHidden) return;
    this.isHidden = true;
    for (const fn of this.hiddenListeners) fn();
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/lifecycle/BackgroundLifecycle.ts`

**Подводные камни:**

- Вызов `scene.start(key)` вместо `scene.launch(key)` или `scene.wake(key)`: триггерит SHUTDOWN на старой сцене и уничтожает все сущности (монстров, мечи, героя). → Используйте `launch` для новых overlay'ев и `wake` для спящих. `start()` — только для перехода BootScene → BattleScene.
- Забыли отписаться от listeners в SHUTDOWN: listener продолжает палить, вызывая методы на уничтоженных сущностях. → Трекаем listeners в массиве, в SHUTDOWN-хендлере проходим и зовём `GameStore.off()`.
- Не уничтожен `AudioManager` или таймер при shutdown: `AudioContext` копится в браузере (Chromium режет на 6), таймеры палят при HMR. → В SHUTDOWN явно зовём `destroy()` для owned объектов.
- Блокировка game loop при паузе: tweens и `update()` палят в фоне. → `game.loop.sleep()` в onHidden, `game.loop.wake()` в onShown.
- Добавили popup без `bindContainerModalLifecycle()`: стрелка туториала рисуется поверх модалки. → В конструкторе popup сразу вызываем `bindContainerModalLifecycle(this, 'PopupName')`.
- Тап на новую вкладку, пока открыта под-сцена: интерактивные zones старой под-сцены остаются и блокируют ввод. → В `TabBarScene.switchTab()` перед свитчем sleep'им все активные под-сцены из `SUB_SCENES_TO_CLOSE`.
- `scene.bringToTop()` каждый кадр: чрезмерный реордеринг депт-лейеров. → Зовём только однократно после launch/wake.

**Чеклист при переносе в новый проект:**

- [ ] Создать три постоянных overlay-сцены: `BootScene`, `HeaderScene`, `TabBarScene`, `TutorialOverlayScene`. Launch'нуть в правильном порядке и bringToTop overlays.
- [ ] `BattleScene` — постоянная, активна на всех вкладках. На `wake` ре-синк с `GameStore.activeRaid/stageBossFight` через `startRaidMode()` / `startBattleMode()`.
- [ ] Вкладки используют `launch/wake/sleep`, никогда `start/stop`. Сущности сохраняются.
- [ ] Под-сцены launch'атся поверх родительской вкладки, после всегда bringToTop HeaderScene/TabBarScene.
- [ ] В каждой сцене с listeners — SHUTDOWN handler, который зовёт `GameStore.off()` для каждого зарегистрированного listener.
- [ ] Уничтожать owned-объекты в SHUTDOWN: `audio.destroy()`, `timer.remove(false)`.
- [ ] Popup'ы регистрируются в modal stack через `bindContainerModalLifecycle(container, 'ModalId')`.
- [ ] К popup'ам прицеплен DESTROY listener для cleanup таймеров/tweens/store listeners.
- [ ] `BackgroundLifecycle.onHidden()` → `game.loop.sleep()`; `onShown()` → `game.loop.wake()`.
- [ ] Depth-лейеринг: BattleScene 0, сущности 1-2, FloatingButtons 40, popups 100-200, HeaderScene/TabBarScene на максимуме.

---

### 2. Непрерывный fight-loop

**Зачем:** реализовать idle-clicker сердце игры — постоянно крутящиеся вокруг героя орбитальные мечи, фрейм-driven коллизию с монстрами, моментальный фидбек (звук, попапы, монеты) и offline-progress, который накапливается, пока игрок ходит по другим вкладкам.

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts` — мастер-оркестратор боя: `update()` каждый кадр двигает мечи, чекает коллизии, наносит урон, рулит режимами (raid/boss/daily).
- `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Sword.ts` — физика орбиты: `updatePosition()` инкрементит `orbitAngle`, считает x/y, `flashOnHit()` для визуала.
- `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Monster.ts` — состояние и анимация врага: idle-цикл, `takeDamage()` обновляет HP-бар и мигает, `die()` запускает death-tween.
- `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Hero.ts` — игрок: walk-to-target, auto-stop, walk-анимации.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DamagePopup.ts` — пул всплывающих чисел: 24 max на kind, hand-timed easing.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/HealthBar.ts` — Graphics-based HP-бар над монстром.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/CoinAnimation.ts` — анимация монет от kill-сайта к gold-иконке в HUD.
- `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts` — `damageMonster()`, `spawnMonsters()`, `calculateRealSwordDamage()`.

**Паттерны:**

#### Паттерн: Frame-Driven Collision Loop with Enter-Latch Gate

- **Почему:** мечи постоянно орбитируют через монстров несколько раз в секунду. Без gate'а герой, припаркованный возле моба, будет наносить урон каждый кадр (~60 раз/сек). Enter-latch (проверка, что меч НЕ касался моба в прошлом кадре) гарантирует, что урон палит только на кадре, когда меч ВХОДИТ в хитбокс.
- **Как работает:** каждый кадр `update()` зовёт `checkSwordCollision()` для каждого экипированного меча. Лупим монстров, считаем дистанцию. Если в `hitDist` и `swordCollidingWith[index] !== monsterId` — чекаем cooldown (`lastHitAt`, 80мс), наносим урон, играем звук/хаптик, сохраняем `swordCollidingWith`. На следующем кадре, если меч всё ещё в хитбоксе того же моба — урон не палит. При выходе clearим latch; на следующем кругу (~2.5 сек) урон снова палит.

```typescript
// BattleScene.ts:2424-2464
private checkSwordCollision(sword: Sword, swordIndex: number): void {
  for (const [, monster] of this.monsters) {
    if (!monster.active) continue;
    const dx = sword.x - monster.x;
    const dy = sword.y - monster.y;
    const distSq = dx * dx + dy * dy;
    const hitDist = swordRadius + monster.getMonsterSize() / 2;
    if (distSq < hitDist * hitDist) {
      collidingMonsterId = monster.getId();
      if (this.swordCollidingWith[swordIndex] !== collidingMonsterId) {
        this.swordCollidingWith[swordIndex] = collidingMonsterId;
        const now = this.time.now;
        const last = this.lastHitAt.get(collidingMonsterId) ?? 0;
        if (now - last >= 80) {  // Per-monster cooldown
          this.lastHitAt.set(collidingMonsterId, now);
          let perSwordDamage = GameStore.calculateRealSwordDamage(swordIndex);
          const isCrit = Math.random() < GameStore.getCritChance();
          if (isCrit) perSwordDamage *= GameStore.getCritMultiplier();
          this.applyDamageToMonster(monster.getId(), perSwordDamage, false, isCrit);
          sword.flashOnHit();
          this.audio.playHitSound();
          HapticManager.light();
        }
      }
      return;  // Only one monster per sword per frame
    }
  }
  this.swordCollidingWith[swordIndex] = null;  // Exited, clear latch
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts`

#### Паттерн: Orbital Sword Position Update in Main Game Loop

- **Почему:** мечи должны плавно орбитировать героя, и их позиция напрямую кормит коллизию. Tweens здесь — оверкилл (8 одновременных tweens с overhead), а ещё они мешают мгновенно перестраивать мечи при покупке/апгрейде. Прямая математика — дёшево, детерминированно, идеально.
- **Как работает:** в `BattleScene.update()`, после апдейта героя, лупим мечи: `sword.updateCenter(hero.x, hero.y)` и `sword.updatePosition(delta)`. `updatePosition()` инкрементит `orbitAngle += orbitSpeed * delta`, оборачивает в 0..2π, считает x = centerX + cos(angle) * radius, y = centerY + sin(angle) * radius, и поворачивает спрайт.

```typescript
// BattleScene.ts:2255-2260
for (let i = 0; i < this.swords.length; i++) {
  const sword = this.swords[i];
  sword.updateCenter(this.hero.x, this.hero.y);
  sword.updatePosition(delta);  // delta = ms since last frame
}

// Sword.ts:86-93
updatePosition(delta: number): void {
  this.orbitAngle += this.orbitSpeed * delta;  // radians per ms
  if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;
  this.x = this.centerX + Math.cos(this.orbitAngle) * this.orbitRadius;
  this.y = this.centerY + Math.sin(this.orbitAngle) * this.orbitRadius;
  this.setRotation(this.orbitAngle + Math.PI / 2);
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Sword.ts`

#### Паттерн: Damage Calculation Pipeline

- **Почему:** визуальный фидбек (попапы, звук, хаптик) должен показывать ТОЧНОЕ значение урона. Иначе игрок не понимает, что прокачка реально работает. Одна чистая функция гарантирует консистентность между UI и механикой.
- **Как работает:** `GameStore.calculateRealSwordDamage(slotIndex)` берёт меч, его base DPS (от level/tier), добавляет per-slot star bonus, умножает на `damageMultiplier` (от навыков/предметов) и `bossDamageMultiplier`. Результат показывается в `WeaponSlots` UI и применяется в коллизии. На каждом хите независимо ролится crit (5% базовый, плюс бонусы).

```typescript
// GameStore.ts (conceptual)
calculateRealSwordDamage(slotIndex: number): number {
  const sword = this.state.swords[slotIndex];
  if (!sword) return 0;
  const slotStar = this.state.slotStars[slotIndex] || 0;
  let dmg = sword.dps + slotStar * STAR_BONUS;  // Base + stars
  dmg *= this.state.damageMultiplier;  // Boosts
  dmg *= this.state.bossDamageMultiplier;  // Boss modifiers
  return Math.floor(dmg);
}

// BattleScene.ts:2450-2454 (in checkSwordCollision)
let perSwordDamage = GameStore.calculateRealSwordDamage(swordIndex);
const isCrit = Math.random() < GameStore.getCritChance();
if (isCrit) perSwordDamage = Math.floor(perSwordDamage * GameStore.getCritMultiplier());
this.applyDamageToMonster(monster.getId(), perSwordDamage, false, isCrit);
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts`

#### Паттерн: Deferred Kill Cascade to Avoid Frame Stalls

- **Почему:** убийство моба триггерит ~5 операций: уничтожение HP-бара, death-tween, звук, попапы (XP/gold), монеты к HUD (3-6 спрайтов с tweens = 20+ GameObjects). Синхронный запуск стопорит главный поток на 80-150 мс на iOS Canvas2D, фризя орбиты мечей. Решение — отложить всю косметику на один кадр через `delayedCall(0, callback)`.
- **Как работает:** в `applyDamageToMonster()`, когда `damageMonster()` вернул `killed:true`, сразу зовём `monster.die()` (запуск death-tween) и `monsters.delete()` (вынос из коллизии). Затем захватываем координаты (`cx, cy`) и зовём `time.delayedCall(0, () => { audio + popups + coin animation + chest drop })`. Phaser кладёт колбек в очередь, и он выполнится после рендера текущего кадра.

```typescript
// BattleScene.ts:2120-2163
if (result.killed) {
  monster.die();  // Start death tween
  this.monsters.delete(monsterId);  // Out of collision loop immediately
  this.killsSinceLastChest++;
  const dropChest = this.killsSinceLastChest >= this.nextChestKillThreshold;
  if (dropChest) {
    this.killsSinceLastChest = 0;
    this.rollNextChestThreshold();
  }
  const cx = center.x, cy = center.y, xpEarned = result.xpEarned, goldEarned = result.goldEarned;
  // DEFERRED by one frame
  this.time.delayedCall(0, () => {
    this.audio.playDeathSound();
    HapticManager.medium();
    if (xpEarned > 0) new XpPopup(this, cx, cy - 10, xpEarned);
    if (goldEarned > 0) {
      new GoldPopup(this, cx, cy - 10, goldEarned);
      this.audio.playCoinSound();
      const goldPos = getGoldIconWorldPos();
      spawnCoinAnimation(this, cx, cy, goldPos.x, goldPos.y, 3 + Math.floor(Math.random() * 3));
    }
    if (dropChest) this.showChestDrop(cx, cy - 30);
  });
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts`

#### Паттерн: Zero-Copy Floating Number Pool Driven by POST_UPDATE

- **Почему:** на пике бой спавнит ~100 цифр урона в секунду (8 мечей × ~12 хитов). Аллокация 100 Text + Canvas в секунду крошит GC, вызывая ms-пузы каждые ~5 сек. Пул переиспользует Text, а единый POST_UPDATE-колбек анимирует все попапы через ручное easing без per-popup Tween.
- **Как работает:** `show()` достаёт inactive-запись из пула (или создаёт новую до MAX_PER_KIND = 24). Реактивирует Text, ставит позицию/scale/alpha, записывает startMs/duration. `POST_UPDATE` тикает каждый кадр: для активных записей считает `t = (now - startMs) / duration`, easeOut'ит, инкрементит позицию/alpha/scale. При t >= 1 — пометка inactive.

```typescript
// DamagePopup.ts:43-74 (POST_UPDATE callback)
const tick = (): void => {
  const all = POOLS.get(scene);
  if (!all) return;
  const now = scene.time.now;
  for (const pool of all.byKind.values()) {
    for (const e of pool) {
      if (!e.active) continue;
      const t = Math.min(1, (now - e.startMs) / e.duration);
      const k = easeOut(t);  // Power2 ease-out
      const x = e.fromX + (e.toX - e.fromX) * k;
      const y = e.fromY + (e.toY - e.fromY) * k;
      const sc = e.fromScale + (e.toScale - e.fromScale) * k;
      const txt = e.text;
      txt.setPosition(x, y);
      txt.setAlpha(1 - t);
      txt.setScale(sc);
      if (t >= 1) {
        e.active = false;
        txt.setVisible(false);
        txt.setActive(false);
      }
    }
  }
};
scene.events.on(Phaser.Scenes.Events.POST_UPDATE, tick);
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DamagePopup.ts`

#### Паттерн: Combat Loop Survives Scene Visibility by Staying Active

- **Почему:** когда игрок открывает магазин или переключает вкладку, `BattleScene` скрывается (`setVisible(false)`), но остаётся ACTIVE — мечи продолжают крутиться, монстры фармятся, золото копится. Это сердце «offline progress», который ощущается как магия.
- **Как работает:** `BattleScene.update()` работает каждый кадр независимо от visibility. Sword position/коллизия/урон выполняется безусловно, потому что урон эмитит `goldChanged`, который обновит хедер на любой вкладке. Только определённые ветки (фаз-переходы, модалки) чекают visibility. Phase-transitions ждут wake-from-sleep.

```typescript
// BattleScene.ts:2236-2250
update(time: number, delta: number): void {
  GameStore.tickAutoActions();  // Always run, even while hidden
  // NOTE: when the user is on another tab, TabBar hides BattleScene via
  // setVisible(false) but keeps it active so the full update() keeps running.
  // We need every part of this loop in the background — sword orbit positions
  // feed collision detection, collision deals damage, damage emits goldChanged
  // which updates the header. If you ever want to suppress the per-frame work
  // when hidden, keep at minimum: sword position + collision + monster updates.

  this.hero.update(time, delta);  // Always
  for (let i = 0; i < this.swords.length; i++) {
    const sword = this.swords[i];
    sword.updateCenter(this.hero.x, this.hero.y);  // Always
    sword.updatePosition(delta);  // Always
  }
  // ... collision and damage checks always run ...
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts`

**Подводные камни:**

- Tweens для орбит мечей: 8 одновременных Tween с overhead, нельзя мгновенно перестраивать мечи при покупке. → Ручная математика в `updatePosition(delta)`.
- Без enter-latch: герой возле моба = 60 хитов/сек × 8 мечей = ломает баланс. → `swordCollidingWith` per меч + per-monster cooldown 80мс.
- Per-frame аллокация Text + Tween: GC пауза каждые 5 сек на 30-50мс, замораживая бой. → Пул (24 на kind) + единый POST_UPDATE-tick.
- Все kill-косметики синхронно: 80-150мс stall на кадре kill'а. → `delayedCall(0, callback)` для всего, кроме мутации стейта.
- Pause при hidden: offline progress ломается. → `update()` всегда работает, фильтр только по фазе, не visibility.
- Hardcoded checks visibility в `applyDamageToMonster`: страдает реюз. → Mode FSM наверху `update()`, все ветки converge на одинаковый damage path.
- Sword position обновляется после коллизии: out-of-sync геометрия. → Строгий порядок: hero, sword position, monster animations, collision.
- Inconsistent damage scaling: UI показывает одно, реально применяется другое. → Чистая централизованная `calculateRealSwordDamage()`.

**Чеклист при переносе в новый проект:**

- [ ] `BattleScene.update()` работает 60 раз/сек, не зависит от visibility.
- [ ] Орбита мечей — ручная математика в `updatePosition(delta)`, никаких Tween.
- [ ] Enter-latch коллизия: `swordCollidingWith` + per-monster cooldown 80мс. Тест: герой возле моба = 1 хит за орбиту, не 60/сек.
- [ ] Чистая `calculateRealSwordDamage()` показывается в UI и применяется в коллизии.
- [ ] Killed мобы сразу удаляются из коллизии, косметика — через `delayedCall(0, ...)`.
- [ ] Пул всплывающих чисел: 24 max на kind, ручная анимация в POST_UPDATE.
- [ ] HP-бар — Graphics-based, обновляется в `monster.update()`, цвет зелёный → оранжевый → красный.
- [ ] Анимация монет — quadratic Bézier к gold-иконке HUD, precomputed coin texture (один раз на сцену).
- [ ] Mode FSM (boss/raid/server_boss/daily_boss/normal) — централизован наверху `update()`.
- [ ] Тест offline progress: переключить вкладку, проверить, что золото и stage продолжают рости.

---

### 3. Спрайты и ассеты

**Зачем:** оптимизировать загрузку 1000+ ассетов (мечи, монстры, локации, эффекты) под мобильный Web, обеспечить мгновенную итерацию артистов в dev (live-reload без cache hell) и стабильную работу анимаций монстров с per-instance jitter.

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts` — центральный preload dispatcher: spritesheets, single-frame images, bitmap fonts, watchdog для зависшего loader.
- `/home/agent/Pixel-Dungeon/phaser-client/scripts/copy-assets.mjs` — build-time зеркало ассетов, селективное копирование из `../client/assets` и `../attached_assets` в `public/`.
- `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts` — `getAssetVersion()` для `__ASSET_V__`, dev-middleware для перенаправления URL.
- `/home/agent/Pixel-Dungeon/phaser-client/src/data/locations.ts` — каталог 4 локаций × 14 spritesheet'ов с frameSize.
- `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Hero.ts` — manual frame advancement 6×8 directions.
- `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Monster.ts` — spritesheet animator с per-instance jitter.
- `/home/agent/Pixel-Dungeon/phaser-client/SPRITE_OPTIMIZATION.md` — пайплайн ImageMagick.
- `/home/agent/Pixel-Dungeon/shared/swordOrder.ts` — `SWORD_LEVEL_TO_PATH` (мапа 1..141).

**Паттерны:**

#### Паттерн: Cache-Busted Asset URLs with __ASSET_V__

- **Почему:** инвалидация кэша браузера/прокси на каждый коммит и rebuild без ручного бампа версий. Git SHA + epoch гарантируют уникальный токен.
- **Как работает:** `vite.config.ts` считает `__ASSET_V__` через execSync git rev-parse + dirty marker + epoch. Внедряет глобально через `define`. `BootScene.ts` подклеивает `?v=${__ASSET_V__}` к каждому URL. Dev-middleware ставит `Cache-Control: no-cache`.

```typescript
// vite.config.ts: compute version string
function getAssetVersion(): string {
  let sha = "nogit", dirty = "";
  try {
    sha = execSync("git rev-parse --short=7 HEAD", ...).toString().trim();
    const status = execSync("git status --porcelain", ...).toString().trim();
    if (status) dirty = "d";
  } catch { }
  return `${sha}${dirty}${Math.floor(Date.now() / 1000)}`;
}

// BootScene.ts: stamp on sprite/image URLs
private loadLocationAssets(): void {
  const V = `?v=${__ASSET_V__}`;
  for (const loc of LOCATIONS) {
    this.load.image(loc.bgKey, `/locations/${loc.folder}/bg.png${V}`);
    for (const def of loc.small) {
      this.load.spritesheet(textureKeyFor(def),
        `/locations/${loc.folder}/small/${def.file}.png${V}`,
        { frameWidth: def.frameSize, frameHeight: def.frameSize });
    }
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts`, `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts`

#### Паттерн: Texture-Key-Based Pixel-Art Filter

- **Почему:** селективно применять NEAREST (crisp) и LINEAR (smooth) по префиксу ключа, не ломая текстовый рендеринг на Android WebView (как делает глобальный `pixelArt:true`).
- **Как работает:** `BootScene.create()` итерирует все текстуры. Ключи с префиксами `loc_`, `boss_`, `sword_lvl_`, `raid_enemy_` → NEAREST. Остальное (фото, плавный раст) → LINEAR. Skip-list исключает `__DEFAULT`/`__MISSING`.

```typescript
private applyPixelArtFilter(): void {
  const skip = new Set(["__DEFAULT", "__MISSING", "__WHITE"]);
  const pixelArtPrefixes = [
    "loc_",          // location sprites
    "boss_",         // raid/daily bosses
    "sword_lvl_",    // pixel swords
    "raid_enemy_",   // raid spritesheets
    "fx_",           // attack effects
    "equip_",        // equipment sets
  ];
  this.textures.each((tex: Phaser.Textures.Texture) => {
    if (skip.has(tex.key)) return;
    const isPixelArt = pixelArtPrefixes.some(p => tex.key.startsWith(p));
    tex.setFilter(isPixelArt ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR);
  }, this);
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts:722-756`

#### Паттерн: Location Tier-Based Spritesheet System

- **Почему:** организация 56 spritesheet'ов (4 локации × 14) по роли (small/middle/boss) со стандартизированными frame size (64 px и 128 px). Детерминированный выбор через cycle + offset — без RNG-стейта.
- **Как работает:** `LOCATIONS` массив с 4 `LocationDef`, каждый содержит `small[]`, `middle[]`, `boss[]`. `getStageMonsterTextureKey()` считает ключ по stage и role, затем ротирует по пулу через `stageInLocation + locationCycle`.

```typescript
export const LOCATIONS: LocationDef[] = [
  {
    id: 1, folder: "desert",
    small: [s("cobra_desert_small"), s("desert_rat_desert_small"), ...],
    middle: [m("anubis_priest_desert_middle"), ...],
    boss: [b("sandworm_desert_boss"), b("sphynx_desert_boss")],
  },
  // 3 more locations...
];

export function getStageMonsterTextureKey(stage: number, monsterIndex: number = 0): string {
  const loc = getLocationForStage(stage);
  const role = getStageRole(stage);
  const offset = (stageInLoc - 1) + cycle * 6;  // rotate by cycle
  const idx = (offset + monsterIndex) % loc.small.length;  // round-robin pool
  return textureKeyFor(loc.small[idx]);
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/data/locations.ts`

#### Паттерн: Sword 200+ Sprites via Deterministic Level-to-Path Map

- **Почему:** избегаем атласов или streaming. Уровни 1-141 — явная таблица, уровни >141 — seededRandom в пуле. Мгновенный lookup.
- **Как работает:** `SWORD_LEVEL_TO_PATH: Record<number, string>` с записями 1..141. `getSwordAssetPath(level)` возвращает путь, `getSwordTextureKey(level)` — Phaser-ключ. Для уровней >141 используется детерминированный pseudo-RNG seed'нутый на level.

```typescript
export const SWORD_LEVEL_TO_PATH: Record<number, string> = {
  1: "sword_level_1.png",
  // ... 1..23 are direct sword_level_N.png
  24: "swords_set1/weapon_055.png",
  25: "swords_set2/weapon_000.png",
  26: "swords_set1/weapon_056.png",
  // ... 24..141 alternate set1/set2
};

private loadSwordSprites(): void {
  const SWORD_ASSET_VERSION = 3;
  const { SWORD_LEVEL_TO_PATH } = SWORD_ORDER_MODULE;
  for (const [levelStr, path] of Object.entries(SWORD_LEVEL_TO_PATH)) {
    this.load.image(`sword_lvl_${levelStr}`, `/sword-assets/${path}?v=${SWORD_ASSET_VERSION}`);
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/shared/swordOrder.ts`, `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts:488-496`

#### Паттерн: Manual Frame Advancement (Hero) vs Built-in Animation (Monster)

- **Почему:** Hero нужны 8-направленные walk-циклы со скином (который отключает анимацию). Monster — простой idle через Phaser anim manager с per-instance jitter.
- **Как работает:** `Hero.update()` инкрементит `frameTimer`, при превышении `frameDuration` подгружает текстуру `hero_walk_<dir>_<frame>`. `Monster.update()` использует ту же схему, но вызывает `sprite.setFrame(idx)` на Phaser Sprite (рендерер сам режет фреймы). Монстры рандомизируют `startFrame`, фазу и frameDuration (×0.5..1.5).

```typescript
// Hero.ts: manual frame loop
update(_time: number, delta: number): void {
  // ...
  this.frameTimer += delta;
  if (this.frameTimer >= this.frameDuration) {
    this.frameTimer -= this.frameDuration;
    this.frameIndex = (this.frameIndex + 1) % HERO_FRAME_COUNT;  // 6 frames
    this.updateFrame();
  }
}

private updateFrame(): void {
  const key = `hero_walk_${this.direction}_${this.frameIndex}`;
  if (this.scene.textures.exists(key)) this.sprite.setTexture(key);
}

// Monster.ts: spritesheet frame cycling
update(_time: number, delta: number): void {
  if (this.frameTotal > 1) {
    this.animTimer += delta;
    if (this.animTimer >= this.frameDuration) {
      this.animTimer -= this.frameDuration;
      this.animFrameIndex = (this.animFrameIndex + 1) % this.frameTotal;
      this.sprite.setFrame(this.animFrameIndex);  // Phaser handles frame lookup
    }
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Hero.ts:110-146`, `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Monster.ts:81-96`

#### Паттерн: Explosion Effect через Sprite Animation

- **Почему:** замена procedural `Graphics.fillCircle` (8 path-операций × 6 кадров) на pre-baked PNG 64×384 spritesheet. Один drawImage на кадр, никаких path-конструкций, рендерер может batch'ить concurrent взрывы.
- **Как работает:** `BootScene.preload()` грузит два spritesheet'а: `fx_death_explosion` (64×384, 6 кадров) и `fx_death_explosion_gold`. `registerExplosionAnims()` создаёт Phaser-анимации с frameRate 1000/60. На kill спавним Sprite, `play()`, авто-destroy на `ANIMATION_COMPLETE`.

```typescript
// BootScene.ts
this.load.spritesheet("fx_death_explosion",
  "/attached_assets/WaterExplosion_1766866058058.png",
  { frameWidth: 64, frameHeight: 64, endFrame: 5 });

if (!this.anims.exists("fx_death_explosion")) {
  this.anims.create({
    key: "fx_death_explosion",
    frames: this.anims.generateFrameNumbers("fx_death_explosion", { start: 0, end: 5 }),
    frameRate: 1000 / 60,  // 60ms per frame
    repeat: 0,
  });
}

// ExplosionEffect.ts
const sprite = scene.add.sprite(x, y, texKey, 0);
sprite.setDisplaySize(size, size);
sprite.play(animKey);
sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts:655-689`, `/home/agent/Pixel-Dungeon/phaser-client/src/ui/ExplosionEffect.ts`

#### Паттерн: Build-Time Asset Mirroring with Selective Copying

- **Почему:** `copy-assets.mjs` копирует только нужные ассеты из `../client/assets` и `../attached_assets` в `public/`, не таская весь репо артистов в прод-бандл.
- **Как работает:** скрипт итерирует hardcoded списки путей и копирует через `copyFileSync` в `public/client-assets`, `public/sword-assets`, `public/attached_assets`, `public/skin-assets`. Missing-файлы — warning, не fail. Скины — bulk-copy из `../attached_assets/skins/{1,2,3}/*.png`.

```typescript
// copy-assets.mjs excerpt
const swordIds = ["055","056", ... ];
for (const id of swordIds) copySword(`swords_set1/weapon_${id}.png`);

const PET_IDS = ["puppy", "com1", ...];
for (const id of PET_IDS) {
  for (let n = 1; n <= 7; n++) copyAttached(`pets/${id}/evo${n}.png`);
}

// Bulk copy skins
const skinDestDir = join(publicDir, "skin-assets");
for (const tier of ["1", "2", "3"]) {
  const srcDir = resolve(root, "../attached_assets/skins", tier);
  for (const f of readdirSync(srcDir)) {
    if (!f.endsWith(".png")) continue;
    copy(join(srcDir, f), join(skinDestDir, tier, f));
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/scripts/copy-assets.mjs`

#### Паттерн: Vite Dev Middleware for Live Asset Iteration

- **Почему:** артисты в dev переэкспортируют PNG и видят изменения сразу после refresh, не дожидаясь copy-assets.
- **Как работает:** `configureServer` плагин использует `server.middlewares.use()`. URL `/client-assets/` → `../client/assets`, `/sword-assets/` → `../attached_assets`, `/locations/` → `public/locations`. Файлы стримятся через `createReadStream` с `Cache-Control: no-cache`.

```typescript
// vite.config.ts: dev middleware
name: "serve-game-assets",
configureServer(server) {
  const clientAssetsRoot = path.resolve(__dirname, "../client/assets");
  const attachedAssetsRoot = path.resolve(__dirname, "../attached_assets");

  server.middlewares.use((req, res, next) => {
    const urlPath = req.url ? req.url.split("?")[0] : "";
    let filePath: string | null = null;

    if (urlPath.startsWith("/client-assets/")) {
      filePath = path.join(clientAssetsRoot, urlPath.replace("/client-assets/", ""));
    } else if (urlPath.startsWith("/sword-assets/")) {
      filePath = path.join(attachedAssetsRoot, urlPath.replace("/sword-assets/", ""));
    }

    if (filePath && fs.existsSync(filePath)) {
      res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    next();
  });
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts:82-128`

**Подводные камни:**

- Скукожили PNG, забыли обновить frameWidth/frameHeight в BootScene: Phaser режет новый PNG старой сеткой = мусор. → Всегда обновляйте размеры в том же коммите, проверяйте `identify <file>`.
- `+append` без `+repage`: правильные внешние размеры, но broken page geometry — Phaser читает только первый кадр. → `convert ... +append +repage PNG32:"$OUT"`.
- Отредактировали PNG в public/ и ждёте, что покажется без чистки кэша. → Бампайте `?v=N`, hard refresh (Ctrl+Shift+R).
- `-fuzz X -transparent white` на ghost-спрайте: стирает сам спрайт. → Ручной mask или grayscale + floodfill (см. SPRITE_OPTIMIZATION.md).
- Забыли, что small (64 px) и middle/boss (128 px) — разные размеры. → Проверяйте `frameSize` в `locations.ts`.
- seededRandom для уровней >141 — детерминирован, не «настоящий random». → Это намеренно для consistency, для true random нужен серверный roll.
- `this.load.spritesheet()` для 200+ мечей в одном preload: loader может застревать на 99%. → Текущий подход работает (мечи маленькие), но мониторьте `loader.inflight`. Watchdog в BootScene логирует STALL/FORCE-COMPLETE.
- `pixelArt: true` в Phaser config: ломает текстовый рендеринг на Android WebView. → Используйте texture-key-based filter `applyPixelArtFilter()`.

**Чеклист при переносе в новый проект:**

- [ ] `vite.config.ts` с `getAssetVersion()`, define `__ASSET_V__`.
- [ ] `serve-game-assets` middleware с no-cache headers (dev only).
- [ ] Структура `public/`: client-assets, sword-assets, attached_assets, locations, raid-art, skin-assets, equipment, sprites, fonts, balance.
- [ ] `copy-assets.mjs` build-script с hardcoded списками всех нужных ассетов.
- [ ] `LOCATIONS` массив в `src/data/locations.ts` с small/middle/boss и `frameSize`.
- [ ] `SWORD_LEVEL_TO_PATH` мапа 1..141 в `src/shared/swordOrder.ts` + seededRandom fallback.
- [ ] `BootScene.preload()` dispatcher с разделёнными `load*()` методами для каждой категории, все URL с `?v=${__ASSET_V__}`.
- [ ] `BootScene.create()` — `applyPixelArtFilter()` с NEAREST для pixel-art префиксов.
- [ ] `registerExplosionAnims()` создаёт animations из pre-baked spritesheets, проверяет `anims.exists` перед созданием.
- [ ] `Hero`: ручной walk-cycle 6×8 directions, скин отключает анимацию.
- [ ] `Monster`: `setFrame()` с auto-detected `frameTotal`, per-instance jitter (random startFrame, phase, frameDuration ×0.5..1.5).
- [ ] `ExplosionEffect`: one-shot Sprite, проверка существования, авто-destroy.
- [ ] `SPRITE_OPTIMIZATION.md` — пайплайн ImageMagick.
- [ ] Dev-server с `host: 0.0.0.0` и proxy `/api` к бэкенду. `fs.allow: ['.', '..']`.
- [ ] Loader watchdog в `BootScene`: трекаем progress stalls >4с, force-complete после 10с timeout.
- [ ] `copy-assets.mjs` запускается до vite build. Прод-бандл `dist/` — только нужные файлы.
- [ ] HTML splash screen с `window.__splashLog` callback для real-time diagnostics.

---

### 4. Баланс и конфиги

**Зачем:** позволить балансеру редактировать сотни параметров (питомцев, бустов, milestones, скинов) через CSV-файлы в `public/balance/` без перекомпиляции и пересборки APK. Поддерживать round-trip: код добавляет поле → `dump-balance` создаёт CSV-строку → балансер правит → CSV-loader подменяет default'ы при старте.

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts` — CSV-парсер + applier с 17 функций apply* для каждой категории.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts` — вызывает `loadBalanceFromCsv()` в `create()` ДО `GameStore.init()`.
- `/home/agent/Pixel-Dungeon/phaser-client/src/store/balanceConstants.ts` — code-side default'ы (rarities, sets, upgrade costs).
- `/home/agent/Pixel-Dungeon/shared/gameConfigs.ts` — типы и code default'ы (pets, boosts, milestones).
- `/home/agent/Pixel-Dungeon/phaser-client/scripts/dump-balance-to-csv.ts` — round-trip регенератор.
- `/home/agent/Pixel-Dungeon/phaser-client/public/balance/README.txt` — документация балансеру (на русском).
- `/home/agent/Pixel-Dungeon/phaser-client/BALANCE_REFERENCE.md` — design reference: формулы, кривые, примеры.
- `/home/agent/Pixel-Dungeon/phaser-client/ECONOMY_BALANCE.md` — economy audit per currency.

**Паттерны:**

#### Паттерн: CSV Parsing (RFC-4180 Minimal)

- **Почему:** парсим unquoted, quoted, escaped double-quote ячейки. Минимальный subset без зависимостей.
- **Как работает:** `parseCsv()` идёт по символу, трекая `inQuotes`. Неэкранированная `"` — toggle, удвоенная — escape. Запятые/newline — разделители вне quotes. `csvToRecords()` маппит строки в объекты по первой строке-заголовку.

```typescript
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(cell); cell = ''; continue; }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts`

#### Паттерн: Field-by-Field Override (setByPath)

- **Почему:** скаляры используют dot-notation (`monster.hpBase`, `prestige.upgrades.damage.baseCost`). Должны ставиться ТОЛЬКО существующие в code-default поля; опечатки тихо игнорятся.
- **Как работает:** split по точкам, навигация по объекту с проверкой типа. На leaf — set только если поле есть. На bad reference — abort.

```typescript
function setByPath(root: any, dottedKey: string, value: unknown): void {
  const parts = dottedKey.split('.');
  let obj = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (obj[p] == null || typeof obj[p] !== 'object') return;
    obj = obj[p];
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in obj)) return; // Only set if key exists
  obj[leaf] = value;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts`

#### Паттерн: Array Override (Pipe-Separated Values)

- **Почему:** некоторые поля — массивы (multiplier по rarity). CSV не вкладывает массивы, поэтому используем `|`.
- **Как работает:** `parseValue()` чекает `|`, если есть — split и рекурсивный parse каждой части. Каждый элемент: bool / number / string.

```typescript
function parseValue(raw: string): number | boolean | string | (number | string | boolean)[] {
  if (raw.includes('|')) {
    return raw.split('|').map((s) => parseValue(s) as number | string | boolean);
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === '') return '';
  const n = Number(raw);
  return Number.isFinite(n) && raw.trim() !== '' ? n : raw;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts`

#### Паттерн: Pet Array Grouping (Multi-Row Type)

- **Почему:** питомцы имеют эволюции, разбитые по строкам (одна строка = petId + evoIndex). Группируем по petId, сортируем по evoIndex, сохраняем code-default'ы для отсутствующих питомцев.
- **Как работает:** существующие default'ы в Map по id. Итерируем CSV эволюций, группируем. Сливаем code + CSV (union для отсутствующих).

```typescript
const codeDefaults = new Map<string, PetConfig>();
for (const p of DEFAULT_PETS) codeDefaults.set(p.id, p);
const evosByPet = new Map<string, Array<{ idx: number; evo: PetEvolutionConfig }>>();
for (const r of csvToRecords(evosText ?? '')) {
  const petId = r['petId']?.trim();
  if (!petId) continue;
  const idx = num(r['evoIndex']);
  if (idx == null) continue;
  const evo: PetEvolutionConfig = { name: r['name'] ?? '', ... };
  const arr = evosByPet.get(petId) ?? [];
  arr.push({ idx, evo });
  evosByPet.set(petId, arr);
}
// Later: merge code defaults with CSV data, union the two
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts`

#### Паттерн: Utility Boosts Preservation

- **Почему:** UI-tied бусты (speed, automerge, autobuy) живут только в коде, не в CSV. Если CSV-loader полностью заменит DEFAULT_BOOSTS, UI-кнопки молча перестанут работать.
- **Как работает:** после парса CSV-бустов фильтруем DEFAULT_BOOSTS по hardcoded set utility-id'шников. Аппендим к CSV-результату.

```typescript
const UTILITY_BOOST_IDS = new Set(['speed', 'automerge', 'autobuy']);
function applyBoosts(text: string): number {
  const recs = csvToRecords(text);
  const next: BoostConfig[] = recs.map(r => ({ ... }));
  const utility = DEFAULT_BOOSTS.filter(b => UTILITY_BOOST_IDS.has(b.id));
  DEFAULT_BOOSTS.length = 0;
  DEFAULT_BOOSTS.push(...next, ...utility); // Append utility boosts
  return next.length;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts`

#### Паттерн: Fetch with Abort Timeout

- **Почему:** offline или зависший сеть на iOS WKWebView. `Promise.all` в BootScene не зарезолвится, splash висит. AbortController + 10с timeout per file.
- **Как работает:** создаём AbortController, ставим timeout. Fetch с signal. На abort ловим AbortError отдельно. Clear timer в finally.

```typescript
async function fetchText(url: string, timeoutMs: number = 10_000): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: ctrl?.signal });
    if (!res.ok) { console.warn(`[balance] fetch ${url} not-ok status=${res.status}`); return null; }
    return await res.text();
  } catch (e) {
    const err = e as { name?: string; message?: string };
    console.warn(`[balance] fetch ${url} failed name=${err?.name} msg=${err?.message}`);
    return null;
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts`

#### Паттерн: Boot Timing — LoadBalanceFromCsv Before Store Init

- **Почему:** `GameStore.init()` инициализирует state из localStorage + default'ов. Если CSV переопределяет default'ы ПОСЛЕ init — старые значения остаются. Сначала CSV.
- **Как работает:** `BootScene.create()` цепляет `loadBalanceFromCsv().then(...).finally(() => { GameStore.init(); ... })`. Finally гарантирует init после загрузки CSV даже на error.

```typescript
create(): void {
  // ... setup textures, anims ...
  loadBalanceFromCsv()
    .then((report) => { console.log(`[balance] scalars=${report.scalars} ...`); })
    .catch((err) => { console.warn('[balance] load failed:', err); })
    .finally(() => {
      GameStore.init(); // NOW init store with overridden defaults
      this.scene.launch('TabBarScene');
      this.scene.launch('HeaderScene');
      this.scene.launch('BattleScene');
    });
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts`

#### Паттерн: Round-Trip Dump (flatten + pipe-separate)

- **Почему:** разработчики добавляют новое поле в `gameConfigs.ts`. Dump-скрипт регенерирует CSV из кода, чтобы балансер всегда имел полную строку.
- **Как работает:** `flattenScalars()` рекурсивно ходит по дереву DEFAULT_BALANCE, строит dot-notation. Массивы примитивов джойнятся через `|`. CSV строится строкой-за-строкой.

```typescript
function flattenScalars(prefix: string, obj: any, out: ScalarRow[]): void {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v == null) continue;
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
      out.push([key, String(v), '']);
    } else if (Array.isArray(v)) {
      if (v.every(x => typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean')) {
        out.push([key, v.join('|'), 'pipe-separated list']);
      }
    } else if (typeof v === 'object') {
      flattenScalars(key, v, out);
    }
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/scripts/dump-balance-to-csv.ts`

**Подводные камни:**

- Переименовали `imageKey` в `gameConfigs.ts` без обновления CSV: CSV переопределяет именно imageKey, старое значение остаётся. → После переименования всегда `npm run dump-balance`.
- Добавили нового питомца в `DEFAULT_PETS` без CSV-строки: код-default'ный питомец появится, но балансер не сможет редактировать. → `npm run dump-balance` авто-генерирует строку.
- Опечатка в `id` CSV (`pet_puppy` vs `puppy`): applier тихо скипает. → Проверять id, debug-log на rejected rows.
- Новое поле только в CSV без кода: loader игнорит unknown columns. → Сначала добавьте поле в TS-interface и code-default, потом dump-balance.
- Невалидное число в CSV (`abc`): `num()` возвращает undefined, поле скипается. → Валидация перед заливкой.
- Fetch timeout на одном CSV: `Promise.all` ломается, splash висит. → `fetchText()` возвращает null, не throw, Promise.all завершается.
- Трейты питомца с `&` вместо `|`: `parseTraits()` молча скипает. → Используйте `|`, валидируйте ключи против `VALID_TRAIT_KEYS`.
- Milestone level/requirement = 0: код скипает, milestone выглядит incomplete. → Все требования должны быть positive.
- Equipment rarity опечатка (`common` vs `commons`): applier чекает `if (rarity in WEIGHTS)`, скипает. → Точные enum-значения, case-sensitive.
- CSV-loader работает, но `GameStore.init()` вызван ДО завершения: новые значения не доходят. → `.finally(() => GameStore.init())` гарантирует timing.

**Чеклист при переносе в новый проект:**

- [ ] `shared/gameConfigs.ts` с TS-интерфейсами для всех balance-able конфигов. `imageKey` как identifier.
- [ ] `balanceConstants.ts` с мутируемыми объектами (массивы можно делать `.length = 0; push(...)`).
- [ ] `src/balance/loader.ts` с `parseCsv`, `csvToRecords`, apply*-функциями. `fetchText` с AbortController.
- [ ] `scripts/dump-balance-to-csv.ts` с flatten в dot-notation, pipe-separated массивы, строка-на-айтем для конфигов.
- [ ] `public/balance/` с шаблонными CSV. README.txt с описанием колонок.
- [ ] `loadBalanceFromCsv()` в `BootScene.create()` ДО `GameStore.init()`. `.finally(() => init())`.
- [ ] Безопасные setters: `setByPath` для скаляров, прямая замена массивов, merge с fallback для питомцев.
- [ ] Обработка ошибок: timeout, parse fail, invalid enum. Warning, не throw.
- [ ] `BALANCE_REFERENCE.md` (формулы) и `ECONOMY_BALANCE.md` (доходы/расходы) cross-referenced на код.
- [ ] npm script `dump-balance`. Инструкция: запускать после добавления новых полей.

---

### 5. UI-паттерны

**Зачем:** примирить graphics-first дизайн Phaser с современным UX — интерактивные кнопки, модалки со стеком, нижняя навигация, оптимизированный HUD, premium-feel reveal анимации. Главный паттерн — «zone-over-graphics», который везде в codebase.

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/Button3D.ts` — каноническая реализация zone-over-graphics.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/TabBar.ts` — нижняя навигация с sleep/wake.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/GameHeader.ts` — верхний HUD с dirty-flagging.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DropsPopup.ts` — сложная модалка с grid, glow, эффектами.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/BoostsPopup.ts` — модалка бустов.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/AdModal.ts` — модалка рекламы.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DamagePopup.ts` — пул всплывающих чисел.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/CoinAnimation.ts` — анимация монет.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/SummonRevealAnimation.ts` — открытие сундука.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/FloatingButtons.ts` — плавающие кнопки действий.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/CloseButton.ts` — кнопка ×.
- `/home/agent/Pixel-Dungeon/phaser-client/src/ui/ServerBossLeaderboard.ts` — data-driven лидерборд.
- `/home/agent/Pixel-Dungeon/phaser-client/src/constants/theme.ts` — design tokens.
- `/home/agent/Pixel-Dungeon/phaser-client/src/tutorial/modalLifecycle.ts` — биндинг модалок в GameStore.

**Паттерны:**

#### Паттерн: Zone-Over-Graphics (Universal Interactive Pattern)

- **Почему:** Phaser Graphics не поддерживает pointer events нативно. Невидимый Zone поверх декоративных Graphics разделяет hit-testing и рендеринг, упрощая стекинг (тени, бордеры, fill, dim) без усложнения логики ввода.
- **Как работает:** `scene.add.zone(x, y, w, h)` тех же размеров делается interactive и кладётся поверх Container из Graphics (shadow base, highlight inset, inner fill). Zone хендлит события, graphics — чисто визуал. Zone трекает внутренний state (pressed flag). На `pointerdown` контейнер получает press-tween.

```typescript
// From Button3D.ts
const c = scene.add.container(bx + bw / 2, by + bh / 2);
const shadow = scene.add.graphics();
shadow.fillStyle(palette.dark, 1);
shadow.fillRoundedRect(localX, localY, bw, bh, radius);
c.add(shadow);

const highlight = scene.add.graphics();
highlight.fillStyle(palette.light, 1);
highlight.fillRoundedRect(localX, localY, bw - border, bh - border, radius);
c.add(highlight);

const inner = scene.add.graphics();
inner.fillStyle(palette.fill, 1);
inner.fillRoundedRect(localX + border, localY + border, bw - border * 2, bh - border * 2, radius - 1);
c.add(inner);

const zone = scene.add.zone(0, 0, bw, bh).setInteractive({ useHandCursor: true });
let pressed = false;
zone.on("pointerdown", (p: Phaser.Input.Pointer) => {
  pressed = true;
  p.event?.stopPropagation?.();
  scene.tweens.add({
    targets: c,
    scaleX: 0.92, scaleY: 0.92,
    duration: 70, yoyo: true, ease: "Quad.easeOut",
  });
});
zone.on("pointerup", (p: Phaser.Input.Pointer) => {
  if (!pressed) return;
  pressed = false;
  if (p.getDistance && p.getDistance() > 16) return;
  onTap();
});
c.add(zone);
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/Button3D.ts`

#### Паттерн: Modal Lifecycle Binding

- **Почему:** модалки должны координироваться с туториалом, держать depth, блокировать ввод вниз. Единый стек в GameStore.
- **Как работает:** каждая модалка зовёт `bindSceneModalLifecycle()` или `bindContainerModalLifecycle()` в конструкторе. Они пушат id в `GameStore.modals` (Set) и слушают SHUTDOWN/SLEEP/DESTROY для попа. Туториальный overlay чекает `GameStore.getActiveModals()` для прятания стрелок.

```typescript
// From modalLifecycle.ts
export function bindContainerModalLifecycle(container: Phaser.GameObjects.Container, id: string): void {
  GameStore.pushModal(id);
  container.once(Phaser.GameObjects.Events.DESTROY, () => GameStore.popModal(id));
}

// In DropsPopup constructor:
bindContainerModalLifecycle(this, "DropsPopup");

// Modal structure:
const dimZone = scene.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT)
  .setOrigin(0).setInteractive();
dimZone.on("pointerdown", () => this.close());
this.add(dimZone);

const dim = scene.add.graphics();
dim.fillStyle(0x000000, 0.8);
dim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
this.add(dim);
this.bringToTop(dimZone);  // Keep dimZone on top so it intercepts clicks

const cardZone = scene.add.zone(this.cardX, this.cardY, this.cardW, this.cardH)
  .setOrigin(0).setInteractive();
this.add(cardZone);  // Blocks clicks from bubbling to dimZone
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/tutorial/modalLifecycle.ts`

#### Паттерн: Scene Sleep/Wake for Tab Navigation

- **Почему:** переключение между full-scene вкладками частое и должно быть мгновенным. `stop()` + полный rebuild — дорого на WebKit.
- **Как работает:** `TabBar.switchTab()` зовёт `sleep(prevTab)` и `wake(newTab)`. `BattleScene` особенный: остаётся active, но `setVisible(false)` + `input.enabled = false`, чтобы AI монстров продолжал тикать и фоновые события (золото, XP) шли. Под-сцены явно закрываются перед свитчем.

```typescript
// From TabBar.ts
switchTab(sceneKey: string): void {
  // ... Close any open sub-scenes (Wizard Tower, Tavern, etc.) ...
  this.closeOpenSubScenes();

  const prevTab = this.activeTab;
  if (prevTab === "BattleScene") {
    const battle = this.scene.manager.getScene("BattleScene");
    if (battle) {
      battle.scene.setVisible(false);
      if (battle.input) battle.input.enabled = false;
      battle.events.emit("sleep");  // Tutorial arrows listen to this
    }
  } else {
    if (this.sceneExists(prevTab) && this.scene.isActive(prevTab)) {
      this.scene.sleep(prevTab);  // Keep state + display list, pause update()
    }
  }

  this.activeTab = sceneKey;

  if (sceneKey === "BattleScene") {
    const battle = this.scene.manager.getScene("BattleScene");
    if (battle) {
      battle.scene.setVisible(true);
      if (battle.input) battle.input.enabled = true;
      battle.events.emit("wake");
    }
  } else {
    if (this.sceneExists(sceneKey)) {
      if (this.scene.isSleeping(sceneKey)) {
        this.scene.wake(sceneKey);  // Resume cached scene ~free
      } else if (!this.scene.isActive(sceneKey)) {
        this.scene.launch(sceneKey);
      }
      this.scene.bringToTop(sceneKey);
    }
  }
  this.updateTabHighlights();
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/TabBar.ts`

#### Паттерн: Dirty-Flagging for HUD Updates

- **Почему:** хедер обновляется на events с высокой частотой (gold tick ~60Hz). Naive rebuild Text объектов крошит GC. Dirty-flag батчит апдейты в один POST_UPDATE flush; кэш last-rendered значений скипает `setText()` для неизменных строк.
- **Как работает:** на store events ставится `dirty = true`. Единый POST_UPDATE listener проверяет флаг, если true — `updateAll()`, который сравнивает с кэшем и зовёт setText только на mismatch. `Text.setText()` инвалидирует offscreen canvas и пересчитывает glyphs на iOS — избегание redundant calls = серьёзный win.

```typescript
// From GameHeader.ts
private dirty = false;
private lastResourceText: string[] = ["", "", "", "", ""];
private lastXpLabel = "";
private lastXpValue = "";
private lastStageLabel = "";
private lastStageValue = "";
private lastRankUnlocked: boolean | null = null;

private markDirty = () => { this.dirty = true; };

private setupListeners(): void {
  const storeHandlers: Array<[string, (...args: any[]) => void]> = [
    ["goldChanged", this.markDirty],
    ["xpChanged", this.markDirty],
    ["levelUp", this.markDirty],
    ["stageChanged", this.markDirty],
    ["monsterKilled", this.markDirty],
    ["currencyChanged", this.markDirty],
    ["bossFightStarted", this.markDirty],
    ["stageBossDamaged", this.markDirty],
    ["bossDefeated", this.markDirty],
  ];
  for (const [ev, fn] of storeHandlers) GameStore.on(ev, fn);

  const flushDirty = (): void => {
    if (this.dirty) {
      this.dirty = false;
      this.updateAll();
    }
  };
  this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, flushDirty);
}

private updateAll(): void {
  for (let i = 0; i < RESOURCE_KEYS.length; i++) {
    const v = formatNumber(RESOURCE_KEYS[i].getter());
    if (v !== this.lastResourceText[i]) {
      this.lastResourceText[i] = v;
      this.resourceTexts[i].setText(v);
    }
  }
  // ... (similar for XP, Stage labels, bar redraws)
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/GameHeader.ts`

#### Паттерн: Tween-Driven Reveal Sequences

- **Почему:** chest-open и reward анимации мешают rarity-flash, particle burst, pop-in scale, arc trajectory для premium UX. Требует stagger'инг и event chaining.
- **Как работает:** `SummonRevealAnimation.play()` берёт айтемы и dest-координаты. Для каждого айтема `playOne()` с stagger delay (90 ms). `playOne()` палит: (1) rarity flash + particle burst, (2) pop-in scale (0.3 → 1.15 → 1.0), (3) delayedCall, (4) arc tween через quadratic-bezier, (5) fade-out. Все tweens последовательны, не вложены.

```typescript
// From SummonRevealAnimation.ts
play(items: EquipmentItem[], fromX: number, fromY: number, destinations: Dest[], onComplete?: () => void): void {
  if (this.busy || items.length === 0) { onComplete?.(); return; }
  this.busy = true;
  let remaining = items.length;
  const done = () => { if (--remaining === 0) { this.busy = false; onComplete?.(); } };

  items.forEach((item, i) => {
    const angle = items.length > 1 ? -Math.PI / 2 + (i - (items.length - 1) / 2) * 0.22 : -Math.PI / 2;
    this.scene.time.delayedCall(i * STAGGER_MS, () =>
      this.playOne(item, fromX, fromY, dest.x, dest.y, angle, done));
  });
}

private playOne(item: EquipmentItem, fromX: number, fromY: number, toX: number, toY: number, arcAngle: number, onDone: () => void): void {
  // 1. Rarity flash
  const flash = scene.add.graphics();
  flash.fillStyle(color, 0.85).fillCircle(0, 0, 46);
  flash.setBlendMode(Phaser.BlendModes.ADD);
  this.scene.tweens.add({ targets: flash, scaleX: { from: 0.25, to: 2.4 }, alpha: { from: 1, to: 0 }, duration: FLASH_MS, onComplete: () => flash.destroy() });

  // 2. Pop-in
  this.scene.tweens.add({ targets: item$, scale: baseScale * 1.15, alpha: 1, duration: POP_IN_MS, ease: "Back.easeOut", onComplete: () => {
    this.scene.tweens.add({ targets: item$, scale: baseScale, duration: 90, ease: "Cubic.easeOut" });
  }});

  // 3. Hold, then arc
  this.scene.time.delayedCall(POP_IN_MS + HOLD_MS, () => {
    const proxy = { t: 0 };
    this.scene.tweens.add({
      targets: proxy, t: 1, duration: ARC_MS, ease: "Cubic.easeIn",
      onUpdate: () => {
        const t = proxy.t, omt = 1 - t;
        const x = omt * omt * fromX + 2 * omt * t * midX + t * t * toX;
        const y = omt * omt * fromY + 2 * omt * t * midY + t * t * toY;
        item$.setPosition(x, y);
      },
      onComplete: () => { /* fade out */ }
    });
  });
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/SummonRevealAnimation.ts`

#### Паттерн: Pooled Floating Combat Popups

- **Почему:** combat спавнит 3-6 попапов на kill × kills/sec — тысячи объектов в минуту, GC thrashing. Пул + manual анимация в POST_UPDATE = нулевая аллокация.
- **Как работает:** WeakMap на сцену, в нём `PoolEntry[]` per kind (damage, crit, gold, xp). Каждый entry хранит Text + анимационный state. `acquire()` берёт inactive или создаёт до MAX_PER_KIND = 24. Один POST_UPDATE tick двигает все активные popup'ы через `easeOut(t)` без аллокации Tween. На t=1 — пометка inactive.

```typescript
// From DamagePopup.ts
interface PoolEntry {
  text: Phaser.GameObjects.Text;
  active: boolean;
  startMs: number;
  duration: number;
  fromX: number; fromY: number; toX: number; toY: number;
  fromScale: number; toScale: number;
}

const POOLS: WeakMap<Phaser.Scene, ScenePools> = new WeakMap();
const MAX_PER_KIND = 24;

function getScenePools(scene: Phaser.Scene): ScenePools {
  let pools = POOLS.get(scene);
  if (pools) return pools;
  pools = { byKind: new Map() };
  POOLS.set(scene, pools);

  const tick = (): void => {
    const all = POOLS.get(scene);
    if (!all) return;
    const now = scene.time.now;
    for (const pool of all.byKind.values()) {
      for (const e of pool) {
        if (!e.active) continue;
        const t = Math.min(1, (now - e.startMs) / e.duration);
        const k = easeOut(t);
        const x = e.fromX + (e.toX - e.fromX) * k;
        const y = e.fromY + (e.toY - e.fromY) * k;
        const sc = e.fromScale + (e.toScale - e.fromScale) * k;
        e.text.setPosition(x, y).setAlpha(1 - t).setScale(sc);
        if (t >= 1) {
          e.active = false;
          e.text.setVisible(false);
        }
      }
    }
  };
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, tick);
  return pools;
}

function acquire(scene: Phaser.Scene, kind: PopupKind): PoolEntry {
  const pool = getPool(scene, kind);
  for (const entry of pool) {
    if (!entry.active) return entry;
  }
  if (pool.length < MAX_PER_KIND) {
    const text = scene.add.text(0, 0, "").setOrigin(0.5).setDepth(100);
    const entry: PoolEntry = { text, active: false, startMs: 0, duration: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, fromScale: 1, toScale: 1 };
    pool.push(entry);
    return entry;
  }
  let oldest = pool[0];
  for (const entry of pool) {
    if (entry.startMs < oldest.startMs) oldest = entry;
  }
  oldest.active = false;
  return oldest;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DamagePopup.ts`

#### Паттерн: Data-Driven Grid Layout

- **Почему:** лидерборды, drops grid, boost rows, upgrade панели — всё это column/row layouts из cell dimensions. Data и view разделены, state changes ребилдят только affected rows.
- **Как работает:** `ServerBossLeaderboard` считает позиции row'ов из `ROW_H` и `ROW_GAP`. `DropsPopup` grid — 3 column × N rows; видимые ячейки фильтруются по unlock stage. Каждый row/cell рисуется процедурно из data. Container пересоздаётся каждый tick (1 sec для лидербордов).

```typescript
// From ServerBossLeaderboard.ts
const boardH = ROW_H * DEFAULT_SERVER_BOSS_CONFIG.participantCount + ROW_GAP * (DEFAULT_SERVER_BOSS_CONFIG.participantCount - 1);
const boardTop = subY + 22;
board.forEach((row, i) => {
  const ry = boardTop + i * (ROW_H + ROW_GAP);
  this.drawRow(c, ry, i + 1, row, maxBoardDamage);
});

// From DropsPopup.ts
const cells: RewardCell[] = [
  { iconTexture: "icon_coin", label: "Gold", value: () => d.gold },
  { iconTexture: "icon_gem", label: "Gems", value: () => d.gems },
  { iconTexture: null, fallbackText: "▲", label: "stages", value: () => d.stagesProgressed, showLabel: true, isStages: true },
];
const visibleCells = cells.filter((cell) => cell.visible?.() ?? true);
visibleCells.forEach((cell, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const cellX = gridPanelX + GRID_PAD + col * (CELL_W + colGap);
  const cellY = gridPanelY + GRID_PAD + row * (cellHTop + rowGap);
  this.buildRewardCell(c, cellX, cellY, CELL_W, cellHTop, cell);
});
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/ui/ServerBossLeaderboard.ts`

#### Паттерн: Theme Constants for Skinning

- **Почему:** цвета, шрифты, spacing разбросаны по UI. Централизация в `theme.ts` позволяет single-stop visual updates.
- **Как работает:** `theme.ts` экспортирует `GameColors` (CSS strings для Text), `GameColorsHex` (0xRRGGBB для Graphics), `FontFamily`, `FontSize`, `Spacing`. Каждый UI-компонент импортит из theme.ts, никогда не хардкодит.

```typescript
// From theme.ts
export const GameColors = {
  primary: "#8B4513",
  secondary: "#FFD700",
  background: "#2C2416",
  backgroundLight: "#3D3322",
  backgroundDark: "#1A150D",
  accent: "#DC143C",
  success: "#32CD32",
  danger: "#DC143C",
  textPrimary: "#F5DEB3",
  textSecondary: "#A0826D",
  gold: "#FFD700",
  xp: "#9370DB",
  border: "#6B4423",
  borderLight: "#8B6914",
  panelBg: "#3D2E1F",
  panelBgDark: "#2A1F14",
};

export const FontSize = {
  h1: 16, h2: 14, h3: 12, body: 11, small: 9, caption: 8, damage: 11,
};

// Usage in Button3D.ts
const textColor = opts.textColor ?? GameColors.textPrimary;
const fontSize = opts.fontSize ?? FontSize.body;
const txt = scene.add.text(0, 0, label, {
  fontFamily: FontFamily,
  fontSize: `${fontSize}px`,
  color: textColor,
  fontStyle: "bold",
});

// Usage in TabBar.ts
const text = this.add.text(tx, labelY, tab.label, {
  fontFamily: FontFamily,
  fontSize: "10px",
  color: isActive ? GameColors.secondary : (unlocked ? GameColors.textSecondary : "#555555"),
  fontStyle: isActive ? "bold" : "normal",
});
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/constants/theme.ts`

**Подводные камни:**

- Создание Text и Tween каждый кадр на высокочастотных events. → Пулинг (DamagePopup) или dirty-flagging (GameHeader). Skip setText если значение не изменилось.
- Graphics делается interactive напрямую (не поддерживает pointer). → Невидимый Zone поверх с теми же размерами.
- Полный rebuild сцен на каждом переключении вкладки. → `scene.sleep()` / `scene.wake()`.
- Модальные клики буллятся вниз и триггерят сцену под модалкой. → Interactive dimZone снизу, cardZone сверху.
- Не трекаются активные модалки — туториал рисует поверх popup'ов. → `bindContainerModalLifecycle()`.
- Хардкод цветов и font sizes везде. → theme.ts.
- Глубокое вложение колбеков для tween-stagger'инга. → `scene.time.delayedCall()` для следующей фазы. Flat и детерминированно.

**Чеклист при переносе в новый проект:**

- [ ] Zone-over-graphics для всех интерактивных элементов. Внутренний pressed flag на zone.
- [ ] `theme.ts` с цветами, шрифтами, spacing. Везде импорт из theme.ts.
- [ ] `bindSceneModalLifecycle()` / `bindContainerModalLifecycle()` для регистрации модалок в GameStore. Туториал чекает `getActiveModals()`.
- [ ] Dirty-flagging в data-driven HUD: mark dirty на store events, flush в POST_UPDATE, cache last-rendered.
- [ ] `scene.sleep()`/wake() для табов. BattleScene особенный (active + invisible).
- [ ] Модалки: dimZone снизу (interactive), dim graphics, cardZone сверху (блокирует bubbling), content.
- [ ] Пул для high-frequency popups: Text объекты, manual animation в POST_UPDATE.
- [ ] Reveal tweens через `delayedCall` для stagger'инга: pop-in → hold → arc → fade-out.
- [ ] Static текстуры (монета, кнопочные паттерны) — `generateTexture()` один раз.
- [ ] Grid/list layouts из констант (cell W, row H, gaps), data-driven rendering.

---

### 6. Состояние, сохранение, экономика

**Зачем:** держать всё игровое состояние в одном in-memory store с событийной шиной, персистить в `localStorage` с CRC и debounce, поддерживать экономику с экипировкой (rarity + upgrade), ачивки (lifetime stats), daily-tasks, weekly calendar, Starter Pack (playtime-based) и offline-earnings без фоновых таймеров.

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts` — центральный store с GameState, save/load, currency mutations, achievements.
- `/home/agent/Pixel-Dungeon/phaser-client/src/store/balanceConstants.ts` — equipment sets, daily tasks, weekly calendar, starter pack rewards.
- `/home/agent/Pixel-Dungeon/phaser-client/src/data/achievements.ts` — 15 ачивок × 10 уровней.
- `/home/agent/Pixel-Dungeon/phaser-client/src/data/guidedQuestsService.ts` — загрузчик quests JSON.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/StarterPackScene.ts` — модалка Starter Pack.
- `/home/agent/Pixel-Dungeon/phaser-client/src/services/IAPService.ts` — мост к Capacitor BillingPlugin.

**Паттерны:**

#### Паттерн: Centralized State Store with Event Emitter

- **Почему:** single source of truth избегает разбросанных мутаций. Event emitter позволяет UI подписываться без tight coupling.
- **Как работает:** `GameStore.state` содержит весь `GameState` (50+ полей). Методы мутируют и зовут `this.emit()`. Listeners подписываются через `GameStore.on()`. Изменения триггерят `markDirty()` → debounced save.

```typescript
// Mutation example
addCurrency(type: "gold" | "gems" | ..., amount: number): void {
  this.state[type] += amount;
  this.emit("currencyChanged");
  if (type === "gold") this.emit("goldChanged", this.state.gold);
}

// Usage: GameStore.addCurrency("gems", 100);
// Triggers emit → markDirty → debounced save
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:5884–5888`

#### Паттерн: Versioned Envelope Save Format with CRC Integrity

- **Почему:** защита от частичных/повреждённых `localStorage` write (quota, WebView крэш, расширения). CRC ловит битфлипы до дорогого JSON parsing.
- **Как работает:** при save state сериализуется в JSON, CRC-32 хэшится, оборачивается в `{v, ts, crc, payload}`. При load CRC пересчитывается и сравнивается; mismatch — backup в `<SAVE_KEY>_corrupt_<timestamp>` и старт с нуля. Три попытки save с уменьшением grid'ов (dig, mine) при quota overflow.

```typescript
// Save
const wrapped = `{"v":${SAVE_SCHEMA_VERSION},"ts":${Date.now()},"crc":"${crc}","payload":${payloadStr}}`;
localStorage.setItem(SAVE_KEY, wrapped);

// Load
const env = parsed as { v, crc, payload };
const computed = crc32(JSON.stringify(env.payload));
if (computed !== env.crc) {
  this.backupCorruptSave(raw);
  return; // Data lost but backed up for inspection
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:6089–6205`

#### Паттерн: Debounced Persistence Pipeline

- **Почему:** свернуть burst мутаций (50 kills/sec) в один write. 30с fallback ловит edge cases.
- **Как работает:** любой `emit()` зовёт `markDirty()`. Ставится `setTimeout(flushNow, 500ms)` только если таймера нет. Page-hide events (`beforeunload`, `pagehide`, `visibilitychange→hidden`) flush'ат сразу. 30с `setInterval` тоже flush'ит если dirty.

```typescript
private startSaveSystem(): void {
  this.fallbackTimer = setInterval(() => {
    if (this.dirty) this.flushNow();
  }, SAVE_FALLBACK_INTERVAL); // 30s

  window.addEventListener("pagehide", () => {
    if (this.dirty) this.flushNow(); // Immediate
  });
}

private markDirty(): void {
  this.dirty = true;
  if (this.saveDebounceTimer) return; // Coalesce
  this.saveDebounceTimer = setTimeout(() => {
    this.flushNow();
  }, SAVE_DEBOUNCE_MS); // 500ms
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:966–1022`

#### Паттерн: Equipment Rarity-Upgrade Model with Yellow Gems

- **Почему:** разделение прогрессии (rarity merging) и скейла мощи (level upgrades). Жёлтые гемы — отдельная валюта от синих.
- **Как работает:** каждый item — `{id, setId, type, rarity, originRarity, level}`. Стоимость апгрейда = `base[rarity] × mult[rarity]^(level-1)` в жёлтых гемах, cap на L50. Merge (promotion) требует 4/4 set'а и удваивает rarity progress. Stats считаются read-time: `baseStats[originRarity] × PROMO^mergeSteps × (1 + 0.04 × (level-1))`.

```typescript
upgradeEquipmentLevel(itemId: string): { ok, reason } {
  const item = this.findEquipmentItem(itemId);
  if (item.level >= EQUIPMENT_UPGRADE_MAX_LEVEL) return { ok: false };
  const cost = getEquipmentUpgradeCost(item.rarity, item.level);
  if (this.state.equipmentGems < cost) return { ok: false };
  this.state.equipmentGems -= cost;
  item.level++;
  this.emit("equipmentChanged", this.state.equippedItems);
  return { ok: true };
}

// Merge 4/4 set → promote base item's rarity
mergeEquipmentSet(setId: string): { ok } {
  const nextR = getNextRarity(setOrigin);
  base.rarity = nextR;
  base.level = Math.max(1, Math.floor(base.level / 2));
  this.bumpLifetime("equipmentMerges", 1);
  return { ok: true };
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:4502–4562`

#### Паттерн: Lifetime Stats Bridge to Daily-Task Progress

- **Почему:** один инкремент кормит и long-term ачивки, и short-term daily-tasks. Не два tracking'а.
- **Как работает:** `bumpLifetime(key, amount)` инкрементит `state.lifetimeStats[key]` (never resets). Lookup в `LIFETIME_TO_DAILY_KEY` (e.g. `gemsSpent → gems_spent`) и auto-call `bumpDailyProgress(dailyKey)`.

```typescript
// LIFETIME_TO_DAILY_KEY
const LIFETIME_TO_DAILY_KEY: Record<string, DailyProgressKey> = {
  gemsSpent:        "gems_spent",
  skillUpgrades:    "skill_upgrades",
  stagesCleared:    "stage_clears",
  digCellsRevealed: "dig_cells_opened",
  // ... 5 keys total
};

bumpLifetime(key: keyof LifetimeStats, amount: number = 1): void {
  this.state.lifetimeStats[key] = (this.state.lifetimeStats[key] || 0) + amount;
  const dailyKey = LIFETIME_TO_DAILY_KEY[key as string];
  if (dailyKey) this.bumpDailyProgress(dailyKey, amount); // Auto-update daily
  this.emit("lifetimeChanged");
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:846–852, 5015–5023`

#### Паттерн: Achievement Progression on Lifetime Stats

- **Почему:** разделение определений ачивок и store. Чистые data-only определения без Phaser/circular-dep.
- **Как работает:** `LifetimeStats` держит 15 счётчиков. `getAchievementValue(id)` читает счётчик. Claim state хранится отдельно в `state.achievementProgress[id] = {claimedLevel}`. `canClaimAchievement()` сравнивает текущее значение с target для следующего уровня.

```typescript
getAchievementValue(id: string): number {
  const def = getAchievementDef(id); // Load from achievements.ts
  return this.state.lifetimeStats[def.progressKey] || 0; // Read progress
}

canClaimAchievement(id: string): boolean {
  const def = getAchievementDef(id);
  const claimed = this.getAchievementClaimedLevel(id); // 0..10
  if (claimed >= ACHIEVEMENT_LEVELS) return false; // Already maxed
  const target = getAchievementTarget(def, claimed + 1);
  return this.getAchievementValue(id) >= target; // Can claim next?
}

claimAchievement(id: string): boolean {
  if (!this.canClaimAchievement(id)) return false;
  const def = getAchievementDef(id);
  const newLevel = this.getAchievementClaimedLevel(id) + 1;
  const reward = getAchievementReward(def, newLevel);
  this.state.achievementProgress[id] = { claimedLevel: newLevel };
  this.addCurrency(getAchievementRewardType(def), reward);
  return true;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:5054–5091`

#### Паттерн: Migration Strategy — Backfill + Defaults

- **Почему:** backward-compatible load. Старые save без новых полей авто-заполняются initial default'ами; corrupted — бэкап.
- **Как работает:** `loadFromLocalStorage()` мержит saved over initial field-by-field. Новые поля → initial. Legacy saves без массивов (equipmentInventory, ownedMuses) или объектов (skills, raids) → fresh structures. Старые items получают `originRarity` = current rarity.

```typescript
const initial = this.getInitialState();
for (const key of Object.keys(initial) as (keyof GameState)[]) {
  if (key in saved && saved[key] !== undefined) {
    (this.state as any)[key] = saved[key]; // Load saved
  }
  // else: key stays as initial[key] (new field)
}

// Specific backfills
if (!Array.isArray(this.state.equipmentInventory)) {
  this.state.equipmentInventory = initial.equipmentInventory;
}
if (!this.state.lifetimeStats) {
  this.state.lifetimeStats = buildFromLegacy(qp, swords);
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:6210–6450`

#### Паттерн: Playtime-Based Starter Pack Expiration

- **Почему:** 48-часовой оффер основан на реальном playtime, а не wall-clock. Игрок не теряет оффер, если оставил вкладку на ночь.
- **Как работает:** `playtimeMs` инкрементится на 1000 каждую секунду, ТОЛЬКО если `document.visibilityState === "visible"`. `showStarterPack()` записывает `playtimeMs` на первое открытие; `canBuyStarterPack()` чекает `now - shownAtPlaytime <= 48h`.

```typescript
// Tick playtime while tab is visible
this.playtimeTimer = setInterval(() => {
  if (typeof document === "undefined" || document.visibilityState === "visible") {
    this.state.playtimeMs += 1000;
    this.markDirty();
  }
}, 1000);

// Check expiration
canBuyStarterPack(): boolean {
  const { shownAtPlaytime } = this.state.starterPack;
  if (!shownAtPlaytime) return false;
  const elapsedPlaytime = this.state.playtimeMs - shownAtPlaytime;
  return elapsedPlaytime <= STARTER_PACK_DURATION_MS; // 48h * 3.6e6
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:982–987, 4865–4875`

#### Паттерн: Idle Earnings Computed On-Demand

- **Почему:** нет фоновых таймеров, пока вкладка inactive. Earnings считаются один раз, когда игрок возвращается.
- **Как работает:** `getIdleDrops()` читает `Date.now() - state.idleDropsLastCollect`, считает прошедшие секунды, применяет damage formulas и spell multipliers. `collectIdleDrops()` применяет результат, обновляет timestamp. Cap на `MAX_IDLE_SECONDS` (~10 часов).

```typescript
getIdleDrops(nowMs: number = Date.now()): {
  const elapsedMs = Math.max(0, nowMs - this.state.idleDropsLastCollect);
  const cappedSec = Math.min(elapsedMs / 1000, MAX_IDLE_SECONDS); // Cap at ~10 hours
  const damage = this.getTotalDamage() * cappedSec; // Extend the curve
  const goldEarned = this.calculateIdleGold(damage);
  // Return {gold, gems, xp, pickaxes, stagesProgressed}
}

collectIdleDrops(bonusMultiplier: number = 1): {...} {
  const drops = this.getIdleDrops();
  this.state.gold += drops.gold * bonusMultiplier;
  // ... other currencies
  this.state.idleDropsLastCollect = Date.now();
  return { ...drops, gold: drops.gold * bonusMultiplier, ... };
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:5511–5606`

#### Паттерн: Seven-Day Rewards — Rolling Daily Tasks + Fixed Calendar

- **Почему:** разделение recurring tasks (daily roll, прогресс ресетится) и one-time бонусов (calendar claims за 7-day event).
- **Как работает:** `DAILY_TASK_POOL` имеет 11 задач; каждый день 7 ролятся (фильтр по unlocked features). Progress counters трекают инкременты. Calendar days 1..7 — fixed rewards, claimable once per day. Daily reset на UTC midnight.

```typescript
// Daily roll (7 tasks from pool of 11, filtered by unlocks)
ensureDailyRollFresh(): void {
  if (!isTodayNewDay()) return;
  const pool = DAILY_TASK_POOL.filter(t => !t.requires || playerHasFeature(t.requires));
  this.state.sevenDayRewards.dailyRoll = shuffleAndTake(pool, DAILY_TASKS_PER_ROLL);
  this.state.sevenDayRewards.dailyProgress = {}; // Reset counters
  this.state.sevenDayRewards.dailyClaimed = [];
}

// Task progress increments on relevant actions
bumpDailyProgress(key: DailyProgressKey, amount: number = 1): void {
  for (const id of this.state.sevenDayRewards.dailyRoll) {
    const def = DAILY_TASK_POOL.find(t => t.id === id);
    if (def?.progressKey === key) {
      this.state.sevenDayRewards.dailyProgress[id] += amount;
    }
  }
}

// Calendar is separate: fixed 7 days, one reward per day
claimCalendarDay(day: 1..7): boolean {
  if (this.isCalendarDayClaimed(day)) return false; // Persists across event
  const def = WEEKLY_CALENDAR_DAYS.find(d => d.day === day);
  this.grantWeeklyReward(def.rewardType, def.rewardAmount);
  this.state.sevenDayRewards.calendarClaimed.push(day);
  return true;
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts:4934–5008`

**Подводные камни:**

- Прямое чтение/запись полей state (`state.gems += 100`) минуя accessor: bypass emit/markDirty/audit. → Всегда через gateway-методы: `addCurrency`, `addXp`, `bumpLifetime`, `claimAchievement`.
- `emit()` в hot loop (per-frame): каждый emit markDirty + scheduleDebounce. → Батчите мутации, emit'те один раз.
- Assumption что lifetimeStats ресетится на prestige: ачивки сломаются. → Lifetime не ресетится. Для prestige-resettable — `questProgress`.
- Большие массивы в `equipmentInventory` или `digEvent.grid` без оглядки на quota: save fail silent после 3 shrink attempts. → Мониторьте size. Система пытается 3 варианта (drop dig grid, drop mine). Можно компрессить.
- Добавили новое поле в GameState без backfill: загруженный старый save имеет undefined. → В `loadFromLocalStorage()` чекайте `typeof newField !== "number"` → initial.
- `sevenDayRewards.dailyProgress` копится через дни. → `ensureDailyRollFresh()` в начале каждого дня сбрасывает counters.
- Idle earnings без cap: 1 год → overflow numeric fields. → `getIdleDrops()` cap на `MAX_IDLE_SECONDS` (~10h).
- Assumption что ачивки переживут wipe: `achievementProgress` — часть state, очищается. → Если нужно — отдельный localStorage key вне state.

**Чеклист при переносе в новый проект:**

- [ ] GameState interface с core полями: gold, gems, level, stage, swords, monsters, currencies, skills, quests, lifetimeStats, achievementProgress, transient (activeRaid).
- [ ] GameStore singleton, getter-методы для всех queries, mutation-методы для всех changes. Не expose'ить state напрямую.
- [ ] Save/load пайплайн в localStorage с envelope `{v, ts, crc, payload}`. CRC-32 на payload. На load — verify, backup corrupted.
- [ ] Debounced persistence: `markDirty()` → 500ms debounce. Page-hide + 30s fallback timer.
- [ ] `LifetimeStats` interface с never-reset счётчиками.
- [ ] Ачивки (15 × 10 уровней). Link через `progressKey`. Claim state отдельно в `achievementProgress`.
- [ ] Daily-Task: 7 задач из 11, фильтр по unlocks. `dailyProgress[id]`. Reset на UTC midnight.
- [ ] Weekly Calendar: 7 fixed days, one-time, persistент в `calendarClaimed`.
- [ ] Guided-Quest: JSON catalog, claimed IDs, gate по stage.
- [ ] Equipment: rarity-upgrade с originRarity, level (cap L50), merge promotion (4/4 → rarity++, level halved). Stats read-time.
- [ ] Starter Pack: `playtimeMs` инкрементится при visible. 48h expiration.
- [ ] Idle-Drops on-demand. Cap на 10h.
- [ ] IAP → bump `iapCount`. Capacitor bridge на Android.
- [ ] Migration: merge saved over initial field-by-field. Backfill массивов/объектов. originRarity для items.
- [ ] Bridge `bumpLifetime()` → `bumpDailyProgress()` через `LIFETIME_TO_DAILY_KEY`.
- [ ] `wipeAndReload()` отключает saves, очищает state и localStorage, reload.
- [ ] Тестировать large saves (>5MB), quota shrinking, CRC detection с corrupted save.

---

### 7. Сборка и мобильная упаковка

**Зачем:** обеспечить две различные сборки (dev с hot reload и API proxy, prod с console stripping и asset versioning), а также упаковку через Capacitor в нативные APK/IPA. Интеграция с нативными плагинами (LevelPlay rewarded ads на iOS, BillingPlugin на Android).

**Ключевые файлы:**
- `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts` — `getAssetVersion()` + `getBuildVersion()`, dev middleware, esbuild console drop, `@shared` alias.
- `/home/agent/Pixel-Dungeon/phaser-client/package.json` — скрипты dev/build/android/ios.
- `/home/agent/Pixel-Dungeon/phaser-client/capacitor.config.ts` — `webDir: dist`, `appId: com.pixeldungeon.idlenew`, `appName: 1001 Swords`.
- `/home/agent/Pixel-Dungeon/phaser-client/tsconfig.json` — `@shared` alias на `../shared`.
- `/home/agent/Pixel-Dungeon/phaser-client/index.html` — splash logger, safe-area CSS var, version placeholder.
- `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts` — `__ASSET_V__` инжекция в URL.
- `/home/agent/Pixel-Dungeon/phaser-client/scripts/copy-assets.mjs` — pre-build asset minimization.
- `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/LevelPlayAdsPlugin.swift` — iOS Capacitor плагин.
- `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/Info.plist.additions.xml` — GADApplicationIdentifier, 27 SKAdNetworks.
- `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/podfile-additions.rb` — IronSource SDK + 7 mediation adapters.
- `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/SETUP.md` — пошаговая iOS-инструкция.
- `/home/agent/Pixel-Dungeon/shared/skinConfigs.ts` — кросс-граничный экспорт скинов.

**Паттерны:**

#### Паттерн: Asset Version Stamping (Runtime Cache-Buster)

- **Почему:** заменяет ручной bump в `BootScene` каждый раз, когда артисты экспортируют ассет. Каждый коммит и rebuild имеют уникальный URL.
- **Как работает:** `getAssetVersion()` считает short git SHA + dirty marker + epoch sec. Внедряется как `__ASSET_V__` через Vite `define`. `BootScene` читает его и клеит `?v=` к каждому URL.

```typescript
// vite.config.ts
function getAssetVersion(): string {
  let sha = "nogit";
  let dirty = "";
  try {
    sha = execSync("git rev-parse --short=7 HEAD", { stdio: [...] })
      .toString().trim();
    const status = execSync("git status --porcelain", { stdio: [...] })
      .toString().trim();
    if (status) dirty = "d";
  } catch { /* not a git checkout */ }
  return `${sha}${dirty}${Math.floor(Date.now() / 1000)}`;
}

// BootScene.ts
const V = `?v=${__ASSET_V__}`;
this.load.image("raid_banner_gold", `/raid-art/banners/gold_banner.png${V}`);
this.load.spritesheet("cal_frog_hop", `/attached_assets/calendar/frog_hop.png${V}`, {
  frameWidth: 128,
  frameHeight: 128,
});
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts`

#### Паттерн: Splash Screen Version Stamping (Build-Time Marker)

- **Почему:** показывает версию (App Store version + git SHA + timestamp) на splash во время cold start. Тестеры различают prod от dev.
- **Как работает:** `getBuildVersion()` читает `MARKETING_VERSION` из `ios/App/App.xcodeproj/project.pbxproj` через regex. Vite-плагин `stamp-splash-version` `transformIndexHtml` заменяет placeholder в `<div id="splash-version">`.

```typescript
// vite.config.ts
function getBuildVersion(): string {
  let marketing = "?";
  try {
    const pbx = fs.readFileSync(path.resolve(__dirname, "ios/App/App.xcodeproj/project.pbxproj"), "utf8");
    const m = pbx.match(/MARKETING_VERSION\s*=\s*([\d.]+)/);
    if (m) marketing = m[1];
  } catch { /* ignore — keep "?" */ }
  let sha = "nogit";
  let dirty = "";
  try {
    sha = execSync("git rev-parse --short=7 HEAD", ...).toString().trim();
    const status = execSync("git status --porcelain", ...).toString().trim();
    if (status) dirty = "+";
  } catch { /* not a git checkout */ }
  const stamp = new Date().toISOString().slice(5, 19).replace("T", " "); // "MM-DD HH:MM:SS"
  return `v${marketing} · ${sha}${dirty} · ${stamp}`;
}

// Plugin transforms index.html at build time
{
  name: "stamp-splash-version",
  transformIndexHtml(html) {
    return html.replace(/(<div id="splash-version">)[^<]*(<\/div>)/, `$1${getBuildVersion()}$2`);
  },
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts`

#### Паттерн: Dev-Only Asset Middleware (No-Cache Headers)

- **Почему:** артисты в dev итерируют по PNG и видят свежие пиксели на hard refresh. Middleware стрипает querystrings и сервит из `../client/assets`, `../attached_assets`, `public/locations` с no-cache headers.
- **Как работает:** Vite `configureServer` хук регистрирует middleware. Он чекает URL: `/client-assets/`, `/sword-assets/`, `/locations/` → разные source dirs. Файлы стримятся с `Cache-Control: no-cache`. Только в dev.

```typescript
// vite.config.ts
{
  name: "serve-game-assets",
  configureServer(server) {
    const clientAssetsRoot = path.resolve(__dirname, "../client/assets");
    const attachedAssetsRoot = path.resolve(__dirname, "../attached_assets");
    const locationsRoot = path.resolve(__dirname, "public/locations");

    server.middlewares.use((req, res, next) => {
      let filePath: string | null = null;
      const urlPath = req.url ? req.url.split("?")[0] : ""; // Strip ?v=<hash>

      if (urlPath.startsWith("/client-assets/")) {
        filePath = path.join(clientAssetsRoot, decodeURIComponent(urlPath.replace("/client-assets/", "")));
      } else if (urlPath.startsWith("/sword-assets/")) {
        filePath = path.join(attachedAssetsRoot, decodeURIComponent(urlPath.replace("/sword-assets/", "")));
      } else if (urlPath.startsWith("/locations/")) {
        filePath = path.join(locationsRoot, decodeURIComponent(urlPath.replace("/locations/", "")));
      }

      if (filePath && fs.existsSync(filePath)) {
        res.setHeader("Cache-Control", "no-cache, max-age=0, must-revalidate");
        fs.createReadStream(filePath).pipe(res);
        return;
      }
      next();
    });
  },
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts`

#### Паттерн: Console/Debugger Stripping in Production

- **Почему:** iOS WKWebView роутит console через inspector channel; даже без inspector сериализация аргументов + native dispatch жрут CPU/батарею. Сохраняем `warn`/`error` для crash-reporting, остальное no-op.
- **Как работает:** Vite esbuild minify с `drop: ['console', 'debugger']`. AST-уровень убирает все `console.*` (кроме warn/error) и debugger statements.

```typescript
// vite.config.ts
build: {
  minify: "esbuild",
},
esbuild: {
  drop: ["console", "debugger"],
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts`

#### Паттерн: API Proxy Middleware (Dev Only)

- **Почему:** dev фронт на :8080, бэкенд на :5000. CORS блокирует `fetch('/api/...')` без серверной конфигурации. Vite proxy транспарентно форвардит.
- **Как работает:** `server.proxy: { '/api': 'http://localhost:5000' }`. Любой `/api/*` форвардится. В prod это no-op (Capacitor контейнер).

```typescript
// vite.config.ts
server: {
  port: 8080,
  host: "0.0.0.0",
  proxy: {
    "/api": "http://localhost:5000",
  },
  fs: {
    allow: [".", ".."],
  },
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts`

#### Паттерн: Capacitor Mobile Packaging Flow

- **Почему:** Capacitor оборачивает web-app в нативные контейнеры. Три шага гарантируют, что web-bundle актуален, нативный слой видит новый код, устройство запускает app для тестирования.
- **Как работает:** `npm run android` / `npm run ios` цепляют: (1) `tsc && vite build` → `dist/`, (2) `cap sync <platform>` → копирует `dist/` в нативный проект и запускает pod install / gradle sync, (3) `cap run <platform>` → собирает APK/IPA и устанавливает.

```json
// package.json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "android": "npm run build && cap sync android && cap run android",
  "ios": "npm run build && cap sync ios && cap run ios"
}

// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'com.pixeldungeon.idlenew',
  appName: '1001 Swords',
  webDir: 'dist'
};
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/package.json`

#### Паттерн: Shared Path Alias (@shared)

- **Почему:** balance + skin definitions живут в `../shared`, чтобы и Phaser-клиент, и Express-бэкенд читали один source of truth. Alias `@shared` устраняет relative-path traversal.
- **Как работает:** `tsconfig.json` определяет `baseUrl: '.'` и `paths: { '@shared/*': ['../shared/*'] }`. TypeScript резолвит `@shared` в `../shared`. `include` явно перечисляет shared-файлы. Vite уважает alias автоматически.

```json
// tsconfig.json
"baseUrl": ".",
"paths": {
  "@shared/*": ["../shared/*"]
},
"include": ["src/**/*", "../shared/balance.ts", "../shared/configs.ts",
            "../shared/gameConfigs.ts", "../shared/skinConfigs.ts",
            "../shared/digEventConfig.ts"],
```

```typescript
// BootScene.ts
import { DEFAULT_SKIN_CONFIGS } from "@shared/skinConfigs";
import * as SWORD_ORDER_MODULE from "@shared/swordOrder";

// Later in loadSkinPortraits()
for (const s of DEFAULT_SKIN_CONFIGS) {
  this.load.image(`skin_${s.id}`, `/skin-assets/${s.tier}/${s.id}.png`);
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/tsconfig.json`

#### Паттерн: iOS Native Plugin Integration (LevelPlay Ads)

- **Почему:** rewarded video идут через native SDK (IronSource LevelPlay). Capacitor не может вызывать native API напрямую. Swift-плагин оборачивает API и экспозит методы из JS.
- **Как работает:** `LevelPlayAdsPlugin.swift` — CAPPlugin subclass, реализует `ISInitializationDelegate` и `ISRewardedVideoDelegate`. `@objc` методы принимают `CAPPluginCall`, зовут IronSource API, резолвят call с JSObject. `LevelPlayAdsPlugin.m` — header-only ObjC bridge с макросом `CAP_PLUGIN`. SETUP.md описывает копирование файлов и сборку.

```swift
// LevelPlayAdsPlugin.swift
@objc(LevelPlayAdsPlugin)
public class LevelPlayAdsPlugin: CAPPlugin,
                                 ISInitializationDelegate,
                                 ISRewardedVideoDelegate,
                                 ISImpressionDataDelegate {
  private static let APP_KEY = "252c4b91d"

  @objc func `init`(_ call: CAPPluginCall) {
    if initialized {
      var r = JSObject()
      r["initialized"] = true
      call.resolve(r)
      return
    }
    IronSource.setMetaData("is_test_suite", value: "enable")
    IronSource.initWithAppKey(LevelPlayAdsPlugin.APP_KEY,
                              adUnits: [IS_REWARDED_VIDEO],
                              delegate: self)
  }

  @objc func showRewardedAd(_ call: CAPPluginCall) {
    let placement = call.getString("placement") ?? "default"
    if IronSource.hasRewardedVideo() {
      IronSource.showRewardedVideo(with: vc, placement: placement)
    }
  }
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/LevelPlayAdsPlugin.swift`

#### Паттерн: Asset Minimization for Production (copy-assets.mjs)

- **Почему:** repo содержит 100s артов, но prod использует подмножество. `copy-assets.mjs` (до vite build) селективно зеркалит только нужное.
- **Как работает:** скрипт enumerit hardcoded списки путей и зовёт `copyFileSync`. Не `rmSync` destination — git-tracked файлы не сносятся. Pre-build печатает stats.

```typescript
// scripts/copy-assets.mjs
function copyClient(rel) {
  const src = join(clientAssetsSrc, rel);
  const dst = join(clientAssetsDst, rel);
  if (copy(src, dst)) copiedClient++;
}

// Hardcoded asset lists
const monsterIds = [10,11,12,13,15,17,18,19,20,21,22,23,24,26,27,28,30,31,32,33,34,35,37,39,40,41];
for (const id of monsterIds) {
  const padded = String(id).padStart(3, "0");
  copyClient(`images/monster_${padded}.png`);
}

const directions = ["north","south","east","west","north-east","north-west","south-east","south-west"];
for (const dir of directions) {
  for (let f = 0; f < 6; f++) copyClient(`sprites/hero/walk_${dir}_${f}.png`);
}
```

- **Где смотреть:** `/home/agent/Pixel-Dungeon/phaser-client/scripts/copy-assets.mjs`

**Подводные камни:**

- Не запустили `copy-assets.mjs` до `npm run build`: ассеты, которые BootScene пытается грузить, отсутствуют в `dist/`. → Добавить в build-script: `node scripts/copy-assets.mjs && tsc && vite build` или Vite-плагин hook.
- Hardcode `__ASSET_V__` или версии в BootScene: следующие билды overwrite'нут. → Никогда не хардкодьте; читайте `__ASSET_V__` в runtime. Force commit или wait for next build.
- Добавили новый скин в BootScene без `copy-assets.mjs`: текстура не грузится. → Добавьте скин в hardcoded loop в copy-assets. Тестируйте в dev (middleware), потом rebuild.
- Модифицировали iOS plugin без re-pod install / не добавили .m в Build Phases: JS calls фейлят с `plugin not found`. → Убедитесь, что .m в Build Phases → Compile Sources. `pod install --repo-update`.
- Добавили новый ad network в Info.plist без pod в Podfile: pod install ok, adapter не инициализится. → Add both: pod entry + SKAdNetworkIdentifier.
- `rmSync public/` до copy-assets: сносит git-tracked файлы. → Никогда не сносите wholesale. `copy-assets.mjs` только overwrite.
- Забыли `@shared` alias в sibling package: import фейлит. → Каждый package с `@shared` имеет alias в tsconfig.
- `npm run android` / `ios` без build: app installs, но preload висит на 0%. → Скрипты уже цепляют build перед cap sync.
- Изменили `__ASSET_V__` формат, забыли что старые URLs с новым форматом не инвалидируются. → Формат должен быть стабильным и unique на rebuild.

**Чеклист при переносе в новый проект:**

- [ ] `vite.config.ts` с `getAssetVersion()` (SHA + dirty + epoch), define `__ASSET_V__`.
- [ ] `getBuildVersion()` читает MARKETING_VERSION из pbxproj, плагин `stamp-splash-version`.
- [ ] `serve-game-assets` middleware с no-cache headers (dev only).
- [ ] esbuild `drop: ['console', 'debugger']`.
- [ ] `server.proxy: { '/api': 'http://localhost:5000' }`.
- [ ] tsconfig.json с `baseUrl: '.'`, `paths: { '@shared/*': ['../shared/*'] }`. Include shared-файлы.
- [ ] package.json: dev (vite), build (tsc && vite build), android/ios (build && cap sync && cap run).
- [ ] capacitor.config.ts: appId, appName, webDir.
- [ ] index.html: safe-area var, splash logger `window.__splashLog`, version placeholder, type=module.
- [ ] copy-assets.mjs с hardcoded списками per категория.
- [ ] iOS: LevelPlayAdsPlugin.swift + .m bridge, SETUP.md, podfile-additions.rb, Info.plist.additions.xml.
- [ ] `main.ts`: CrashOverlay, BackgroundLifecycle, DPR scaling, Capacitor safe-area.
- [ ] BootScene.ts: `__ASSET_V__` в URLs, applyPixelArtFilter selectively.

---

## Контрольный список для бутстрапа новой игры

1. `npm create vite@latest my-game -- --template vanilla-ts` — стартовый проект на Vite + TS.
2. `cd my-game && npm install phaser phaser3-rex-plugins` — основной engine.
3. `npm install -D @types/node` для node-API в `vite.config.ts` (execSync, fs, path).
4. `npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/app @capacitor/haptics` — мобильный shell.
5. `npx cap init "My Game" "com.example.mygame" --web-dir=dist` — инициализация Capacitor.
6. Создать структуру папок: `src/{scenes,entities,ui,store,balance,data,lifecycle,tutorial,services,constants}`, `public/{client-assets,sword-assets,locations,attached_assets,balance,skin-assets,fonts}`, `shared/`, `scripts/`, `ios-templates/`.
7. Создать `tsconfig.json` с `strict: true`, `baseUrl: "."`, `paths: { "@shared/*": ["../shared/*"] }`, include для нужных shared-файлов.
8. Создать `vite.config.ts` с `getAssetVersion()` (SHA+dirty+epoch), define `__ASSET_V__`, `serve-game-assets` middleware, esbuild drop console, server.proxy на бэкенд.
9. Создать `src/constants/theme.ts` с `GameColors`, `GameColorsHex`, `FontFamily`, `FontSize`, `Spacing`.
10. Создать `src/lifecycle/BackgroundLifecycle.ts` — singleton с listeners на `visibilitychange`, `pagehide`, Capacitor App.
11. Создать `src/main.ts` с Phaser game config, регистрация всех сцен (Boot → Battle → Header → TabBar → Tutorial → вкладки), интеграция `BackgroundLifecycle` с `game.loop.sleep/wake`.
12. Создать `shared/gameConfigs.ts` с типами и `DEFAULT_PETS`, `DEFAULT_BOOSTS`, `DEFAULT_SKINS` и т.д.
13. Создать `src/store/balanceConstants.ts` с мутируемыми объектами для rarity, sets, upgrade costs.
14. Создать `src/store/GameStore.ts` — central singleton с GameState, getters/setters, `markDirty()`, `flushNow()`, CRC envelope save, debounced persistence, gateway `addCurrency`/`bumpLifetime`.
15. Создать `src/balance/loader.ts` — RFC-4180 CSV parser, `setByPath`, `parseValue`, apply*-функции, `fetchText` с AbortController.
16. Создать `scripts/dump-balance-to-csv.ts` — flatten в dot-notation, pipe-separated массивы, round-trip регенератор.
17. Создать `scripts/copy-assets.mjs` — hardcoded списки путей, `copyFileSync` без `rmSync`.
18. Создать `src/scenes/BootScene.ts` — preload dispatcher с `?v=${__ASSET_V__}`, watchdog для зависшего loader, `applyPixelArtFilter()` с NEAREST для pixel-art префиксов, `loadBalanceFromCsv().finally(() => GameStore.init())`.
19. Создать `src/scenes/BattleScene.ts` — постоянная сцена, `update()` с update Hero/Sword/Monster + enter-latch коллизия + `applyDamageToMonster` + deferred kill cascade через `delayedCall(0, ...)`.
20. Создать `src/entities/Hero.ts` — manual 6-frame walk-cycle, 8 directions, walk-to-target.
21. Создать `src/entities/Sword.ts` — orbital math в `updatePosition(delta)`, `flashOnHit()`.
22. Создать `src/entities/Monster.ts` — spritesheet анимация с per-instance jitter, `takeDamage`, `die`.
23. Создать `src/ui/DamagePopup.ts` — пул на сцену, max 24 per kind, manual easing в POST_UPDATE.
24. Создать `src/ui/HealthBar.ts` — Graphics-based бар, обновление в monster.update, цветовой шифт.
25. Создать `src/ui/CoinAnimation.ts` — quadratic Bézier, precomputed coin texture.
26. Создать `src/ui/Button3D.ts` — zone-over-graphics, press scale tween.
27. Создать `src/ui/CloseButton.ts` — универсальная × кнопка.
28. Создать `src/ui/GameHeader.ts` — HUD с dirty-flagging, кэш last-rendered, POST_UPDATE flush.
29. Создать `src/scenes/HeaderScene.ts` — минимальная обёртка над `new GameHeader(this)`.
30. Создать `src/ui/TabBar.ts` и `src/scenes/TabBarScene.ts` — нижняя навигация с sleep/wake, special-case BattleScene (active + invisible).
31. Создать `src/tutorial/modalLifecycle.ts` — `bindContainerModalLifecycle()`, `bindSceneModalLifecycle()`, GameStore push/pop modals.
32. Создать `src/scenes/TutorialOverlayScene.ts` — слушает GameStore events, скрывает стрелки при активных модалках.
33. Создать вкладки: `HeroScene`, `PetScene`, `ShopScene`, `TownScene` с listener cleanup в SHUTDOWN.
34. Создать под-сцены: `MineScene`, `TavernScene` через `scene.launch/wake`, bringToTop Header/TabBar после.
35. Создать `index.html` с safe-area CSS var, `<div id="splash">`, inline `window.__splashLog`, version placeholder.
36. Добавить `stamp-splash-version` Vite plugin с `getBuildVersion()` чтобы версия писалась в splash.
37. Сборка web-bundle: `npm run build` → `dist/`.
38. Добавить нативные платформы: `npx cap add android` и `npx cap add ios`.
39. Скопировать `ios-templates/LevelPlayAdsPlugin.{swift,m}` в `ios/App/App/`, добавить в Xcode Build Phases. `pod install`.
40. Добавить package.json scripts: `"android": "npm run build && cap sync android && cap run android"`, `"ios": "npm run build && cap sync ios && cap run ios"`.
41. Первая сборка: `npm run android` → APK устанавливается на эмулятор. Проверить, что splash показывает версию, BootScene грузится, BattleScene запускается.
42. Тестировать CSV-balance: положить простой `public/balance/scalars.csv`, изменить значение, перезагрузить и убедиться, что в коде применилось.

## Известные грабли (общие)

- **scene.start() вместо launch/wake**: уничтожает все сущности. Используйте launch для новых, wake для спящих.
- **Listeners не отписываются в SHUTDOWN**: продолжают палить, leaks, ошибки в коллбеках. Трекаем массивом + manual `GameStore.off()`.
- **AudioManager и timers не destroy'ятся**: AudioContext копится (Chromium cap 6), timers палят при HMR. Явно `destroy()` в SHUTDOWN.
- **Tweens для орбит мечей**: 8 одновременных Tween, мешают instant rearrange. Hand-math `updatePosition(delta)`.
- **Damage без enter-latch**: 60 хитов/сек × 8 мечей = 480× DPS multiplier. `swordCollidingWith` + per-monster cooldown.
- **Per-frame Text/Tween аллокация**: GC пузы каждые ~5 сек. Пулинг + dirty-flagging.
- **Kill cascade синхронно**: stall 80-150 мс. `delayedCall(0, callback)` для косметики.
- **Pause при hidden**: offline progress ломается. `update()` всегда работает.
- **PNG обновили, но не bumpнули frameWidth/frameHeight**: garbage. Sync в одном коммите.
- **`+append` без `+repage`**: Phaser читает только первый кадр. Всегда `+repage`.
- **Edit PNG в public/, не bumpнули `?v=`**: браузер держит старую текстуру. `__ASSET_V__` или manual bump.
- **`pixelArt: true` глобально**: ломает text rendering на Android WebView. Texture-key-based filter.
- **CSV-rename `imageKey` без `dump-balance`**: старое значение в CSV перетирает новое. Всегда dump после переименования.
- **CSV-loader после `GameStore.init()`**: новые балансы не применяются. `.finally(() => init())` гарантирует timing.
- **State мутация без gateway-метода**: bypass emit/markDirty. Всегда через `addCurrency`/`bumpLifetime`.
- **`emit()` в hot loop**: каждый emit markDirty. Батчите.
- **Lifetime stats assumption reset**: ачивки сломаются. Lifetime never resets.
- **`rmSync public/`**: сносит git-tracked. `copy-assets.mjs` только overwrite.
- **Modify iOS plugin без re-pod install**: JS calls фейлят. `pod install --repo-update`.
- **Add ad network в Info.plist без pod**: adapter не инициализится. Add both.
- **Forgot to copy-assets перед build**: prod-bundle без нужных файлов.
- **Direct Graphics interactive**: не поддерживается. Zone-over-graphics.
- **Tap старый таб с открытой под-сценой**: zones блокируют ввод. `closeOpenSubScenes()` в switchTab.
- **`scene.bringToTop()` каждый кадр**: depth flicker. Один раз после launch/wake.
- **Modal без `bindContainerModalLifecycle`**: туториал рисуется поверх. Регистрируйте в стеке.
- **Modal clicks bubble**: dimZone не закрывает / закрывает не то. Trinity: dimZone(interactive), dim graphics, cardZone(interactive).
- **Hardcode colors/sizes**: theming невозможен. theme.ts.

## Ссылки на справочные файлы в репозитории

| Пилон | Файл | Что внутри |
|---|---|---|
| Сцены | `/home/agent/Pixel-Dungeon/phaser-client/src/main.ts` | Phaser config, регистрация сцен, BackgroundLifecycle |
| Сцены | `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BootScene.ts` | Preload, animations, launch overlay'ев, балансер finally |
| Сцены | `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/BattleScene.ts` | Update loop, mode FSM, listeners cleanup |
| Сцены | `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/TownScene.ts` | Пример вкладки с launch sub-scene + cleanup |
| Сцены | `/home/agent/Pixel-Dungeon/phaser-client/src/lifecycle/BackgroundLifecycle.ts` | visibilitychange/pagehide/Capacitor App singleton |
| Сцены | `/home/agent/Pixel-Dungeon/phaser-client/src/tutorial/modalLifecycle.ts` | Bind модалок в GameStore стек |
| Бой | `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Sword.ts` | Orbital math, updatePosition, flashOnHit |
| Бой | `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Monster.ts` | Spritesheet idle с jitter, takeDamage, die |
| Бой | `/home/agent/Pixel-Dungeon/phaser-client/src/entities/Hero.ts` | Manual 6-frame walk cycle, skin disable anim |
| Бой | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DamagePopup.ts` | Пул на сцену, POST_UPDATE manual easing |
| Бой | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/HealthBar.ts` | Graphics-based HP-бар |
| Бой | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/CoinAnimation.ts` | Quadratic Bézier, precomputed coin texture |
| Спрайты | `/home/agent/Pixel-Dungeon/phaser-client/vite.config.ts` | getAssetVersion, dev middleware |
| Спрайты | `/home/agent/Pixel-Dungeon/phaser-client/scripts/copy-assets.mjs` | Build-time зеркало |
| Спрайты | `/home/agent/Pixel-Dungeon/phaser-client/src/data/locations.ts` | LOCATIONS array, getStageMonsterTextureKey |
| Спрайты | `/home/agent/Pixel-Dungeon/shared/swordOrder.ts` | SWORD_LEVEL_TO_PATH |
| Спрайты | `/home/agent/Pixel-Dungeon/phaser-client/SPRITE_OPTIMIZATION.md` | ImageMagick пайплайн |
| Баланс | `/home/agent/Pixel-Dungeon/phaser-client/src/balance/loader.ts` | CSV parser + apply*-функции |
| Баланс | `/home/agent/Pixel-Dungeon/phaser-client/src/store/balanceConstants.ts` | Mutable defaults |
| Баланс | `/home/agent/Pixel-Dungeon/shared/gameConfigs.ts` | Типы и DEFAULT_* |
| Баланс | `/home/agent/Pixel-Dungeon/phaser-client/scripts/dump-balance-to-csv.ts` | Round-trip регенератор |
| Баланс | `/home/agent/Pixel-Dungeon/phaser-client/BALANCE_REFERENCE.md` | Формулы и кривые |
| Баланс | `/home/agent/Pixel-Dungeon/phaser-client/ECONOMY_BALANCE.md` | Доходы/расходы per currency |
| UI | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/Button3D.ts` | Канонический zone-over-graphics |
| UI | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/TabBar.ts` | Sleep/wake, под-сцены |
| UI | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/GameHeader.ts` | Dirty-flagging HUD |
| UI | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/DropsPopup.ts` | Сложная модалка с grid |
| UI | `/home/agent/Pixel-Dungeon/phaser-client/src/ui/SummonRevealAnimation.ts` | Pop-in + arc reveal |
| UI | `/home/agent/Pixel-Dungeon/phaser-client/src/constants/theme.ts` | Design tokens |
| Состояние | `/home/agent/Pixel-Dungeon/phaser-client/src/store/GameStore.ts` | Central singleton, save/load, events |
| Состояние | `/home/agent/Pixel-Dungeon/phaser-client/src/data/achievements.ts` | 15 ачивок × 10 уровней |
| Состояние | `/home/agent/Pixel-Dungeon/phaser-client/src/data/guidedQuestsService.ts` | Quest JSON |
| Состояние | `/home/agent/Pixel-Dungeon/phaser-client/src/scenes/StarterPackScene.ts` | Playtime-based 48h оффер |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/package.json` | dev/build/android/ios scripts |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/capacitor.config.ts` | appId, webDir |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/tsconfig.json` | @shared alias |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/index.html` | Splash, safe-area, version placeholder |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/LevelPlayAdsPlugin.swift` | iOS Capacitor plugin |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/SETUP.md` | Step-by-step iOS setup |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/Info.plist.additions.xml` | GADApplicationIdentifier, 27 SKAdNetworks |
| Сборка | `/home/agent/Pixel-Dungeon/phaser-client/ios-templates/podfile-additions.rb` | IronSource + adapters |