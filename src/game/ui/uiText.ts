import type { WeaponCategoryId, WeaponUpgradeStatId } from '../data/weaponData';

export type LocaleId = 'ru' | 'en';

type UiTextTable = {
  localeName: string;
  tabs: Record<'fight' | 'equip' | 'upgrades' | 'shop', string>;
  screens: Record<'fight' | 'equip' | 'upgrades' | 'shop', string>;
  stats: {
    stage: string;
    best: string;
    soft: string;
    hard: string;
    kills: string;
    base: string;
    mounted: string;
    dps: string;
    cells: string;
    damageShort: string;
    rateShort: string;
    shotsShort: string;
    speedShort: string;
  };
  fight: {
    autoRunning: string;
  };
  equip: {
    armoryStock: string;
    dragToGrid: string;
    needMoreSoft: string;
    dragHint: string;
  };
  shop: {
    rollSet: string;
    comingSoon: string;
    reroll: string;
  };
  upgrades: {
    baseTitle: string;
    durability: string;
    cell: string;
    rareRoll: string;
    owned: string;
    locked: string;
    totalLevel: string;
    level: string;
    unlock: string;
    max: string;
    baseTrait: string;
    upgraded: string;
    statEffects: Record<WeaponUpgradeStatId, (level: number) => string>;
  };
  weaponCategories: Record<WeaponCategoryId, string>;
  weaponStats: Record<WeaponUpgradeStatId, string>;
  settings: {
    title: string;
    language: string;
    currentLanguage: string;
    switchLanguage: string;
    devTools: string;
  };
  cheats: {
    title: string;
    button: string;
    showBounds: string;
    hideBounds: string;
    roadBounds: string;
    leftShort: string;
    rightShort: string;
    boundLeft: string;
    boundRight: string;
    soft: string;
    stage: string;
    base: string;
  };
  buttons: {
    settings: string;
  };
  messages: {
    notEnoughSoft: string;
    weaponNoFit: string;
    upgradeBought: string;
    upgradeUnavailable: string;
  };
};

const STORAGE_KEY = 'surv.locale';

