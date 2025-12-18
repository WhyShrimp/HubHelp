/**
 * SafeWeb Pro - Индикаторы безопасности в поисковых системах
 */

class SearchSafety {
  constructor() {
    this.initialized = false;
    this.init();
  }

  async init() {
    if (this.initialized) return;
    
    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.start());
    } else {
      this.start();
    }
  }

  async start() {
    try {
      console.log('🔍 SafeWeb: Инициализация на поисковой странице');
      
      // Обрабатываем существующие результаты
      this.processAllResults();
      
      // Наблюдаем за новыми результатами
      this.setupObserver();
      
      this.initialized = true;
    } catch (error) {
      console.error('SafeWeb init error:', error);
    }
  }

  processAllResults() {
    // Универсальные селекторы для поисковых систем
    const selectors = [
      // Google
      '.g',
      'div[data-sokoban-container]',
      'a[href*="http"] h3',
      
      // Яндекс
      '.serp-item',
      '.organic__url',
      '.link_theme_outer',
      
      // Bing
      '.b_algo',
      '.b_title h2',
      
      // DuckDuckGo
      '.result',
      '.result__title'
    ];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        setTimeout(() => this.processResult(element), 100);
      });
    });
  }

  processResult(element) {
    try {
      // Находим ближайшую ссылку
      let linkElement = element.closest('a[href]') || element.querySelector('a[href]');
      if (!linkElement && element.tagName === 'A') {
        linkElement = element;
      }
      
      if (!linkElement || !linkElement.href) return;
      
      const url = new URL(linkElement.href);
      const domain = url.hostname.replace(/^www\./, '');
      
      // Проверяем безопасность
      this.checkAndMark(linkElement, domain);
      
    } catch (error) {
      // Игнорируем ошибки парсинга
    }
  }

  async checkAndMark(link, domain) {
    try {
      // Пропускаем внутренние ссылки поисковиков
      if (domain.includes('google') || domain.includes('yandex') || 
          domain.includes('bing') || domain.includes('duckduckgo')) {
        return;
      }
      
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'checkDomain', domain: domain },
          resolve
        );
      });
      
      if (response?.success) {
        this.addIndicator(link, response.result);
      }
    } catch (error) {
      console.warn('SafeWeb check error:', error);
    }
  }

  addIndicator(element, result) {
    // Проверяем, не добавлен ли уже индикатор
    if (element.querySelector('.safeweb-indicator')) return;
    
    let indicator;
    
    // Ищем заголовок рядом со ссылкой
    const titleElement = element.querySelector('h3, h2, [role="heading"]') || 
                        element.parentElement?.querySelector('h3, h2') ||
                        element;
    
    // Создаем индикатор
    indicator = document.createElement('span');
    indicator.className = 'safeweb-indicator';
    
    let color, text, tooltip;
    
    switch(result.safe) {
      case 'safe':
        color = '#10b981';
        text = '✓';
        tooltip = 'Безопасный сайт';
        break;
      case 'not-safe':
        color = '#ef4444';
        text = '⚠️';
        tooltip = result.reason || 'Опасный сайт';
        break;
      default:
        color = '#f59e0b';
        text = '?';
        tooltip = 'Неизвестный сайт';
    }
    
    indicator.innerHTML = `
      <span style="
        display: inline-block;
        width: 16px;
        height: 16px;
        background: ${color};
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 16px;
        font-size: 10px;
        margin-left: 8px;
        vertical-align: middle;
        cursor: help;
        box-shadow: 0 0 4px ${color}80;
        transition: transform 0.2s;
      " title="${tooltip}">${text}</span>
    `;
    
    // Добавляем индикатор рядом с заголовком
    if (titleElement && titleElement.parentNode) {
      titleElement.parentNode.insertBefore(indicator, titleElement.nextSibling);
    } else if (element.parentNode) {
      element.parentNode.insertBefore(indicator, element.nextSibling);
    }
    
    // Подсвечиваем опасные ссылки
    if (result.safe === 'not-safe') {
      element.style.opacity = '0.7';
      element.style.borderLeft = '3px solid #ef4444';
      element.style.paddingLeft = '8px';
      
      // Добавляем подтверждение при клике
      const originalClick = element.onclick;
      element.onclick = (e) => {
        if (!confirm(`⚠️ ВНИМАНИЕ!\n\nВы собираетесь перейти на потенциально опасный сайт:\n${domain}\n\n${result.reason}\n\nПродолжить?`)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        if (originalClick) return originalClick.call(element, e);
        return true;
      };
    }
  }

  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            setTimeout(() => this.processResult(node), 100);
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Запускаем на поисковых страницах
if (window.location.hostname.match(/(google|yandex|bing|duckduckgo)\./)) {
  new SearchSafety();
}