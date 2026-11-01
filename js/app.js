/**
 * KFC Fried Chicken Landing Page
 * Vanilla JavaScript (ES6+) - Client-Side CSV Data Loader & Interactive Features
 * 
 * Note: Educational Vibe Coding Project. Non-commercial.
 */

'use strict';

// ==========================================================================
// 1. Utilities & CSV Parser (RFC 4180 Compliant)
// ==========================================================================

/**
 * Parses RFC 4180 CSV text with support for:
 * - Comma delimiters
 * - Quoted fields containing commas and newlines
 * - Escaped double quotes ("")
 * - CRLF and LF line breaks
 * 
 * @param {string} text - Raw CSV text content
 * @returns {Array<Object>} Array of objects with keys from the header row
 */
function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped double quote ("")
        currentField += '"';
        i++; // Skip the second quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Delimiter outside quotes
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      // Line break outside quotes
      if (char === '\r' && nextChar === '\n') {
        i++; // Handle CRLF
      }
      currentRow.push(currentField);
      currentField = '';

      // Ignore empty blank rows
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push final field/row if text does not end with a trailing newline
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return [];

  // Extract header row
  const headers = rows[0].map(h => h.trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && row[0].trim() === '') continue;

    const entry = {};
    for (let c = 0; c < headers.length; c++) {
      const headerName = headers[c];
      entry[headerName] = row[c] !== undefined ? row[c].trim() : '';
    }
    data.push(entry);
  }

  return data;
}

/**
 * Fetch and parse a CSV file via Fetch API
 * @param {string} url - Relative path to the CSV file
 * @returns {Promise<Array<Object>>}
 */