const TEXT_TABLES: Record<LocaleId, UiTextTable> = {
  ru: {
    localeName: 'Русский',
    tabs: {
      fight: 'Бой',
      equip: 'Снаряжение',
      upgrades: 'Улучшения',
      shop: 'Магазин',
    },
    screens: {
      fight: 'Бой с зомби',
      equip: 'Сетка оружия',
      upgrades: 'Улучшения',
      shop: 'Магазин',
    },
    stats: {
      stage: 'Этап',
      best: 'Рекорд',
      soft: 'Крышки',
      hard: 'Жетоны',
      kills: 'Убито',
      base: 'База',
      mounted: 'Оружие',
      dps: 'DPS',
      cells: 'Клетки',
      damageShort: 'УРН',
      rateShort: 'СКР',
      shotsShort: 'ВЫСТ',
      speedShort: 'СКОР',
    },
    fight: {
      autoRunning: 'Автобой идет',
    },
    equip: {
      armoryStock: 'Склад оружия',
      dragToGrid: 'Перетащи на сетку',
      needMoreSoft: 'Не хватает крышек',
      dragHint: 'Перетащи оружие на сетку',
    },
    shop: {
      rollSet: 'Поставка',
      comingSoon: 'Ассортимент магазина появится после настройки боевого цикла.',
      reroll: 'Обновить',
    },
    upgrades: {
      baseTitle: 'База',
      durability: 'Прочность',
      cell: 'Клетка',
      rareRoll: 'Качество',
      owned: 'Куплено',
      locked: 'Закрыто',
      totalLevel: 'Общий ур.',
      level: 'Ур.',
      unlock: 'Открыть',
      max: 'МАКС',
      baseTrait: 'базовый эффект',
      upgraded: 'улучшено',
      statEffects: {
        damage: (level) => `+${level * 16}% урона`,
        fireRate: (level) => `+${level * 5.5}% темпа`,
        handling: (level) => `+${level * 7.5}% скорости`,
        special: (level) => (level === 0 ? 'базовый эффект' : `+${Math.floor((level + 1) / 2)} выстр.`),
      },
    },
    weaponCategories: {
      pistols: 'Пистолеты',
      shotguns: 'Дробовики',
      rifles: 'Винтовки',
      energy: 'Энергия',
      heavy: 'Тяжелое',
    },
    weaponStats: {
      damage: 'Урон',
      fireRate: 'Скорострельность',
      handling: 'Управляемость',
      special: 'Особенность',
    },
    settings: {
      title: 'Настройки',
      language: 'Язык',
      currentLanguage: 'Русский',
      switchLanguage: 'English',
      devTools: 'Отладка',
    },
    cheats: {
      title: 'Отладка',
      button: 'Читы',
      showBounds: 'Показать границы',
      hideBounds: 'Скрыть границы',
      roadBounds: 'Границы дороги',
      leftShort: 'Л',
      rightShort: 'П',
      boundLeft: 'Левая',
      boundRight: 'Правая',
      soft: '+1000',
      stage: '+5 этапов',
      base: '+100 база',
    },
    buttons: {
      settings: 'Настройки',
    },
    messages: {
      notEnoughSoft: 'Не хватает крышек',
      weaponNoFit: 'Оружие не помещается',
      upgradeBought: 'Улучшение куплено',
      upgradeUnavailable: 'Не хватает крышек или максимум',
    },
  },
  en: {
    localeName: 'English',
    tabs: {
      fight: 'Fight',
      equip: 'Equip',
      upgrades: 'Upgrades',
      shop: 'Shop',
    },
    screens: {
      fight: 'Zombie Fight',
      equip: 'Equip Grid',
      upgrades: 'Upgrades',
      shop: 'Shop',
    },
    stats: {
      stage: 'Stage',
      best: 'Best',
      soft: 'Caps',
      hard: 'Tokens',
      kills: 'Kills',
      base: 'Base',
      mounted: 'Mounted',
      dps: 'DPS',
      cells: 'Cells',
      damageShort: 'DMG',
      rateShort: 'RATE',
      shotsShort: 'SHOTS',
      speedShort: 'SPD',
    },
    fight: {
      autoRunning: 'Auto fight running',
    },
    equip: {
      armoryStock: 'Armory Stock',
      dragToGrid: 'Drag to grid',
      needMoreSoft: 'Need more caps',
      dragHint: 'Drag a weapon onto the grid',
    },
    shop: {
      rollSet: 'Supply roll',
      comingSoon: 'Shop inventory will arrive after the core fight loop.',
      reroll: 'Reroll',
    },
    upgrades: {
      baseTitle: 'Base',
      durability: 'Durability',
      cell: 'Grid Cell',
      rareRoll: 'Quality',
      owned: 'Owned',
      locked: 'Locked',
      totalLevel: 'Total Lv',
      level: 'Lv',
      unlock: 'Unlock',
      max: 'MAX',
      baseTrait: 'base trait',
      upgraded: 'upgraded',
      statEffects: {
        damage: (level) => `+${level * 16}% damage`,
        fireRate: (level) => `+${level * 5.5}% rate`,
        handling: (level) => `+${level * 7.5}% speed`,
        special: (level) => (level === 0 ? 'base trait' : `+${Math.floor((level + 1) / 2)} shots`),
      },
    },
    weaponCategories: {
      pistols: 'Pistols',
      shotguns: 'Shotguns',
      rifles: 'Rifles',
      energy: 'Energy',
      heavy: 'Heavy',
    },
    weaponStats: {
      damage: 'Damage',
      fireRate: 'Fire Rate',
      handling: 'Handling',
      special: 'Special',
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      currentLanguage: 'English',
      switchLanguage: 'Русский',
      devTools: 'Dev Tools',
    },
    cheats: {
      title: 'Dev Cheats',
      button: 'Cheats',
      showBounds: 'Show Bounds',
      hideBounds: 'Hide Bounds',
      roadBounds: 'Road Bounds',
      leftShort: 'L',
      rightShort: 'R',
      boundLeft: 'Left',
      boundRight: 'Right',
      soft: '+1000',
      stage: '+5 Stage',
      base: '+100 Base',
    },
    buttons: {
      settings: 'Settings',
    },
    messages: {
      notEnoughSoft: 'Not enough caps',
      weaponNoFit: 'Weapon does not fit there',
      upgradeBought: 'Upgrade bought',
      upgradeUnavailable: 'Not enough caps or maxed out',
    },
  },
};

let currentLocale: LocaleId = readInitialLocale();

export const UI_TEXT: UiTextTable = { ...TEXT_TABLES[currentLocale] };

export function getLocale(): LocaleId {
  return currentLocale;
}

export function setLocale(locale: LocaleId): void {
  currentLocale = locale;
  Object.assign(UI_TEXT, TEXT_TABLES[currentLocale]);
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore unavailable storage.
  }
}

export function toggleLocale(): LocaleId {
  const nextLocale: LocaleId = currentLocale === 'ru' ? 'en' : 'ru';
  setLocale(nextLocale);
  return nextLocale;
}

function readInitialLocale(): LocaleId {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'ru' ? stored : 'ru';
  } catch {
    return 'ru';
  }
}
