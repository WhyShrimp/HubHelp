/**
 * SafeWeb Pro - Background Service Worker
 * Центральная база данных и логика проверки
 */

// Полная база безопасных сайтов
let SAFE_SITES_DB = {
  // Социальные сети
  "youtube.com": {n:"YouTube", c:"Видео", t:["видео", "стриминг", "развлечение"]},
  "instagram.com": {n:"Instagram", c:"Соцсети", t:["фото", "видео", "соцсеть"]},
  "tiktok.com": {n:"TikTok", c:"Видео", t:["видео", "короткие", "тренды"]},
  "facebook.com": {n:"Facebook", c:"Соцсети", t:["соцсеть", "общение", "новости"]},
  "twitter.com": {n:"Twitter", c:"Соцсети", t:["новости", "микроблог", "тренды"]},
  "discord.com": {n:"Discord", c:"Соцсети", t:["общение", "игры", "комьюнити"]},
  "telegram.org": {n:"Telegram", c:"Соцсети", t:["мессенджер", "безопасность", "каналы"]},
  "reddit.com": {n:"Reddit", c:"Соцсети", t:["форум", "обсуждения", "сообщество"]},
  "linkedin.com": {n:"LinkedIn", c:"Работа", t:["работа", "сеть", "бизнес"]},
  "vk.com": {n:"VK", c:"Соцсети", t:["российское", "соцсеть", "мессенджер"]},

  // Видео и стриминг
  "twitch.tv": {n:"Twitch", c:"Видео", t:["стриминг", "игры", "трансляции"]},
  "netflix.com": {n:"Netflix", c:"Видео", t:["фильмы", "сериалы", "стриминг"]},
  "rutube.ru": {n:"Rutube", c:"Видео", t:["российское", "видео", "стриминг"]},
  "vimeo.com": {n:"Vimeo", c:"Видео", t:["видео", "креатив", "качество"]},

  // Игры
  "steampowered.com": {n:"Steam", c:"Игры", t:["платформа", "игры", "магазин"]},
  "epicgames.com": {n:"Epic Games", c:"Игры", t:["платформа", "игры", "бесплатно"]},
  "roblox.com": {n:"Roblox", c:"Игры", t:["игры", "создание", "мультиплеер"]},
  "minecraft.net": {n:"Minecraft", c:"Игры", t:["игра", "песочница", "креатив"]},
  "leagueoflegends.com": {n:"League of Legends", c:"Игры", t:["игра", "киберспорт", "моба"]},

  // Покупки
  "amazon.com": {n:"Amazon", c:"Покупки", t:["маркетплейс", "доставка", "электроника"]},
  "aliexpress.com": {n:"AliExpress", c:"Покупки", t:["маркетплейс", "китай", "дешево"]},
  "wildberries.ru": {n:"Wildberries", c:"Покупки", t:["российское", "одежда", "маркетплейс"]},
  "ozon.ru": {n:"Ozon", c:"Покупки", t:["российское", "маркетплейс", "доставка"]},
  "booking.com": {n:"Booking.com", c:"Покупки", t:["отели", "путешествия", "бронирование"]},

  // Работа и образование
  "github.com": {n:"GitHub", c:"Работа", t:["код", "репозитории", "разработка"]},
  "stackoverflow.com": {n:"Stack Overflow", c:"Работа", t:["вопросы", "ответы", "программирование"]},
  "coursera.org": {n:"Coursera", c:"Образование", t:["курсы", "образование", "университеты"]},
  "udemy.com": {n:"Udemy", c:"Образование", t:["курсы", "обучение", "навыки"]},
  "habr.com": {n:"Habr", c:"Работа", t:["программирование", "статьи", "сообщество"]},

  // Поиск и справочники
  "google.com": {n:"Google", c:"Поиск", t:["поиск", "браузер", "сервисы"]},
  "wikipedia.org": {n:"Wikipedia", c:"Энциклопедия", t:["знания", "статьи", "справочник"]},
  "yandex.ru": {n:"Яндекс", c:"Поиск", t:["поиск", "россия", "сервисы"]},

  // ИИ и технологии
  "chat.openai.com": {n:"ChatGPT", c:"ИИ", t:["искусственный интеллект", "чат", "помощник"]},
  "figma.com": {n:"Figma", c:"Дизайн", t:["дизайн", "прототипы", "коллаборация"]},

  // Музыка
  "spotify.com": {n:"Spotify", c:"Музыка", t:["музыка", "подкасты", "стриминг"]},
  "soundcloud.com": {n:"SoundCloud", c:"Музыка", t:["музыка", "аудио", "независимые"]},

  // Новости
  "bbc.com": {n:"BBC", c:"Новости", t:["новости", "медиа", "англия"]},
  "ria.ru": {n:"РИА Новости", c:"Новости", t:["новости", "россия", "агентство"]},

  // Облако и хранение
  "drive.google.com": {n:"Google Drive", c:"Облако", t:["облако", "документы", "хранилище"]},
  "dropbox.com": {n:"Dropbox", c:"Облако", t:["облако", "синхронизация", "файлы"]},

  // Карты
  "maps.google.com": {n:"Google Maps", c:"Карты", t:["карты", "навигация", "панорамы"]},
  
  // Дизайн
  "behance.net": {n:"Behance", c:"Дизайн", t:["дизайн", "портфолио", "креатив"]},
  
  // Фото
  "unsplash.com": {n:"Unsplash", c:"Фото", t:["фото", "сток", "бесплатно"]},

  // Образование
  "khanacademy.org": {n:"Khan Academy", c:"Образование", t:["образование", "бесплатно", "курсы"]},

  // Разработка
  "developer.mozilla.org": {n:"MDN Web Docs", c:"Разработка", t:["документация", "web", "разработка"]},

  // Путешествия
  "airbnb.com": {n:"Airbnb", c:"Путешествия", t:["жилье", "путешествия", "аренда"]},

  // Финансы
  "paypal.com": {n:"PayPal", c:"Финансы", t:["платежи", "деньги", "безопасность"]},

  // Здоровье
  "headspace.com": {n:"Headspace", c:"Здоровье", t:["медитация", "здоровье", "ментальное"]},

  // Продуктивность
  "notion.so": {n:"Notion", c:"Продуктивность", t:["организация", "заметки", "проекты"]},

  // Безопасность
  "haveibeenpwned.com": {n:"Have I Been Pwned", c:"Безопасность", t:["безопасность", "пароли", "утечки"]},

  // Разное
  "canva.com": {n:"Canva", c:"Дизайн", t:["дизайн", "графика", "просто"]},
  "zoom.us": {n:"Zoom", c:"Видео", t:["конференции", "видео", "встречи"]},
  "whatsapp.com": {n:"WhatsApp", c:"Мессенджер", t:["мессенджер", "общение", "шифрование"]}
};

