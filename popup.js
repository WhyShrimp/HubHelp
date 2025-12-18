/**
 * Попап SafeWeb Pro
 */

class SafeWebProPopup {
  constructor() {
    this.currentUrl = null;
    this.currentDomain = null;
    this.allSitesData = {};
    this.blockedDomains = [];
    this.isDarkMode = false;
    this.searchTimer = null;
    this.databaseSort = 'name';
    this.init();
  }

  async init() {
    try {
      console.log('Initializing SafeWeb Pro Popup...');
      
      // Настройка темы
      await this.setupTheme();
      
      // Настройка событий
      this.setupEventListeners();
      this.setupTabs();
      
      // Получаем текущую вкладку
      await this.getCurrentTab();
      
      // Загружаем базу данных
      await this.loadDatabase();
      
      // Показываем начальное состояние
      this.showInitialState();
      
      console.log('✅ SafeWeb Pro Popup инициализирован');
    } catch (error) {
      console.error('Init error:', error);
      this.showNotification('Ошибка при загрузке расширения', 'error');
    }
  }

  async setupTheme() {
    try {
      const result = await chrome.storage.local.get(['theme']);
      if (result.theme === 'dark') {
        this.enableDarkMode();
      }
    } catch (error) {
      console.error('Theme setup error:', error);
    }
  }

  setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Поиск сайтов
    const siteSearch = document.getElementById('siteSearch');
    if (siteSearch) {
      siteSearch.addEventListener('input', (e) => {
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => {
          this.performSearch(e.target.value);
        }, 300);
      });
    }
    
    // Кнопки управления базой данных
    const sortByNameBtn = document.getElementById('sortByName');
    if (sortByNameBtn) {
      sortByNameBtn.addEventListener('click', () => {
        this.databaseSort = 'name';
        this.updateDatabaseSortButtons();
        this.displayAllSites();
      });
    }
    
    const sortByCategoryBtn = document.getElementById('sortByCategory');
    if (sortByCategoryBtn) {
      sortByCategoryBtn.addEventListener('click', () => {
        this.databaseSort = 'category';
        this.updateDatabaseSortButtons();
        this.displayAllSites();
      });
    }
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDatabase());
    }
    
    // Основные кнопки в header
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleDarkMode());
    }
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }
    
    // Инструменты
    const checkCurrentSite = document.getElementById('checkCurrentSite');
    if (checkCurrentSite) {
      checkCurrentSite.addEventListener('click', () => this.checkCurrentSiteSafety());
    }
    
    const clearCache = document.getElementById('clearCache');
    if (clearCache) {
      clearCache.addEventListener('click', () => this.clearCache());
    }
    
    const exportDatabaseTool = document.getElementById('exportDatabase');
    if (exportDatabaseTool) {
      exportDatabaseTool.addEventListener('click', () => this.exportDatabase());
    }
    
    // Модальные окна
    const modalClose = document.querySelectorAll('.modal-close');
    modalClose.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.modal');
        if (modal) {
          this.closeModal(modal.id);
        } else {
          this.closeModal('siteDetailsModal');
        }
      });
    });
    
    const openSiteBtn = document.getElementById('openSiteBtn');
    if (openSiteBtn) {
      openSiteBtn.addEventListener('click', () => {
        const url = document.getElementById('modalSiteUrl')?.textContent;
        if (url) {
          chrome.tabs.create({ url: `https://${url}` });
          window.close();
        }
      });
    }
    
    // Закрытие модалок по клику вне окна
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal(modal.id);
        }
      });
    });
    
    console.log('✅ Event listeners установлены');
  }

  setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabName = tab.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }

  switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Скрываем все табы
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    // Показываем выбранный таб
    const targetTab = document.getElementById(`${tabName}Tab`);
    const targetButton = document.querySelector(`.tab[data-tab="${tabName}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetButton) targetButton.classList.add('active');
    
    // При переключении на базу данных обновляем отображение
    if (tabName === 'database') {
      this.displayAllSites();
    }
  }

  async getCurrentTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        if (url.startsWith('http://') || url.startsWith('https://')) {
          this.currentUrl = new URL(url);
          this.currentDomain = this.currentUrl.hostname.replace(/^www\./, '').toLowerCase();
          console.log('Current domain:', this.currentDomain);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error getting current tab:', error);
      return false;
    }
  }

  async loadDatabase() {
    return new Promise((resolve) => {
      console.log('Loading database...');
      
      chrome.runtime.sendMessage(
        { action: 'getAllSites' },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Runtime error:', chrome.runtime.lastError);
            this.allSitesData = {};
            this.showNotification('Ошибка загрузки базы данных', 'error');
          } else if (response && response.success) {
            this.allSitesData = response.sites || {};
            this.blockedDomains = response.blocked || [];
            console.log('✅ База загружена:', Object.keys(this.allSitesData).length, 'сайтов');
          } else {
            this.allSitesData = {};
            console.warn('No sites data received');
          }
          
          this.updateStats();
          resolve();
        }
      );
    });
  }

  showInitialState() {
    const resultsContainer = document.getElementById('resultsContainer');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-text">Введите URL или название сайта для поиска</div>
          <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 8px;">
            Пример: google.com, youtube.com
          </div>
        </div>
      `;
    }
  }

  performSearch(query) {
    const resultsContainer = document.getElementById('resultsContainer');
    if (!query || !query.trim()) {
      this.showInitialState();
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results = this.searchInDatabase(normalizedQuery);
    this.displaySearchResults(results, normalizedQuery, resultsContainer);
  }

  searchInDatabase(query) {
    return Object.entries(this.allSitesData)
      .filter(([domain, site]) => {
        return domain.includes(query) ||
               site.n.toLowerCase().includes(query) ||
               site.c.toLowerCase().includes(query) ||
               (site.t && site.t.some(tag => tag.toLowerCase().includes(query)));
      })
      .sort((a, b) => a[1].n.localeCompare(b[1].n));
  }

  displaySearchResults(results, query = '', container) {
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <div class="no-results-text">Ничего не найдено по запросу "${query}"</div>
          <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 8px;">
            Попробуйте другой запрос или проверьте сайт вручную
          </div>
        </div>
      `;
    } else {
      container.innerHTML = results.map(([domain, site]) => `
        <div class="result-card" data-domain="${domain}">
          <div class="result-header">
            <div class="result-name">
              <div class="site-icon-small">${this.getSiteIcon(site.c)}</div>
              <div>
                <div class="site-name">${site.n}</div>
                <div class="site-url">${domain}</div>
              </div>
            </div>
            <span class="safety-status safe">✓ БЕЗОПАСНЫЙ</span>
          </div>
          
          <div class="site-details">
            <div class="category-badge">${site.c}</div>
            ${site.t && site.t.length > 0 ? `
              <div class="result-tags">
                ${site.t.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          
          <div class="result-actions">
            <button class="btn btn-secondary" data-action="details">Подробнее</button>
            <button class="btn btn-primary" data-action="open">Открыть</button>
          </div>
        </div>
      `).join('');

      // Добавляем обработчики событий для карточек
      container.querySelectorAll('.result-card').forEach(card => {
        const domain = card.dataset.domain;
        
        card.querySelector('[data-action="open"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          chrome.tabs.create({ url: `https://${domain}` });
          window.close();
        });
        
        card.querySelector('[data-action="details"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showSiteDetails(domain);
        });
        
        card.addEventListener('click', (e) => {
          if (!e.target.closest('button')) {
            this.showSiteDetails(domain);
          }
        });
      });
    }
  }

  displayAllSites() {
    const resultsContainer = document.getElementById('databaseResults');
    if (!resultsContainer) return;

    const results = Object.entries(this.allSitesData);
    
    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">📋</div>
          <div class="no-results-text">База данных пуста</div>
        </div>
      `;
      return;
    }

    // Группируем по категориям если сортировка по категориям
    if (this.databaseSort === 'category') {
      const grouped = {};
      results.forEach(([domain, site]) => {
        if (!grouped[site.c]) grouped[site.c] = [];
        grouped[site.c].push([domain, site]);
      });

      resultsContainer.innerHTML = Object.entries(grouped)
        .sort(([catA], [catB]) => catA.localeCompare(catB))
        .map(([category, sites]) => `
          <div class="category-section">
            <div class="category-header">
              ${category}
              <span>(${sites.length})</span>
            </div>
            ${sites
              .sort((a, b) => a[1].n.localeCompare(b[1].n))
              .map(([domain, site]) => this.createDatabaseCard(domain, site))
              .join('')}
          </div>
        `).join('');
    } else {
      resultsContainer.innerHTML = results
        .sort((a, b) => a[1].n.localeCompare(b[1].n))
        .map(([domain, site]) => this.createDatabaseCard(domain, site))
        .join('');
    }

    // Добавляем обработчики событий
    resultsContainer.querySelectorAll('.result-card').forEach(card => {
      const domain = card.dataset.domain;
      
      card.querySelector('[data-action="details"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showSiteDetails(domain);
      });
      
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.showSiteDetails(domain);
        }
      });
    });
  }

  createDatabaseCard(domain, site) {
    return `
      <div class="result-card" data-domain="${domain}">
        <div class="result-header">
          <div class="result-name">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="site-icon-small">${this.getSiteIcon(site.c)}</div>
              <div>
                <div style="font-weight: bold;">${site.n}</div>
                <div style="font-size: 12px; color: var(--color-text-secondary);">${domain}</div>
              </div>
            </div>
          </div>
          <span class="category-badge">${site.c}</span>
        </div>
        
        ${site.t && site.t.length > 0 ? `
          <div class="result-tags">
            ${site.t.map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        ` : ''}
        
        <div class="result-actions">
          <button class="btn btn-secondary" data-action="details">Подробнее</button>
        </div>
      </div>
    `;
  }

  getSiteIcon(category) {
    const icons = {
      'Соцсети': '👥',
      'Видео': '🎥',
      'Игры': '🎮',
      'Покупки': '🛒',
      'Работа': '💼',
      'Поиск': '🔍',
      'Энциклопедия': '📚',
      'ИИ': '🤖',
      'Дизайн': '🎨',
      'Музыка': '🎵',
      'Новости': '📰',
      'Облако': '☁️',
      'Карты': '🗺️',
      'Образование': '📖',
      'Разработка': '💻',
      'Путешествия': '✈️',
      'Финансы': '💰',
      'Здоровье': '❤️',
      'Продуктивность': '📊',
      'Безопасность': '🛡️',
      'Мессенджер': '💬',
      'Технологии': '💻'
    };
    
    return icons[category] || '🌐';
  }

  updateStats() {
    const total = Object.keys(this.allSitesData).length;
    const categories = new Set(Object.values(this.allSitesData).map(site => site.c)).size;
    
    const totalSitesElement = document.getElementById('totalSites');
    const totalCategoriesElement = document.getElementById('totalCategories');
    
    if (totalSitesElement) totalSitesElement.textContent = total;
    if (totalCategoriesElement) totalCategoriesElement.textContent = categories;
  }

  updateDatabaseSortButtons() {
    const nameBtn = document.getElementById('sortByName');
    const categoryBtn = document.getElementById('sortByCategory');
    
    if (nameBtn && categoryBtn) {
      nameBtn.classList.toggle('active', this.databaseSort === 'name');
      categoryBtn.classList.toggle('active', this.databaseSort === 'category');
    }
  }

  showSiteDetails(domain) {
    const siteInfo = this.allSitesData[domain];
    if (!siteInfo) return;

    // Заполняем модальное окно
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (modalTitle && modalBody) {
      modalTitle.textContent = siteInfo.n;
      
      modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
            <div class="site-icon-small">${this.getSiteIcon(siteInfo.c)}</div>
            <div>
              <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">${siteInfo.n}</div>
              <div style="font-size: 14px; color: var(--color-text-secondary);">${domain}</div>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span class="safety-status safe">✓ БЕЗОПАСНЫЙ</span>
            <span class="category-badge">${siteInfo.c}</span>
          </div>
          
          ${siteInfo.t && siteInfo.t.length > 0 ? `
            <div style="margin: 16px 0;">
              <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">Теги:</div>
              <div class="result-tags">
                ${siteInfo.t.map(tag => `<span class="tag">${tag}</span>`).join('')}
              </div>
            </div>
          ` : ''}
          
          <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 20px;">
            ✅ Этот сайт проверен и находится в базе безопасных ресурсов
          </div>
        </div>
      `;
      
      // Сохраняем URL для кнопки открытия
      modalBody.querySelector = null; // Очищаем любые потенциальные ссылки на старые элементы
      const urlElement = document.createElement('div');
      urlElement.id = 'modalSiteUrl';
      urlElement.style.display = 'none';
      urlElement.textContent = domain;
      modalBody.appendChild(urlElement);
    }

    this.openModal('siteDetailsModal');
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }

  async checkCurrentSiteSafety() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0] && tabs[0].url) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname.replace(/^www\./, '');
        
        chrome.runtime.sendMessage(
          { action: 'checkDomain', domain: domain },
          (response) => {
            if (response?.success) {
              const result = response.result;
              let message = '';
              
              if (result.safe === 'safe') {
                message = `✅ Сайт ${domain} безопасен`;
              } else if (result.safe === 'not-safe') {
                message = `⚠️ Сайт ${domain} может быть опасен: ${result.reason}`;
              } else {
                message = `❓ Сайт ${domain} не найден в базе данных`;
              }
              
              this.showNotification(message, result.safe === 'safe' ? 'success' : 
                                               result.safe === 'not-safe' ? 'error' : 'warning');
            }
          }
        );
      }
    } catch (error) {
      this.showNotification('Ошибка при проверке сайта', 'error');
    }
  }

  clearCache() {
    chrome.runtime.sendMessage(
      { action: 'clearCache' },
      (response) => {
        if (response?.success) {
          this.showNotification('Кэш очищен', 'success');
        }
      }
    );
  }

  exportDatabase() {
    const data = {
      version: '2.0.2',
      exportDate: new Date().toISOString(),
      description: 'База безопасных сайтов SafeWeb Pro',
      sites: this.allSitesData
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeweb-pro-database-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    this.showNotification('База данных экспортирована', 'success');
  }

  refreshData() {
    this.loadDatabase();
    this.showNotification('Данные обновлены', 'success');
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    
    if (this.isDarkMode) {
      this.enableDarkMode();
    } else {
      this.disableDarkMode();
    }
    
    // Сохраняем настройку
    chrome.storage.local.set({ 
      theme: this.isDarkMode ? 'dark' : 'light' 
    });
    
    this.showNotification(
      this.isDarkMode ? 'Тёмная тема включена' : 'Светлая тема включена', 
      'info'
    );
  }

  enableDarkMode() {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    this.isDarkMode = true;
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.textContent = '☀️';
  }

  disableDarkMode() {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    this.isDarkMode = false;
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.textContent = '🌙';
  }

  showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    
    // Добавляем стили в зависимости от типа
    const colors = {
      'error': '#ef4444',
      'success': '#10b981',
      'warning': '#f59e0b',
      'info': '#3b82f6'
    };
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type] || colors.info};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 300px;
      font-size: 14px;
      animation: fadeIn 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, creating SafeWebProPopup instance...');
  new SafeWebProPopup();
});