async function fetchCSV(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Lỗi tải tệp ${url} (HTTP ${response.status} ${response.statusText})`);
  }
  const text = await response.text();
  return parseCSV(text);
}

/**
 * Format currency in VND (e.g., 39000 -> "39.000 đ")
 * @param {number|string} amount
 * @returns {string}
 */
function formatVND(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '0 đ';
  return num.toLocaleString('vi-VN') + ' đ';
}

/**
 * Format date string YYYY-MM-DD to DD/MM/YYYY
 * @param {string} dateStr
 * @returns {string}
 */
function formatDateVN(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Friendly Category Label mapping
 */
const CATEGORY_NAMES = {
  chicken: 'Gà Rán',
  combo: 'Combo',
  burger: 'Burger',
  sides: 'Món Ăn Kèm',
  drinks: 'Thức Uống'
};

// ==========================================================================
// 2. Application State & Cart Bridge (Module 1 Data Contract)
// ==========================================================================
const CartStore = {
  items: [
    { id: 'P001', name: 'Gà Rán Giòn Cay', price: 39000, quantity: 2, image: 'images/products/ga-ran.jpg' },
    { id: 'P003', name: 'Khoai Tây Chiên Giòn', price: 22000, quantity: 1, image: 'images/products/khoai-tay-chien.jpg' }
  ],
  addItem(product) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        quantity: 1,
        image: product.image || 'assets/images/hero-chicken.svg'
      });
    }
  },
  getItems() {
    return this.items;
  },
  clear() {
    this.items = [];
  }
};

let checkoutModal = null;

const AppState = {
  products: [],
  promotions: [],
  faqs: [],
  currentCategory: 'all'
};

// ==========================================================================
// 3. UI Toast Notification System
// ==========================================================================
function showToast(message, duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');

  const textSpan = document.createElement('span');
  textSpan.textContent = message;

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'toast-close-btn';
  closeBtn.setAttribute('aria-label', 'Đóng thông báo');
  closeBtn.textContent = '×';

  toast.appendChild(textSpan);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  function dismiss() {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  }

  closeBtn.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

// ==========================================================================
// 4. Products Rendering & Filtering (Safe DOM API, No innerHTML)
// ==========================================================================

/**
 * Creates a product card DOM element
 * @param {Object} item - Product data object from CSV
 * @returns {HTMLElement}
 */
function createProductCard(item) {
  const card = document.createElement('article');
  card.className = 'card product-card';
  card.dataset.category = item.category || 'other';

  // 1. Image wrapper
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'product-img-wrapper';

  // Badge (e.g., "Bán chạy", "Mới")
  if (item.badge && item.badge.trim() !== '') {
    const badge = document.createElement('span');
    badge.className = 'product-badge';
    badge.textContent = item.badge.trim();
    imgWrapper.appendChild(badge);
  }

  // Category Tag
  const catTag = document.createElement('span');
  catTag.className = 'product-category-tag';
  catTag.textContent = CATEGORY_NAMES[item.category] || item.category;
  imgWrapper.appendChild(catTag);

  // Image Element
  const img = document.createElement('img');
  img.className = 'product-img';
  img.src = item.image && item.image.trim() !== '' ? item.image.trim() : 'assets/images/hero-chicken.svg';
  img.alt = item.name ? `Món ${item.name}` : 'Món ăn gà rán KFC';
  img.loading = 'lazy';
  img.width = 300;
  img.height = 200;

  // Fallback to SVG if image fails to load
  img.addEventListener('error', () => {
    img.src = 'assets/images/hero-chicken.svg';
  });

  imgWrapper.appendChild(img);
  card.appendChild(imgWrapper);

  // 2. Content wrapper
  const content = document.createElement('div');
  content.className = 'product-content';

  const title = document.createElement('h3');
  title.className = 'product-title';
  title.textContent = item.name || 'Sản phẩm KFC';
  content.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'product-description';
  desc.textContent = item.description || 'Hương vị thơm ngon giòn rụm đậm đà chuẩn phong cách KFC.';
  content.appendChild(desc);

  // 3. Footer with Price and Button
  const footer = document.createElement('div');
  footer.className = 'product-footer';

  const priceBox = document.createElement('div');
  priceBox.className = 'product-price-box';

  const priceLabel = document.createElement('span');
  priceLabel.className = 'price-label';
  priceLabel.textContent = 'Giá minh họa';
  priceBox.appendChild(priceLabel);

  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = formatVND(item.price);
  priceBox.appendChild(price);

  const orderBtn = document.createElement('button');
  orderBtn.type = 'button';
  orderBtn.className = 'product-order-btn';
  orderBtn.textContent = 'Chọn món +';
  orderBtn.setAttribute('aria-label', `Chọn món ${item.name || ''}`);
  
  orderBtn.addEventListener('click', () => {
    CartStore.addItem(item);
    showToast(`🍗 Đã thêm "${item.name}" vào giỏ! (Bấm "Mô Phỏng Đặt Món" để mở Thanh Toán)`);
  });

  footer.appendChild(priceBox);
  footer.appendChild(orderBtn);
  content.appendChild(footer);

  card.appendChild(content);
  return card;
}

/**
 * Render products into the container based on category filter
 */
function renderProducts() {
  const container = document.getElementById('products-grid');
  const errorBox = document.getElementById('products-error');
  if (!container) return;

  // Clear existing content safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Filter items
  const filtered = AppState.currentCategory === 'all'
    ? AppState.products
    : AppState.products.filter(p => p.category === AppState.currentCategory);

  if (filtered.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'data-state-box';
    emptyBox.style.gridColumn = '1 / -1';
    
    const icon = document.createElement('div');
    icon.className = 'state-icon';
    icon.textContent = '🍗';
    
    const title = document.createElement('h3');
    title.className = 'state-title';
    title.textContent = 'Chưa có món ăn trong danh mục này';
    
    const desc = document.createElement('p');
    desc.className = 'state-msg';
    desc.textContent = 'Vui lòng chọn danh mục khác để xem thêm nhiều món hấp dẫn.';

    emptyBox.appendChild(icon);
    emptyBox.appendChild(title);
    emptyBox.appendChild(desc);
    container.appendChild(emptyBox);
    return;
  }

  // Hide error box if visible
  if (errorBox) errorBox.classList.add('is-hidden');

  // Append product cards
  const fragment = document.createDocumentFragment();
  filtered.forEach(item => {
    fragment.appendChild(createProductCard(item));
  });
  container.appendChild(fragment);

  // Update total count indicator
  const totalCountEl = document.getElementById('count-all');
  if (totalCountEl) {
    totalCountEl.textContent = AppState.products.length.toString();
  }
}

// ==========================================================================
// 5. Promotions Rendering
// ==========================================================================

/**
 * Creates a promotion card DOM element
 * @param {Object} promo - Promotion data object from CSV
 * @returns {HTMLElement}
 */
function createPromotionCard(promo) {
  const card = document.createElement('article');
  card.className = 'promo-card';

  // Header with Discount Badge and Valid Date
  const header = document.createElement('div');
  header.className = 'promo-header';

  const discountBadge = document.createElement('span');
  discountBadge.className = 'promo-discount-badge';
  discountBadge.textContent = promo.discount_label || 'ƯU ĐÃI';
  header.appendChild(discountBadge);

  if (promo.valid_to) {
    const dateBadge = document.createElement('span');
    dateBadge.className = 'promo-date-badge';
    dateBadge.textContent = `HSD: ${formatDateVN(promo.valid_to)}`;
    header.appendChild(dateBadge);
  }
  card.appendChild(header);

  // Title
  const title = document.createElement('h3');
  title.className = 'promo-title';
  title.textContent = promo.title || 'Khuyến mãi đặc biệt';
  card.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.className = 'promo-description';
  desc.textContent = promo.description || 'Ưu đãi hấp dẫn đang diễn ra.';
  card.appendChild(desc);

  // Terms and conditions
  if (promo.terms) {
    const terms = document.createElement('div');
    terms.className = 'promo-terms';
    terms.textContent = `Điều kiện: ${promo.terms}`;
    card.appendChild(terms);
  }

  // Claim Button
  const claimBtn = document.createElement('button');
  claimBtn.type = 'button';
  claimBtn.className = 'promo-claim-btn';
  claimBtn.textContent = 'Áp dụng mã ngay →';
  claimBtn.addEventListener('click', () => {
    showToast(`🎉 Ưu đãi "${promo.discount_label || 'HOT DEAL'}" đã được lưu vào khay giả lập!`);
  });
  card.appendChild(claimBtn);

  return card;
}

/**
 * Render promotions from AppState into the container
 */
function renderPromotions() {
  const container = document.getElementById('promotions-grid');
  const errorBox = document.getElementById('promotions-error');
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Filter only active promotions
  const activePromos = AppState.promotions.filter(
    p => p.active !== undefined && p.active.toLowerCase() === 'true'
  );

  if (activePromos.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'data-state-box';
    emptyBox.style.gridColumn = '1 / -1';
    emptyBox.textContent = 'Hiện chưa có chương trình ưu đãi mới.';
    container.appendChild(emptyBox);
    return;
  }

  if (errorBox) errorBox.classList.add('is-hidden');

  const fragment = document.createDocumentFragment();
  activePromos.forEach(promo => {
    fragment.appendChild(createPromotionCard(promo));
  });
  container.appendChild(fragment);
}

// ==========================================================================
// 6. FAQs Accordion Rendering & Interaction
// ==========================================================================

/**
 * Creates an accordion item for a single FAQ
 * @param {Object} faq - FAQ data object from CSV
 * @param {number} index - Index for unique IDs
 * @returns {HTMLElement}
 */
function createFAQItem(faq, index) {
  const item = document.createElement('div');
  item.className = 'faq-item';

  const headerId = `faq-header-${index}`;
  const panelId = `faq-panel-${index}`;

  // Header button
  const headerBtn = document.createElement('button');
  headerBtn.type = 'button';
  headerBtn.className = 'faq-header';
  headerBtn.id = headerId;
  headerBtn.setAttribute('aria-expanded', 'false');
  headerBtn.setAttribute('aria-controls', panelId);

  const questionSpan = document.createElement('span');
  questionSpan.textContent = faq.question || 'Câu hỏi thắc mắc?';
  headerBtn.appendChild(questionSpan);

  // Chevron SVG icon
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  chevron.setAttribute('class', 'faq-chevron');
  chevron.setAttribute('viewBox', '0 0 24 24');
  chevron.setAttribute('fill', 'none');
  chevron.setAttribute('stroke', 'currentColor');
  chevron.setAttribute('stroke-width', '2.5');
  chevron.setAttribute('stroke-linecap', 'round');
  chevron.setAttribute('stroke-linejoin', 'round');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 9l6 6 6-6');
  chevron.appendChild(path);
  headerBtn.appendChild(chevron);

  // Body container
  const body = document.createElement('div');
  body.className = 'faq-body';
  body.id = panelId;
  body.setAttribute('role', 'region');
  body.setAttribute('aria-labelledby', headerId);

  const bodyInner = document.createElement('div');
  bodyInner.className = 'faq-body-inner';
  bodyInner.textContent = faq.answer || 'Nội dung giải đáp thắc mắc.';
  body.appendChild(bodyInner);

  // Toggle Accordion functionality
  headerBtn.addEventListener('click', () => {
    const isExpanded = headerBtn.getAttribute('aria-expanded') === 'true';

    // Close all other open items for a neat accordion feel
    const allItems = document.querySelectorAll('.faq-item');
    allItems.forEach(otherItem => {
      if (otherItem !== item) {
        otherItem.classList.remove('is-open');
        const otherBtn = otherItem.querySelector('.faq-header');
        const otherBody = otherItem.querySelector('.faq-body');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        if (otherBody) otherBody.style.maxHeight = null;
      }
    });

    if (isExpanded) {
      headerBtn.setAttribute('aria-expanded', 'false');
      item.classList.remove('is-open');
      body.style.maxHeight = null;
    } else {
      headerBtn.setAttribute('aria-expanded', 'true');
      item.classList.add('is-open');
      body.style.maxHeight = body.scrollHeight + 'px';
    }
  });

  item.appendChild(headerBtn);
  item.appendChild(body);
  return item;
}

/**
 * Render FAQ items from AppState into the container
 */
function renderFAQs() {
  const container = document.getElementById('faq-list');
  const errorBox = document.getElementById('faq-error');
  if (!container) return;

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Filter active and sort by sort_order
  const activeFaqs = AppState.faqs
    .filter(f => f.active !== undefined && f.active.toLowerCase() === 'true')
    .sort((a, b) => {
      const orderA = parseInt(a.sort_order, 10) || 0;
      const orderB = parseInt(b.sort_order, 10) || 0;
      return orderA - orderB;
    });

  if (activeFaqs.length === 0) {
    const emptyBox = document.createElement('div');
    emptyBox.className = 'data-state-box';
    emptyBox.textContent = 'Chưa có câu hỏi thường gặp.';
    container.appendChild(emptyBox);
    return;
  }

  if (errorBox) errorBox.classList.add('is-hidden');

  const fragment = document.createDocumentFragment();
  activeFaqs.forEach((faq, index) => {
    fragment.appendChild(createFAQItem(faq, index));
  });
  container.appendChild(fragment);
}

// ==========================================================================
// 7. Data Loading Orchestrator with Individual Error Resilience
// ==========================================================================

async function loadProductsData() {
  const errorBox = document.getElementById('products-error');
  const errorMsg = document.getElementById('products-error-msg');
  try {
    AppState.products = await fetchCSV('data/products.csv');
    renderProducts();
  } catch (err) {
    console.error('Không tải được data/products.csv:', err);
    if (errorBox) {
      errorBox.classList.remove('is-hidden');
      if (errorMsg) errorMsg.textContent = `Không thể đọc data/products.csv (${err.message}). Bạn đang mở file bằng file:// hay server tĩnh?`;
    }
  }
}