// Опасные паттерны
const DANGEROUS_PATTERNS = [
  "rnicrosoft",
  "microsoft-verify",
  "microsoft-security",
  "microsoft-login",
  "googie",
  "goog1e",
  "google-verify",
  "google-security",
  "sberbank-verify",
  "tinkoff-security",
  "alfabank-login",
  "-security.",
  "-verify.",
  "-login.",
  "-update.",
  "account-verification",
  "secure-login"
];

// Кэш проверенных доменов
const domainCache = new Map();

/**
 * Проверить безопасность домена
 */
function checkDomainSafety(domain) {
  // Проверяем кэш
  if (domainCache.has(domain)) {
    return domainCache.get(domain);
  }
  
  const result = {
    safe: "unknown",
    reason: "",
    details: null
  };
  
  // Приводим к нижнему регистру
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '');
  
  // 1. Проверка на опасные паттерны
  const isDangerous = DANGEROUS_PATTERNS.some(pattern => 
    cleanDomain.includes(pattern.toLowerCase())
  );
  
  if (isDangerous) {
    result.safe = "not-safe";
    result.reason = "Обнаружен фишинговый паттерн";
    result.details = { type: "phishing", pattern: "dangerous" };
    domainCache.set(domain, result);
    return result;
  }
  
  // 2. Проверка на безопасные сайты
  if (SAFE_SITES_DB[cleanDomain]) {
    result.safe = "safe";
    result.reason = "Проверенный безопасный сайт";
    result.details = SAFE_SITES_DB[cleanDomain];
    domainCache.set(domain, result);
    return result;
  }
  
  // 3. Проверка поддоменов безопасных сайтов
  const parts = cleanDomain.split('.');
  if (parts.length > 2) {
    for (let i = 1; i < parts.length; i++) {
      const parentDomain = parts.slice(i).join('.');
      if (SAFE_SITES_DB[parentDomain]) {
        result.safe = "safe";
        result.reason = "Поддомен безопасного сайта";
        result.details = SAFE_SITES_DB[parentDomain];
        domainCache.set(domain, result);
        return result;
      }
    }
  }
  
  // 4. Неизвестный сайт
  result.safe = "unknown";
  result.reason = "Сайт не проверен";
  result.details = null;
  
  domainCache.set(domain, result);
  return result;
}

/**
 * Очистить кэш
 */
function clearCache() {
  domainCache.clear();
  console.log("Кэш очищен");
}

/**
 * Обработчик сообщений
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("BG: Received request", request.action);
  
  try {
    switch (request.action) {
      case "checkDomain":
        const safety = checkDomainSafety(request.domain);
        sendResponse({ success: true, result: safety });
        break;
        
      case "getAllSites":
        sendResponse({ 
          success: true, 
          sites: SAFE_SITES_DB,
          patterns: DANGEROUS_PATTERNS,
          cacheSize: domainCache.size,
          totalSites: Object.keys(SAFE_SITES_DB).length
        });
        break;
        
      case "getStats":
        const categories = new Set(Object.values(SAFE_SITES_DB).map(site => site.c));
        sendResponse({
          success: true,
          stats: {
            totalSafe: Object.keys(SAFE_SITES_DB).length,
            totalCategories: categories.size,
            totalPatterns: DANGEROUS_PATTERNS.length,
            cacheSize: domainCache.size
          }
        });
        break;
        
      case "clearCache":
        clearCache();
        sendResponse({ success: true, message: "Кэш очищен" });
        break;
        
      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error("BG: Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true;
});

// Инициализация
console.log("✅ SafeWeb Pro Background инициализирован");
console.log("📊 Безопасных сайтов:", Object.keys(SAFE_SITES_DB).length);
console.log("🚫 Паттернов фишинга:", DANGEROUS_PATTERNS.length);