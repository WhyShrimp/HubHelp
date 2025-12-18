/**
 * SafeWeb Pro - Проверка ссылок на всех сайтах
 */

class LinkChecker {
  constructor() {
    this.hoverTimer = null;
    this.currentLink = null;
    this.tooltip = null;
    this.checkedLinks = new Set();
    this.userSettings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.createTooltip();
    this.setupListeners();
    this.setupObserver();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getSettings' },
        (response) => {
          if (response?.success) {
            this.userSettings = response.settings;
          }
          resolve();
        }
      );
    });
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'safeweb-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      z-index: 999999;
      max-width: 300px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      pointer-events: none;
      display: none;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      animation: fadeIn 0.2s ease;
    `;
    document.body.appendChild(this.tooltip);
    
    // Добавляем стили анимации
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(5px); }
      }
    `;
    document.head.appendChild(style);
  }

  setupListeners() {
    // Добавляем обработчики на существующие ссылки
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      this.addLinkListeners(link);
    });
  }

  addLinkListeners(link) {
    if (this.checkedLinks.has(link)) return;
    this.checkedLinks.add(link);
    
    link.addEventListener('mouseenter', (e) => {
      this.onLinkHover(e.target);
    });
    
    link.addEventListener('mouseleave', () => {
      this.onLinkLeave();
    });
    
    link.addEventListener('click', (e) => {
      this.onLinkClick(e);
    });
  }

  async onLinkHover(link) {
    this.currentLink = link;
    
    // Очищаем таймер
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    
    // Запускаем проверку с задержкой
    this.hoverTimer = setTimeout(async () => {
      try {
        const url = new URL(link.href);
        const domain = url.hostname.replace(/^www\./, '');
        
        // Пропускаем проверку текущего сайта
        if (domain === window.location.hostname.replace(/^www\./, '')) {
          return;
        }
        
        // Проверяем, не скрыто ли предупреждение для этого домена
        if (this.userSettings.hideWarnings && this.userSettings.hideWarnings[domain]) {
          return;
        }
        
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: 'checkDomain', domain: domain },
            resolve
          );
        });
        
        if (response?.success) {
          this.showTooltip(link, response.result);
        }
      } catch (error) {
        // Игнорируем ошибки парсинга URL
      }
    }, 300);
  }

  onLinkLeave() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.hideTooltip();
    this.currentLink = null;
  }

  async onLinkClick(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    
    try {
      const url = new URL(link.href);
      const domain = url.hostname.replace(/^www\./, '');
      
      // Пропускаем, если предупреждение скрыто
      if (this.userSettings.hideWarnings && this.userSettings.hideWarnings[domain]) {
        return true;
      }
      
      // Проверяем безопасность
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: 'checkDomain', domain: domain },
          resolve
        );
      });
      
      if (response?.success) {
        const result = response.result;
        
        // Обновляем статистику
        chrome.runtime.sendMessage({
          action: 'updateStats',
          domain: domain,
          result: result
        });
        
        // Показываем предупреждение для опасных или неизвестных сайтов
        if (result.safe === 'not-safe' || 
            (result.safe === 'unknown' && this.userSettings.showUnknownWarnings)) {
          e.preventDefault();
          e.stopPropagation();
          
          this.showWarning(link, result);
          return false;
        }
      }
    } catch {
      // Некорректный URL
    }
    
    return true;
  }

  showTooltip(link, result) {
    if (!this.tooltip || !this.currentLink || this.currentLink !== link) return;
    
    let color, icon, text;
    
    switch(result.safe) {
      case 'safe':
        color = '#10b981';
        icon = '✅';
        text = 'Безопасный сайт';
        break;
      case 'not-safe':
        color = '#ef4444';
        icon = '⚠️';
        text = 'ОПАСНО: ' + (result.reason || 'Фишинг');
        break;
      default:
        color = '#f59e0b';
        icon = '❓';
        text = 'Неизвестный сайт';
    }
    
    // Добавляем информацию о запрете в РФ
    if (result.blockedInRU) {
      color = '#ef4444';
      icon = '🚫';
      text = 'Запрещен в РФ';
    }
    
    link.dataset.safewebStatus = result.safe;
    
    // Добавляем визуальную индикацию
    if (result.safe === 'not-safe' || result.blockedInRU) {
      link.style.borderBottom = '2px solid #ef4444';
    } else if (result.safe === 'safe') {
      link.style.borderBottom = '2px solid #10b981';
    } else if (result.safe === 'unknown') {
      link.style.borderBottom = '2px solid #f59e0b';
    }
    
    this.tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="color: ${color}; font-size: 16px;">${icon}</span>
        <span style="font-weight: 600; font-size: 14px;">${text}</span>
      </div>
      <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">
        ${new URL(link.href).hostname}
      </div>
      ${result.blockedInRU ? `
        <div style="font-size: 11px; color: #fca5a5; margin-top: 4px;">
          🚫 ${result.details?.reason || 'Запрещен в РФ'}
        </div>
      ` : ''}
      ${result.details?.c ? `
        <div style="margin-top: 6px; font-size: 11px; opacity: 0.7;">
          📁 Категория: ${result.details.c}
        </div>
      ` : ''}
    `;
    
    // Позиционируем тултип
    const rect = link.getBoundingClientRect();
    const tooltipWidth = 280;
    const tooltipHeight = this.tooltip.offsetHeight;
    
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    let top = rect.bottom + 10;
    
    // Если не влезает снизу, показываем сверху
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - 10;
    }
    
    // Корректируем по горизонтали
    if (left < 10) left = 10;
    if (left + tooltipWidth > window.innerWidth - 10) {
      left = window.innerWidth - tooltipWidth - 10;
    }
    
    this.tooltip.style.left = `${Math.round(left)}px`;
    this.tooltip.style.top = `${Math.round(top)}px`;
    this.tooltip.style.display = 'block';
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        if (this.tooltip) {
          this.tooltip.style.display = 'none';
          this.tooltip.style.animation = '';
        }
      }, 200);
    }
  }

  showWarning(link, result) {
    const domain = new URL(link.href).hostname;
    const isUnknown = result.safe === 'unknown';
    const isBlocked = result.blockedInRU;
    
    const warning = document.createElement('div');
    warning.className = 'safeweb-warning-modal';
    warning.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000000;
        padding: 20px;
        backdrop-filter: blur(8px);
      ">
        <div style="
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          border-radius: 16px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          border-top: 6px solid ${isUnknown ? '#f59e0b' : isBlocked ? '#ef4444' : '#ef4444'};
          animation: fadeIn 0.3s;
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 64px; color: ${isUnknown ? '#f59e0b' : isBlocked ? '#ef4444' : '#ef4444'}; margin-bottom: 20px;">
              ${isUnknown ? '❓' : isBlocked ? '🚫' : '⚠️'}
            </div>
            <h3 style="margin: 0 0 12px 0; color: white; font-size: 24px; font-weight: 600;">
              ${isBlocked ? 'Запрещенный сайт' : isUnknown ? 'Неизвестный сайт' : 'Опасная ссылка'}
            </h3>
            <p style="color: #9ca3af; font-size: 14px; font-family: monospace; word-break: break-all;">
              ${domain}
            </p>
          </div>
          
          <div style="
            background: ${isUnknown ? 'rgba(245, 158, 11, 0.1)' : isBlocked ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.1)'};
            border: 1px solid ${isUnknown ? 'rgba(245, 158, 11, 0.3)' : isBlocked ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 28px;
          ">
            <p style="margin: 0; color: ${isUnknown ? '#fcd34d' : '#fca5a5'}; font-size: 14px; line-height: 1.5;">
              ${isBlocked ? 
                `🚫 Этот сайт запрещен на территории РФ.<br><strong>Доступ ограничен законодательством.</strong>` :
                isUnknown ?
                `❓ Этот сайт не проверен в нашей базе безопасности.<br><strong>Будьте осторожны при вводе личных данных!</strong>` :
                `⚠️ Эта ссылка может вести на фишинговый сайт.<br><strong>Не вводите личные данные, пароли или платежную информацию!</strong>`
              }
              ${result.reason ? `<br>📝 ${result.reason}` : ''}
            </p>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 12px;">
            ${isUnknown ? `
              <label style="display: flex; align-items: center; gap: 8px; color: #9ca3af; font-size: 13px; cursor: pointer;">
                <input type="checkbox" id="safeweb-hide-unknown" style="cursor: pointer;">
                Не показывать это предупреждение для неизвестных сайтов
              </label>
            ` : ''}
            
            <div style="display: flex; gap: 16px;">
              <button id="safeweb-cancel" style="
                flex: 1;
                padding: 16px;
                background: #374151;
                border: 1px solid #4b5563;
                border-radius: 12px;
                color: #d1d5db;
                font-weight: 500;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
              ">
                Вернуться назад
              </button>
              <button id="safeweb-continue" style="
                flex: 1;
                padding: 16px;
                background: linear-gradient(135deg, ${isUnknown ? '#f59e0b' : isBlocked ? '#ef4444' : '#ef4444'} 0%, ${isUnknown ? '#d97706' : isBlocked ? '#dc2626' : '#dc2626'} 100%);
                border: none;
                border-radius: 12px;
                color: white;
                font-weight: 500;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.2s;
              ">
                Я знаю что делаю
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // Кнопка отмены
    document.getElementById('safeweb-cancel').addEventListener('click', () => {
      warning.remove();
    });
    
    // Кнопка продолжения
    document.getElementById('safeweb-continue').addEventListener('click', () => {
      const hideUnknown = document.getElementById('safeweb-hide-unknown');
      
      // Если стоит галочка "Не показывать для неизвестных сайтов"
      if (hideUnknown && hideUnknown.checked && isUnknown) {
        chrome.runtime.sendMessage({
          action: 'updateSettings',
          settings: { showUnknownWarnings: false }
        });
      }
      
      warning.remove();
      window.location.href = link.href;
    });
    
    // Добавляем стили для анимации
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(style);
  }

  setupObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.tagName === 'A' && node.href?.startsWith('http')) {
              this.addLinkListeners(node);
            }
            const links = node.querySelectorAll('a[href^="http"]');
            links.forEach(link => this.addLinkListeners(link));
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

// Запускаем на всех страницах
if (!window.location.href.includes('chrome-extension://')) {
  setTimeout(() => {
    new LinkChecker();
  }, 1000);
}