async function loadPromotionsData() {
  const errorBox = document.getElementById('promotions-error');
  const errorMsg = document.getElementById('promotions-error-msg');
  try {
    AppState.promotions = await fetchCSV('data/promotions.csv');
    renderPromotions();
  } catch (err) {
    console.error('Không tải được data/promotions.csv:', err);
    if (errorBox) {
      errorBox.classList.remove('is-hidden');
      if (errorMsg) errorMsg.textContent = `Không thể đọc data/promotions.csv (${err.message}).`;
    }
  }
}

async function loadFAQsData() {
  const errorBox = document.getElementById('faq-error');
  const errorMsg = document.getElementById('faq-error-msg');
  try {
    AppState.faqs = await fetchCSV('data/faqs.csv');
    renderFAQs();
  } catch (err) {
    console.error('Không tải được data/faqs.csv:', err);
    if (errorBox) {
      errorBox.classList.remove('is-hidden');
      if (errorMsg) errorMsg.textContent = `Không thể đọc data/faqs.csv (${err.message}).`;
    }
  }
}

async function initAppData() {
  // Load data concurrently without letting one failure break the others
  await Promise.allSettled([
    loadProductsData(),
    loadPromotionsData(),
    loadFAQsData()
  ]);
}

// ==========================================================================
// 8. Navigation, Scroll & Mobile Menu Controls
// ==========================================================================

