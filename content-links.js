/**
 * SafeWeb Pro - Проверка ссылок на всех сайтах
 */

class LinkChecker {
  constructor() {
    this.hoverTimer = null;
    this.currentLink = null;
    this.tooltip = null;
    this.checkedLinks = new Set();
    this.init();
  }

  init() {
    this.createTooltip();
    this.setupListeners();
    this.setupObserver();
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.id = 'safeweb-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      z-index: 999999;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      pointer-events: none;
      display: none;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255,255,255,0.1);
    `;
    document.body.appendChild(this.tooltip);
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
    }, 500);
  }

  onLinkLeave() {
    if (this.hoverTimer) {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
    }
    this.hideTooltip();
    this.currentLink = null;
  }

  onLinkClick(e) {
    const link = e.target.closest('a');
    if (!link || !link.href) return;
    
    try {
      const url = new URL(link.href);
      const domain = url.hostname.replace(/^www\./, '');
      const status = link.dataset.safewebStatus;
      
      if (status === 'not-safe') {
        e.preventDefault();
        e.stopPropagation();
        
        this.showWarning(link, domain);
        return false;
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
    
    link.dataset.safewebStatus = result.safe;
    
    // Добавляем визуальную индикацию
    if (result.safe === 'not-safe') {
      link.style.borderBottom = '2px solid #ef4444';
    } else if (result.safe === 'safe') {
      link.style.borderBottom = '2px solid #10b981';
    }
    
    this.tooltip.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
        <span style="color: ${color}; font-size: 14px;">${icon}</span>
        <span style="font-weight: 500;">${text}</span>
      </div>
      <div style="font-size: 11px; opacity: 0.9;">
        ${new URL(link.href).hostname}
      </div>
      ${result.details?.c ? `
        <div style="margin-top: 4px; font-size: 10px; opacity: 0.7;">
          Категория: ${result.details.c}
        </div>
      ` : ''}
    `;
    
    // Позиционируем тултип
    const rect = link.getBoundingClientRect();
    const tooltipWidth = 250;
    const tooltipHeight = 80;
    
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
      this.tooltip.style.display = 'none';
    }
  }

  showWarning(link, domain) {
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
        backdrop-filter: blur(4px);
      ">
        <div style="
          background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
          border-radius: 16px;
          padding: 32px;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          border: 1px solid rgba(239, 68, 68, 0.3);
          animation: fadeIn 0.3s;
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 64px; color: #ef4444; margin-bottom: 20px;">⚠️</div>
            <h3 style="margin: 0 0 12px 0; color: white; font-size: 24px; font-weight: 600;">
              Опасная ссылка
            </h3>
            <p style="color: #9ca3af; font-size: 14px; font-family: monospace;">
              ${domain}
            </p>
          </div>
          
          <div style="
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 28px;
          ">
            <p style="margin: 0; color: #fca5a5; font-size: 14px; line-height: 1.5;">
              ⚠️ Эта ссылка может вести на фишинговый сайт.<br>
              <strong>Не вводите личные данные, пароли или платежную информацию!</strong>
            </p>
          </div>
          
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
              Остаться в безопасности
            </button>
            <button id="safeweb-continue" style="
              flex: 1;
              padding: 16px;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              border: none;
              border-radius: 12px;
              color: white;
              font-weight: 500;
              cursor: pointer;
              font-size: 14px;
              transition: all 0.2s;
            ">
              Перейти (опасно)
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    document.getElementById('safeweb-cancel').addEventListener('click', () => {
      warning.remove();
    });
    
    document.getElementById('safeweb-continue').addEventListener('click', () => {
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

// Запускаем на всех страницах, кроме самих предупреждений
if (!window.location.href.includes('chrome-extension://')) {
  // Запускаем с задержкой для предотвращения конфликтов
  setTimeout(() => {
    new LinkChecker();
  }, 1000);
}