/**
* Файл: content.js
* SafeWeb Pro - Инжекция индикаторов безопасности в Google Search
*/

class GoogleSearchIndicator {
  constructor() {
    this.sitesData = {};
    this.checkedDomains = new Map();
    this.observerActive = false;
    this.init();
  }

  async init() {
    try {
      // Ждем загрузки DOM
      await this.waitForDOM();
      
      // Загружаем базу данных
      await this.loadDatabase();
      
      // Обрабатываем текущие результаты
      this.processSearchResults();
      
      // Наблюдаем за новыми результатами (infinite scroll)
      this.observeNewResults();
      
      console.log('🛡️ SafeWeb Pro - инициализирован на странице поиска Google');
    } catch (error) {
      console.error('Init error:', error);
    }
  }

  waitForDOM() {
    return new Promise(resolve => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', resolve);
      } else {
        resolve();
      }
    });
  }

  async loadDatabase() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getAllSites' },
        (response) => {
          if (response && response.sites) {
            this.sitesData = response.sites;
          }
          resolve();
        }
      );
    });
  }

  /**
  * Обработать все результаты поиска на странице
  */
  processSearchResults() {
    // Google использует data-sokoban-container для результатов поиска
    const searchResults = document.querySelectorAll('div[data-sokoban-container]');
    if (searchResults.length === 0) {
      // Старая версия Google - ищем по другому селектору
      const oldResults = document.querySelectorAll('g-card-container');
      oldResults.forEach(card => this.processResultCard(card));
    } else {
      searchResults.forEach(container => {
        this.processResultCard(container);
      });
    }
  }

  /**
  * Обработать отдельную карточку результата
  */
  processResultCard(cardElement) {
    try {
      // Пытаемся найти ссылку в результате
      const linkElement = cardElement.querySelector('a[href]');
      if (!linkElement || !linkElement.href) {
        return;
      }

      // Извлекаем домен из URL
      const url = linkElement.href;
      const domain = this.extractDomain(url);
      if (!domain) {
        return;
      }

      // Проверяем статус безопасности
      const status = this.checkDomainSafety(domain);

      // Ищем элемент с названием сайта
      const titleElement = cardElement.querySelector('h3, [role="heading"]');
      if (titleElement) {
        // Добавляем индикатор рядом с названием
        this.addIndicator(titleElement, status);

        // Также добавляем на саму ссылку для наглядности
        this.highlightLink(linkElement, status);
      }
    } catch (error) {
      console.error('Error processing card:', error);
    }
  }

  /**
  * Извлечь домен из URL
  */
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      let domain = urlObj.hostname.replace(/^www\./, '').toLowerCase();
      return domain;
    } catch (e) {
      return null;
    }
  }

  /**
  * Проверить безопасность домена
  */
  checkDomainSafety(domain) {
    // Проверяем кеш
    if (this.checkedDomains.has(domain)) {
      return this.checkedDomains.get(domain);
    }

    let status = 'unknown'; // неизвестно (жёлтый)

    // Прямое совпадение
    if (this.sitesData[domain]) {
      status = 'safe'; // зелёный
    } else {
      // Проверяем поддомены
      const parts = domain.split('.');
      if (parts.length > 2) {
        for (let i = 1; i < parts.length; i++) {
          const parentDomain = parts.slice(i).join('.');
          if (this.sitesData[parentDomain]) {
            status = 'safe';
            break;
          }
        }
      }
    }

    // Проверяем подозрительные паттерны
    if (this.looksLikeBait(domain)) {
      status = 'danger'; // красный
    }

    this.checkedDomains.set(domain, status);
    return status;
  }

  /**
  * Проверить подозрительные паттерны
  */
  looksLikeBait(domain) {
    const suspiciousPatterns = [
      /phishing/i,
      /scam/i,
      /fake/i,
      /verify/i,
      /confirm/i,
      /security-check/i,
      /update-required/i,
      /account-verification/i,
    ];
    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }

  /**
  * Добавить визуальный индикатор
  */
  addIndicator(titleElement, status) {
    // Проверяем, чтобы не добавить дубликат
    if (titleElement.querySelector('.safeweb-indicator')) {
      return;
    }

    // Определяем цвет и текст
    let color, text, title;
    switch(status) {
      case 'safe':
        color = '#10b981'; // зелёный
        text = '●';
        title = '✓ Безопасный сайт';
        break;
      case 'danger':
        color = '#ef4444'; // красный
        text = '●';
        title = '⚠️ Подозрительный сайт';
        break;
      case 'unknown':
      default:
        color = '#f59e0b'; // жёлтый
        text = '●';
        title = '? Неизвестный сайт';
    }

    // Создаём индикатор
    const indicator = document.createElement('span');
    indicator.className = 'safeweb-indicator';
    indicator.textContent = text;
    indicator.style.cssText = `
      display: inline-block;
      width: 12px;
      height: 12px;
      background-color: ${color};
      border-radius: 50%;
      margin-left: 8px;
      margin-right: 4px;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 0 8px ${color}80;
      vertical-align: middle;
    `;
    indicator.title = title;
    indicator.setAttribute('data-safeweb-status', status);

    // Добавляем эффект при наведении
    indicator.addEventListener('mouseenter', (e) => {
      e.target.style.transform = 'scale(1.5)';
      e.target.style.boxShadow = `0 0 12px ${color}`;
    });

    indicator.addEventListener('mouseleave', (e) => {
      e.target.style.transform = 'scale(1)';
      e.target.style.boxShadow = `0 0 8px ${color}80`;
    });

    // Вставляем индикатор в начало заголовка
    titleElement.insertBefore(indicator, titleElement.firstChild);
  }

  /**
  * Подсветить саму ссылку
  */
  highlightLink(linkElement, status) {
    let borderColor = '#f59e0b'; // жёлтый по умолчанию
    switch(status) {
      case 'safe':
        borderColor = '#10b981';
        break;
      case 'danger':
        borderColor = '#ef4444';
        break;
    }

    // Добавляем левую границу для визуального выделения
    linkElement.style.borderLeft = `3px solid ${borderColor}`;
    linkElement.style.paddingLeft = '8px';
    linkElement.style.transition = 'all 0.2s ease';
    linkElement.addEventListener('mouseenter', (e) => {
      e.target.style.borderLeftWidth = '4px';
      e.target.style.paddingLeft = '7px';
    });
    linkElement.addEventListener('mouseleave', (e) => {
      e.target.style.borderLeftWidth = '3px';
      e.target.style.paddingLeft = '8px';
    });
  }

  /**
  * Наблюдать за новыми результатами (infinite scroll)
  */
  observeNewResults() {
    if (this.observerActive) {
      return;
    }

    // Ищем контейнер с результатами
    const resultsContainer = document.querySelector('#rso') ||
      document.querySelector('[role="main"]') ||
      document.body;

    if (!resultsContainer) {
      return;
    }

    const observer = new MutationObserver((mutations) => {
      // Обрабатываем только новые добавленные элементы
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            // Проверяем, не результат ли поиска
            if (node.matches && node.matches('[data-sokoban-container], g-card-container')) {
              this.processResultCard(node);
            }

            // Проверяем потомков
            const cards = node.querySelectorAll('[data-sokoban-container], g-card-container');
            cards.forEach(card => this.processResultCard(card));
          }
        });
      });
    });

    const observerConfig = {
      childList: true,
      subtree: true,
      attributes: false,
    };

    observer.observe(resultsContainer, observerConfig);
    this.observerActive = true;
    console.log('🛡️ SafeWeb Pro - Observer активирован для динамической загрузки');
  }
}

// Инициализируем расширение только на страницах Google Search
if (window.location.hostname.includes('google.')) {
  // Ждём полной загрузки DOM перед инициализацией
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new GoogleSearchIndicator();
    });
  } else {
    new GoogleSearchIndicator();
  }
}