function initNavigation() {
  const header = document.getElementById('header');
  const menuToggle = document.getElementById('menu-toggle');
  const siteNav = document.getElementById('site-nav');
  const navLinks = document.querySelectorAll('.nav-link');
  const backToTopBtn = document.getElementById('back-to-top');

  // Mobile Menu Toggle
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', !isExpanded);
      siteNav.classList.toggle('is-open', !isExpanded);
    });

    // Close mobile nav when clicking a link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (siteNav.classList.contains('is-open')) {
          menuToggle.setAttribute('aria-expanded', 'false');
          siteNav.classList.remove('is-open');
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        siteNav.classList.remove('is-open');
        menuToggle.focus();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (siteNav.classList.contains('is-open') && 
          !siteNav.contains(e.target) && 
          !menuToggle.contains(e.target)) {
        menuToggle.setAttribute('aria-expanded', 'false');
        siteNav.classList.remove('is-open');
      }
    });
  }

  // Header scroll shadow & Back to Top visibility
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY || document.documentElement.scrollTop;
    
    if (header) {
      if (scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    if (backToTopBtn) {
      if (scrollY > 350) {
        backToTopBtn.classList.add('is-visible');
      } else {
        backToTopBtn.classList.remove('is-visible');
      }
    }
  }, { passive: true });

  // Back to Top button action
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // Active section indicator using IntersectionObserver
  const sections = document.querySelectorAll('main section[id]');
  if ('IntersectionObserver' in window && sections.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -60% 0px',
      threshold: 0
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const currentId = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${currentId}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => sectionObserver.observe(section));
  }
}

// ==========================================================================
// 9. Interactive Category Filters & Actions
// ==========================================================================

function initFilterControls() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      AppState.currentCategory = btn.dataset.category || 'all';
      renderProducts();
    });
  });

  // Retry buttons for error states
  const retryProducts = document.getElementById('btn-retry-products');
  if (retryProducts) retryProducts.addEventListener('click', loadProductsData);

  const retryPromos = document.getElementById('btn-retry-promotions');
  if (retryPromos) retryPromos.addEventListener('click', loadPromotionsData);

  const retryFaq = document.getElementById('btn-retry-faq');
  if (retryFaq) retryFaq.addEventListener('click', loadFAQsData);

  // Learn more / Order mock button in bottom CTA -> Opens Checkout Modal
  const btnLearnMore = document.getElementById('btn-learn-more');
  if (btnLearnMore) {
    btnLearnMore.addEventListener('click', () => {
      if (checkoutModal) {
        checkoutModal.open();
      } else {
        showToast('🍔 Đây là website học tập độc lập. Cảm ơn bạn đã trải nghiệm giao diện!');
      }
    });
  }
}

// ==========================================================================
// 10. Initialization on DOMContentLoaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initFilterControls();
  initAppData();

  // Initialize Checkout Modal (Module 2)
  if (window.KfcCheckout && window.KfcCheckout.CheckoutModal) {
    checkoutModal = new window.KfcCheckout.CheckoutModal({
      getCart: () => CartStore.getItems(),
      onSuccess: (order) => {
        CartStore.clear();
        showToast(`🎉 Đặt hàng thành công! Mã đơn: ${order.orderId}`);
      }
    });
  }
});
