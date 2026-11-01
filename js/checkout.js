/**
 * KFC Fried Chicken - Checkout & Payment Module (Module 2: Thanh Toán)
 * Architecture: Clean Vanilla JS (ES6+), Universal Module (Node.js & Browser compatible)
 * 
 * Features:
 * - Order & Customer Information Validation (Name, Vietnamese Phone, Delivery Address)
 * - Dynamic Shipping Fee Calculation & Freeship Thresholds
 * - Voucher / Coupon System with Discount Rules (KFC30, FREESHIP, GIAM20K, TRUAVUI)
 * - Multi-method Payment Processing (COD, VietQR, MoMo, Bank Card)
 * - Safe DOM UI Rendering (Zero innerHTML on user input, XSS-immune)
 * - Event Dispatching & Integration hooks with Cart Module
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // Node.js environment
    module.exports = factory();
  } else {
    // Browser environment
    root.KfcCheckout = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ==========================================================================
  // 1. Constants & Configuration
  // ==========================================================================
  const CONFIG = {
    DEFAULT_SHIPPING_FEE: 20000,
    FREESHIP_THRESHOLD: 150000,
    CURRENCY_SUFFIX: ' đ',
    ORDER_PREFIX: 'KFC',
    STORAGE_KEY: 'kfc_order_history',
    PAYMENT_METHODS: {
      MOMO_QR: 'momo_qr',
      ZALOPAY_QR: 'zalopay_qr',
      ATM: 'atm',
      COD: 'cod',
      // Backward compatibility aliases:
      MOMO: 'momo_qr',
      CARD: 'atm',
      VIETQR: 'vietqr'
    },
    DELIVERY_TYPES: {
      DELIVERY: 'delivery',
      PICKUP: 'pickup'
    }
  };

  const VOUCHER_CATALOG = {
    'KFC30': {
      type: 'percentage',
      value: 30,
      maxDiscount: 50000,
      minOrder: 100000,
      description: 'Giảm 30% tối đa 50.000đ cho đơn từ 100.000đ'
    },
    'FREESHIP': {
      type: 'shipping',
      value: 20000,
      minOrder: 0,
      description: 'Miễn phí giao hàng 20.000đ'
    },
    'GIAM20K': {
      type: 'fixed',
      value: 20000,
      minOrder: 60000,
      description: 'Giảm ngay 20.000đ cho đơn từ 60.000đ'
    },
    'TRUAVUI': {
      type: 'fixed',
      value: 15000,
      minOrder: 49000,
      description: 'Ưu đãi trưa vui vẻ giảm 15.000đ'
    }
  };

  // ==========================================================================
  // 2. Formatters
  // ==========================================================================
  function formatMoney(amount) {
    const num = Number(amount);
    if (isNaN(num)) return '0' + CONFIG.CURRENCY_SUFFIX;
    return num.toLocaleString('vi-VN') + CONFIG.CURRENCY_SUFFIX;
  }

  // ==========================================================================
  // 3. Validation Logic (CheckoutValidator)
  // ==========================================================================
  const CheckoutValidator = {
    /**
     * Validate Vietnamese Full Name
     * Must be at least 2 characters, no special punctuation or script tags
     */
    validateFullName(name) {
      if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Họ và tên không được để trống.' };
      }
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        return { isValid: false, error: 'Họ và tên phải có ít nhất 2 ký tự.' };
      }
      if (trimmed.length > 70) {
        return { isValid: false, error: 'Họ và tên không được vượt quá 70 ký tự.' };
      }
      // Vietnamese letters, spaces, hyphens
      const nameRegex = /^[a-zA-ZàáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệđìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵÀÁẢÃẠÂẦẤẨẪẬĂẰẮẲẴẶÈÉẺẼẸÊỀẾỂỄỆĐÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ\s'-]+$/;
      if (!nameRegex.test(trimmed)) {
        return { isValid: false, error: 'Họ và tên không hợp lệ (không chứa số hoặc ký tự đặc biệt).' };
      }
      return { isValid: true, error: null };
    },

    /**
     * Validate Vietnamese Phone Number
     * Formats: 09xxxxxxxx, 03xxxxxxxx, 07xxxxxxxx, 08xxxxxxxx, 05xxxxxxxx or +84...
     */
    validatePhone(phone) {
      if (!phone || typeof phone !== 'string') {
        return { isValid: false, error: 'Số điện thoại không được để trống.' };
      }
      const cleanPhone = phone.trim().replace(/\s+/g, '');
      const vnPhoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
      if (!vnPhoneRegex.test(cleanPhone)) {
        return { isValid: false, error: 'Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số).' };
      }
      return { isValid: true, error: null, formatted: cleanPhone };
    },

    /**
     * Validate Delivery Address
     * Required if deliveryType is 'delivery', optional if 'pickup'
     */
    validateAddress(address, deliveryType = CONFIG.DELIVERY_TYPES.DELIVERY) {
      if (deliveryType === CONFIG.DELIVERY_TYPES.PICKUP) {
        return { isValid: true, error: null };
      }
      if (!address || typeof address !== 'string') {
        return { isValid: false, error: 'Địa chỉ nhận hàng không được để trống.' };
      }
      const trimmed = address.trim();
      if (trimmed.length < 5) {
        return { isValid: false, error: 'Địa chỉ quá ngắn (vui lòng nhập rõ số nhà, tên đường, phường/xã).' };
      }
      if (trimmed.length > 250) {
        return { isValid: false, error: 'Địa chỉ không được vượt quá 250 ký tự.' };
      }
      return { isValid: true, error: null };
    },

    /**
     * Validate Payment Method
     */
    validatePaymentMethod(method) {
      const validMethods = [
        'momo_qr', 'zalopay_qr', 'atm', 'cod',
        'momo', 'zalopay', 'card', 'vietqr'
      ];
      if (!method || !validMethods.includes(method)) {
        return { isValid: false, error: 'Phương thức thanh toán không hợp lệ.' };
      }
      return { isValid: true, error: null };
    },

    /**
     * Validate Card / ATM Information (Simulated for ATM payment method)
     */
    validateCard(cardNumber, expiry) {
      const cleanCard = (cardNumber || '').replace(/[\s-]+/g, '');
      if (!/^\d{16}$/.test(cleanCard)) {
        return { isValid: false, error: 'Số thẻ ngân hàng phải có đúng 16 chữ số.' };
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry || '')) {
        return { isValid: false, error: 'Ngày hết hạn thẻ phải theo định dạng MM/YY (ví dụ: 12/28).' };
      }
      return { isValid: true, error: null };
    },

    /**
     * Validate entire order payload
     */
    validateOrder(orderData, cartItems = []) {
      const errors = {};

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        errors.cart = 'Giỏ hàng của bạn đang trống. Vui lòng chọn món trước khi thanh toán.';
      }

      const nameRes = this.validateFullName(orderData.customerName);
      if (!nameRes.isValid) errors.customerName = nameRes.error;

      const phoneRes = this.validatePhone(orderData.phone);
      if (!phoneRes.isValid) errors.phone = phoneRes.error;

      const addrRes = this.validateAddress(orderData.address, orderData.deliveryType);
      if (!addrRes.isValid) errors.address = addrRes.error;

      const payRes = this.validatePaymentMethod(orderData.paymentMethod);
      if (!payRes.isValid) errors.paymentMethod = payRes.error;

      if ((orderData.paymentMethod === 'atm' || orderData.paymentMethod === 'card') && (orderData.cardNumber || orderData.cardExpiry)) {
        const cardRes = this.validateCard(orderData.cardNumber, orderData.cardExpiry);
        if (!cardRes.isValid) errors.card = cardRes.error;
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors
      };
    }
  };

  // ==========================================================================
  // 4. Pricing & Calculation Engine (CheckoutCalculator)
  // ==========================================================================
  const CheckoutCalculator = {
    /**
     * Calculate Subtotal from cart items
     */
    calculateSubtotal(cartItems = []) {
      if (!Array.isArray(cartItems)) return 0;
      return cartItems.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return sum + (price * qty);
      }, 0);
    },

    /**
     * Calculate Shipping Fee based on subtotal & delivery type
     */
    calculateShippingFee(subtotal = 0, deliveryType = CONFIG.DELIVERY_TYPES.DELIVERY) {
      if (deliveryType === CONFIG.DELIVERY_TYPES.PICKUP) {
        return 0;
      }
      if (subtotal >= CONFIG.FREESHIP_THRESHOLD) {
        return 0; // Free shipping promotion threshold
      }
      return CONFIG.DEFAULT_SHIPPING_FEE;
    },

    /**
     * Calculate Voucher Discount Amount
     */
    calculateDiscount(subtotal = 0, voucherCode = '', shippingFee = 0) {
      if (!voucherCode || typeof voucherCode !== 'string') {
        return { isValid: false, code: '', discountAmount: 0, description: '' };
      }

      const codeUpper = voucherCode.trim().toUpperCase();
      const voucher = VOUCHER_CATALOG[codeUpper];

      if (!voucher) {
        return {
          isValid: false,
          code: codeUpper,
          discountAmount: 0,
          description: '',
          error: 'Mã giảm giá không tồn tại hoặc đã hết hạn.'
        };
      }

      if (subtotal < voucher.minOrder) {
        return {
          isValid: false,
          code: codeUpper,
          discountAmount: 0,
          description: '',
          error: `Đơn hàng tối thiểu ${formatMoney(voucher.minOrder)} để áp dụng mã ${codeUpper}.`
        };
      }

      let discountAmount = 0;
      if (voucher.type === 'percentage') {
        const raw = Math.round((subtotal * voucher.value) / 100);
        discountAmount = Math.min(raw, voucher.maxDiscount || Infinity);
      } else if (voucher.type === 'fixed') {
        discountAmount = Math.min(voucher.value, subtotal);
      } else if (voucher.type === 'shipping') {
        discountAmount = Math.min(voucher.value, shippingFee);
      }

      return {
        isValid: true,
        code: codeUpper,
        discountAmount,
        description: voucher.description
      };
    },

    /**
     * Comprehensive summary breakdown calculation
     */
    calculateOrderSummary({ cartItems = [], deliveryType = CONFIG.DELIVERY_TYPES.DELIVERY, voucherCode = '' }) {
      const subtotal = this.calculateSubtotal(cartItems);
      const initialShipping = this.calculateShippingFee(subtotal, deliveryType);
      const voucherRes = this.calculateDiscount(subtotal, voucherCode, initialShipping);
      
      const discount = voucherRes.isValid ? voucherRes.discountAmount : 0;
      const total = Math.max(0, subtotal + initialShipping - discount);

      const itemsCount = cartItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

      return {
        itemsCount,
        subtotal,
        shippingFee: initialShipping,
        discount,
        total,
        voucherResult: voucherRes,
        deliveryType
      };
    }
  };

  // ==========================================================================
  // 5. Payment Processor & Order Generator (PaymentService)
  // ==========================================================================
  const PaymentService = {
    /**
     * Generate unique realistic order ID (e.g., KFC-20261101-9F2B)
     */
    generateOrderId() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `${CONFIG.ORDER_PREFIX}-${y}${m}${d}-${rand}`;
    },

    /**
     * Process simulated payment transaction
     */
    async processPayment(orderData, cartItems = []) {
      // 1. Validate order
      const validation = CheckoutValidator.validateOrder(orderData, cartItems);
      if (!validation.isValid) {
        const error = new Error('Thông tin đặt hàng không hợp lệ.');
        error.details = validation.errors;
        throw error;
      }

      // 2. Calculate final summary
      const summary = CheckoutCalculator.calculateOrderSummary({
        cartItems,
        deliveryType: orderData.deliveryType,
        voucherCode: orderData.voucherCode
      });

      // 3. Generate Order ID
      const orderId = this.generateOrderId();
      const createdAt = new Date().toISOString();

      // 4. Prepare payment transaction details according to method
      let paymentStatus = 'PENDING';
      let paymentNote = '';

      switch (orderData.paymentMethod) {
        case CONFIG.PAYMENT_METHODS.MOMO_QR:
        case 'momo':
          paymentStatus = 'AWAITING_MOMO_QR_SCAN';
          paymentNote = `Mã QR MoMo (Đơn hàng: ${orderId})`;
          break;
        case CONFIG.PAYMENT_METHODS.ZALOPAY_QR:
        case 'zalopay':
          paymentStatus = 'AWAITING_ZALOPAY_QR_SCAN';
          paymentNote = `Mã QR Zalo Pay (Đơn hàng: ${orderId})`;
          break;
        case CONFIG.PAYMENT_METHODS.ATM:
        case 'card':
          paymentStatus = 'PAID_ATM_SIMULATED';
          paymentNote = `Thẻ ATM nội địa (${orderData.selectedBank || 'Napas'})`;
          break;
        case CONFIG.PAYMENT_METHODS.COD:
        case 'cash':
          paymentStatus = 'PENDING_CASH_ON_DELIVERY';
          paymentNote = `Tiền mặt (${orderData.cashChange || 'Trả đúng tiền'})`;
          break;
        case 'vietqr':
          paymentStatus = 'AWAITING_TRANSFER';
          paymentNote = `Chuyển khoản VietQR (${orderId})`;
          break;
        default:
          paymentStatus = 'PENDING';
          paymentNote = 'Thanh toán mô phỏng';
      }

      const completedOrder = {
        orderId,
        createdAt,
        customer: {
          name: orderData.customerName.trim(),
          phone: orderData.phone.trim(),
          address: orderData.deliveryType === CONFIG.DELIVERY_TYPES.DELIVERY ? orderData.address.trim() : 'Nhận tại cửa hàng KFC gần nhất',
          note: (orderData.note || '').trim()
        },
        delivery: {
          type: orderData.deliveryType,
          estimatedMinutes: 30
        },
        payment: {
          method: orderData.paymentMethod,
          status: paymentStatus,
          note: paymentNote,
          cashChange: orderData.cashChange || ''
        },
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
          image: item.image || ''
        })),
        summary
      };

      // 5. Simulate asynchronous payment network gateway delay (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));

      // 6. Save order into history store (if localStorage is available)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
          history.unshift(completedOrder);
          // Keep only last 20 orders
          localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history.slice(0, 20)));
        } catch (e) {
          console.warn('Không thể lưu đơn hàng vào localStorage:', e);
        }
      }

      return completedOrder;
    }
  };

  // ==========================================================================
  // 6. Checkout UI Component (Safe DOM Rendering)
  // ==========================================================================
  class CheckoutModal {
    constructor(options = {}) {
      this.getCart = options.getCart || (() => []);
      this.onSuccess = options.onSuccess || (() => {});
      this.onClose = options.onClose || (() => {});
      
      this.currentDeliveryType = CONFIG.DELIVERY_TYPES.DELIVERY;
      this.currentPaymentMethod = CONFIG.PAYMENT_METHODS.MOMO_QR;
      this.selectedBank = 'Vietcombank';
      this.selectedCashChange = 'Trả đúng số tiền';
      this.appliedVoucherCode = '';

      this.overlay = null;
      this.isSubmitting = false;

      this.initDOM();
    }

    /**
     * Create checkout modal DOM structure
     */
    initDOM() {
      if (typeof document === 'undefined') return;

      // Avoid duplicate overlays
      const existing = document.getElementById('kfc-checkout-overlay');
      if (existing) existing.remove();

      this.overlay = document.createElement('div');
      this.overlay.className = 'checkout-overlay';
      this.overlay.id = 'kfc-checkout-overlay';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-modal', 'true');
      this.overlay.setAttribute('aria-labelledby', 'checkout-modal-title');

      const modal = document.createElement('div');
      modal.className = 'checkout-modal';

      // Header
      const header = document.createElement('div');
      header.className = 'checkout-header';

      const titleWrap = document.createElement('div');
      titleWrap.className = 'checkout-header-title';

      const title = document.createElement('h2');
      title.id = 'checkout-modal-title';
      title.textContent = 'Thanh Toán Đơn Hàng';

      const badge = document.createElement('span');
      badge.className = 'checkout-step-badge';
      badge.textContent = 'Bước 2: Xác nhận & Trả tiền';

      titleWrap.appendChild(title);
      titleWrap.appendChild(badge);

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'checkout-close-btn';
      closeBtn.setAttribute('aria-label', 'Đóng cửa sổ thanh toán');
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => this.close());

      header.appendChild(titleWrap);
      header.appendChild(closeBtn);
      modal.appendChild(header);

      // Body container
      const body = document.createElement('div');
      body.className = 'checkout-body';
      body.id = 'checkout-modal-body';
      modal.appendChild(body);

      // Footer
      const footer = document.createElement('div');
      footer.className = 'checkout-footer';

      const footerInfo = document.createElement('div');
      footerInfo.className = 'checkout-footer-info';
      footerInfo.textContent = '🔒 Thông tin thanh toán mô phỏng an toàn (Dự án Vibe Coding).';

      const submitBtn = document.createElement('button');
      submitBtn.type = 'button';
      submitBtn.className = 'checkout-submit-btn';
      submitBtn.id = 'checkout-submit-btn';
      submitBtn.textContent = 'Xác Nhận Đặt Hàng';
      submitBtn.addEventListener('click', () => this.handleSubmit());

      footer.appendChild(footerInfo);
      footer.appendChild(submitBtn);
      modal.appendChild(footer);

      this.overlay.appendChild(modal);
      document.body.appendChild(this.overlay);

      // Global keyboard events
      this.handleKeyDown = (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      };
      document.addEventListener('keydown', this.handleKeyDown);

      // Click outside modal to close
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });
    }

    isOpen() {
      return this.overlay && this.overlay.classList.contains('is-active');
    }

    /**
     * Open and render the checkout view with latest cart data
     */
    open() {
      const cartItems = this.getCart();
      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
          window.showToast('⚠️ Giỏ hàng đang trống! Vui lòng chọn món trước.');
        } else {
          alert('Giỏ hàng của bạn đang trống! Vui lòng chọn món ăn vào giỏ.');
        }
        return;
      }

      this.renderCheckoutForm();
      this.overlay.classList.add('is-active');
      document.body.style.overflow = 'hidden';

      // Focus first input
      setTimeout(() => {
        const firstInput = this.overlay.querySelector('input');
        if (firstInput) firstInput.focus();
      }, 100);
    }

    close() {
      if (!this.overlay) return;
      this.overlay.classList.remove('is-active');
      document.body.style.overflow = '';
      this.onClose();
    }

    /**
     * Render entire Checkout Form Layout
     */
    renderCheckoutForm() {
      const body = document.getElementById('checkout-modal-body');
      if (!body) return;

      while (body.firstChild) {
        body.removeChild(body.firstChild);
      }

      const grid = document.createElement('div');
      grid.className = 'checkout-grid';

      // Left Column: Customer Form & Payment Methods
      const leftCol = document.createElement('div');
      leftCol.className = 'checkout-left-col';

      // 1. Delivery Type Tabs
      const deliverySectionTitle = document.createElement('h3');
      deliverySectionTitle.className = 'checkout-section-title';
      deliverySectionTitle.textContent = 'Hình thức nhận hàng';
      leftCol.appendChild(deliverySectionTitle);

      const deliveryTabs = document.createElement('div');
      deliveryTabs.className = 'delivery-tabs';

      const btnDelivery = document.createElement('button');
      btnDelivery.type = 'button';
      btnDelivery.className = `delivery-tab-btn ${this.currentDeliveryType === CONFIG.DELIVERY_TYPES.DELIVERY ? 'is-active' : ''}`;
      btnDelivery.textContent = '🛵 Giao hàng tận nơi';
      btnDelivery.addEventListener('click', () => {
        this.currentDeliveryType = CONFIG.DELIVERY_TYPES.DELIVERY;
        this.renderCheckoutForm();
      });

      const btnPickup = document.createElement('button');
      btnPickup.type = 'button';
      btnPickup.className = `delivery-tab-btn ${this.currentDeliveryType === CONFIG.DELIVERY_TYPES.PICKUP ? 'is-active' : ''}`;
      btnPickup.textContent = '🏪 Đến lấy tại quán';
      btnPickup.addEventListener('click', () => {
        this.currentDeliveryType = CONFIG.DELIVERY_TYPES.PICKUP;
        this.renderCheckoutForm();
      });

      deliveryTabs.appendChild(btnDelivery);
      deliveryTabs.appendChild(btnPickup);
      leftCol.appendChild(deliveryTabs);

      // 2. Customer Information Form
      const customerSectionTitle = document.createElement('h3');
      customerSectionTitle.className = 'checkout-section-title';
      customerSectionTitle.textContent = 'Thông tin người nhận';
      leftCol.appendChild(customerSectionTitle);

      const formRow = document.createElement('div');
      formRow.className = 'form-row';

      // Full Name Input
      const nameGroup = document.createElement('div');
      nameGroup.className = 'form-group';
      const nameLabel = document.createElement('label');
      nameLabel.className = 'form-label';
      nameLabel.innerHTML = 'Họ và tên <span class="required">*</span>';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.id = 'checkout-customer-name';
      nameInput.className = 'form-input';
      nameInput.placeholder = 'Ví dụ: Nguyễn Văn A';
      nameInput.value = this.cachedName || '';
      nameInput.addEventListener('input', (e) => { this.cachedName = e.target.value; });
      const nameErr = document.createElement('span');
      nameErr.className = 'form-error-msg is-hidden';
      nameErr.id = 'err-customer-name';
      nameGroup.appendChild(nameLabel);
      nameGroup.appendChild(nameInput);
      nameGroup.appendChild(nameErr);
      formRow.appendChild(nameGroup);

      // Phone Input
      const phoneGroup = document.createElement('div');
      phoneGroup.className = 'form-group';
      const phoneLabel = document.createElement('label');
      phoneLabel.className = 'form-label';
      phoneLabel.innerHTML = 'Số điện thoại <span class="required">*</span>';
      const phoneInput = document.createElement('input');
      phoneInput.type = 'tel';
      phoneInput.id = 'checkout-customer-phone';
      phoneInput.className = 'form-input';
      phoneInput.placeholder = 'Ví dụ: 0987654321';
      phoneInput.value = this.cachedPhone || '';
      phoneInput.addEventListener('input', (e) => { this.cachedPhone = e.target.value; });
      const phoneErr = document.createElement('span');
      phoneErr.className = 'form-error-msg is-hidden';
      phoneErr.id = 'err-customer-phone';
      phoneGroup.appendChild(phoneLabel);
      phoneGroup.appendChild(phoneInput);
      phoneGroup.appendChild(phoneErr);
      formRow.appendChild(phoneGroup);

      leftCol.appendChild(formRow);

      // Address Input (if delivery)
      if (this.currentDeliveryType === CONFIG.DELIVERY_TYPES.DELIVERY) {
        const addrGroup = document.createElement('div');
        addrGroup.className = 'form-group';
        const addrLabel = document.createElement('label');
        addrLabel.className = 'form-label';
        addrLabel.innerHTML = 'Địa chỉ giao hàng <span class="required">*</span>';
        const addrInput = document.createElement('input');
        addrInput.type = 'text';
        addrInput.id = 'checkout-customer-address';
        addrInput.className = 'form-input';
        addrInput.placeholder = 'Số nhà, tên đường, phường/xã, quận/huyện...';
        addrInput.value = this.cachedAddress || '';
        addrInput.addEventListener('input', (e) => { this.cachedAddress = e.target.value; });
        const addrErr = document.createElement('span');
        addrErr.className = 'form-error-msg is-hidden';
        addrErr.id = 'err-customer-address';
        addrGroup.appendChild(addrLabel);
        addrGroup.appendChild(addrInput);
        addrGroup.appendChild(addrErr);
        leftCol.appendChild(addrGroup);
      }

      // Order Note Input
      const noteGroup = document.createElement('div');
      noteGroup.className = 'form-group';
      const noteLabel = document.createElement('label');
      noteLabel.className = 'form-label';
      noteLabel.textContent = 'Ghi chú đơn hàng (tùy chọn)';
      const noteInput = document.createElement('input');
      noteInput.type = 'text';
      noteInput.id = 'checkout-order-note';
      noteInput.className = 'form-input';
      noteInput.placeholder = 'Ví dụ: Tương ớt nhiều, gà ít cay, giao sau 12h...';
      noteInput.value = this.cachedNote || '';
      noteInput.addEventListener('input', (e) => { this.cachedNote = e.target.value; });
      noteGroup.appendChild(noteLabel);
      noteGroup.appendChild(noteInput);
      leftCol.appendChild(noteGroup);

      // 3. Payment Methods
      const paySectionTitle = document.createElement('h3');
      paySectionTitle.className = 'checkout-section-title';
      paySectionTitle.textContent = 'Phương thức thanh toán';
      leftCol.appendChild(paySectionTitle);

      const payList = document.createElement('div');
      payList.className = 'payment-methods-list';

      const methods = [
        {
          id: CONFIG.PAYMENT_METHODS.MOMO_QR,
          badgeClass: 'badge-momo',
          badgeText: 'MoMo',
          title: 'Mã QR Momo',
          sub: 'Quét mã QR MoMo trên điện thoại để thanh toán tức thì'
        },
        {
          id: CONFIG.PAYMENT_METHODS.ZALOPAY_QR,
          badgeClass: 'badge-zalopay',
          badgeText: 'ZaloPay',
          title: 'Mã QR Zalo Pay',
          sub: 'Quét mã qua ứng dụng Zalo hoặc ZaloPay siêu tiện lợi'
        },
        {
          id: CONFIG.PAYMENT_METHODS.ATM,
          badgeClass: 'badge-atm',
          badgeText: 'ATM',
          title: 'ATM',
          sub: 'Thẻ ATM nội địa / Internet Banking liên kết qua Napas'
        },
        {
          id: CONFIG.PAYMENT_METHODS.COD,
          badgeClass: 'badge-cash',
          badgeText: 'Tiền mặt',
          title: 'Tiền mặt',
          sub: 'Thanh toán trực tiếp bằng tiền mặt khi nhận hàng (COD)'
        }
      ];

      methods.forEach(m => {
        const item = document.createElement('label');
        item.className = `payment-method-item ${this.currentPaymentMethod === m.id ? 'is-selected' : ''}`;

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'payment-method-choice';
        radio.className = 'payment-radio';
        radio.value = m.id;
        radio.checked = this.currentPaymentMethod === m.id;
        radio.addEventListener('change', () => {
          this.currentPaymentMethod = m.id;
          this.renderCheckoutForm();
        });

        const badge = document.createElement('span');
        badge.className = `payment-brand-badge ${m.badgeClass}`;
        badge.textContent = m.badgeText;

        const details = document.createElement('div');
        details.className = 'payment-method-details';
        const titleSpan = document.createElement('span');
        titleSpan.className = 'payment-method-title';
        titleSpan.textContent = m.title;
        const subSpan = document.createElement('span');
        subSpan.className = 'payment-method-sub';
        subSpan.textContent = m.sub;
        details.appendChild(titleSpan);
        details.appendChild(subSpan);

        item.appendChild(radio);
        item.appendChild(badge);
        item.appendChild(details);
        payList.appendChild(item);
      });

      leftCol.appendChild(payList);

      // Dynamic sub-panel for payment details
      leftCol.appendChild(this.createPaymentExtraPanel());

      grid.appendChild(leftCol);

      // Right Column: Order Summary & Voucher
      const rightCol = document.createElement('div');
      rightCol.className = 'checkout-right-col';
      rightCol.appendChild(this.createOrderSummaryCard());
      grid.appendChild(rightCol);

      body.appendChild(grid);
    }

    /**
     * Sub-panel displaying contextual payment info
     */
    createPaymentExtraPanel() {
      const panel = document.createElement('div');
      panel.className = 'payment-extra-panel';

      if (this.currentPaymentMethod === CONFIG.PAYMENT_METHODS.MOMO_QR || this.currentPaymentMethod === 'momo') {
        const qrBox = document.createElement('div');
        qrBox.className = 'qr-payment-box momo-theme';

        const qrCode = document.createElement('div');
        qrCode.className = 'qr-code-graphic momo-qr';
        qrCode.innerHTML = `<span>[QR CODE]</span><span class="qr-center-logo momo">MoMo</span>`;

        const qrInfo = document.createElement('div');
        qrInfo.className = 'qr-transfer-info';
        qrInfo.innerHTML = `
          <strong>Thanh toán qua Ví MoMo</strong>
          <span>Đơn vị nhận: <strong>KFC VIETNAM OFFICIAL</strong></span>
          <ol>
            <li>Mở ứng dụng <strong>MoMo</strong> trên điện thoại</li>
            <li>Chọn <strong>"Quét Mã"</strong> và quét mã QR này</li>
            <li>Kiểm tra số tiền và bấm <strong>"Xác nhận thanh toán"</strong></li>
          </ol>
        `;

        qrBox.appendChild(qrCode);
        qrBox.appendChild(qrInfo);
        panel.appendChild(qrBox);
      } else if (this.currentPaymentMethod === CONFIG.PAYMENT_METHODS.ZALOPAY_QR || this.currentPaymentMethod === 'zalopay') {
        const qrBox = document.createElement('div');
        qrBox.className = 'qr-payment-box zalopay-theme';

        const qrCode = document.createElement('div');
        qrCode.className = 'qr-code-graphic zalopay-qr';
        qrCode.innerHTML = `<span>[QR CODE]</span><span class="qr-center-logo zalopay">ZaloPay</span>`;

        const qrInfo = document.createElement('div');
        qrInfo.className = 'qr-transfer-info';
        qrInfo.innerHTML = `
          <strong>Thanh toán qua ZaloPay / Zalo</strong>
          <span>Đơn vị nhận: <strong>KFC VIETNAM FASTFOOD</strong></span>
          <ol>
            <li>Mở ứng dụng <strong>Zalo</strong> hoặc <strong>ZaloPay</strong></li>
            <li>Chọn biểu tượng <strong>[Quét QR]</strong></li>
            <li>Kiểm tra thông tin món ăn và bấm <strong>"Thanh toán"</strong></li>
          </ol>
        `;

        qrBox.appendChild(qrCode);
        qrBox.appendChild(qrInfo);
        panel.appendChild(qrBox);
      } else if (this.currentPaymentMethod === CONFIG.PAYMENT_METHODS.ATM || this.currentPaymentMethod === 'card') {
        const bankContainer = document.createElement('div');
        bankContainer.className = 'bank-selection-container';

        const bankLabel = document.createElement('label');
        bankLabel.className = 'form-label';
        bankLabel.textContent = 'Chọn ngân hàng phát hành thẻ ATM:';
        bankContainer.appendChild(bankLabel);

        const bankChipsGrid = document.createElement('div');
        bankChipsGrid.className = 'bank-chips-grid';

        const banks = ['Vietcombank', 'MBBank', 'Techcombank', 'BIDV', 'VietinBank', 'Agribank', 'ACB', 'VPBank', 'TPBank'];
        banks.forEach(b => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `bank-chip ${this.selectedBank === b ? 'is-selected' : ''}`;
          chip.textContent = b;
          chip.addEventListener('click', () => {
            this.selectedBank = b;
            this.renderCheckoutForm();
          });
          bankChipsGrid.appendChild(chip);
        });
        bankContainer.appendChild(bankChipsGrid);
        panel.appendChild(bankContainer);

        const cardForm = document.createElement('div');
        cardForm.className = 'form-row';
        cardForm.innerHTML = `
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Số thẻ ATM (16 số) <span class="required">*</span></label>
            <input type="text" id="checkout-card-number" class="form-input" placeholder="9704 0000 1234 5678" maxlength="19" value="${this.cachedCardNumber || ''}">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Hết hạn (MM/YY)</label>
            <input type="text" id="checkout-card-expiry" class="form-input" placeholder="12/28" maxlength="5" value="${this.cachedCardExpiry || ''}">
          </div>
        `;
        panel.appendChild(cardForm);
      } else {
        // COD / Tiền mặt
        const cashBox = document.createElement('div');
        cashBox.className = 'cash-options-box';

        const cashLabel = document.createElement('label');
        cashLabel.className = 'form-label';
        cashLabel.textContent = 'Lựa chọn tiền thối cho Shipper (nếu có):';
        cashBox.appendChild(cashLabel);

        const cashChipsGrid = document.createElement('div');
        cashChipsGrid.className = 'cash-change-chips';

        const cashOpts = ['Trả đúng số tiền', 'Cần thối từ 100.000đ', 'Cần thối từ 200.000đ', 'Cần thối từ 500.000đ'];
        cashOpts.forEach(opt => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = `cash-chip ${this.selectedCashChange === opt ? 'is-selected' : ''}`;
          chip.textContent = opt;
          chip.addEventListener('click', () => {
            this.selectedCashChange = opt;
            this.renderCheckoutForm();
          });
          cashChipsGrid.appendChild(chip);
        });
        cashBox.appendChild(cashChipsGrid);

        const noteText = document.createElement('p');
        noteText.style.marginTop = '10px';
        noteText.style.color = '#64748B';
        noteText.style.fontSize = '0.8rem';
        noteText.textContent = '💡 Bạn có thể thanh toán trực tiếp bằng tiền mặt khi shipper giao hàng tới nơi hoặc khi nhận tại quầy.';
        cashBox.appendChild(noteText);

        panel.appendChild(cashBox);
      }

      return panel;
    }

    /**
     * Create Order Summary & Calculation Card
     */
    createOrderSummaryCard() {
      const card = document.createElement('div');
      card.className = 'checkout-summary-card';

      const summaryTitle = document.createElement('h3');
      summaryTitle.className = 'checkout-section-title';
      summaryTitle.textContent = 'Tóm tắt đơn hàng';
      card.appendChild(summaryTitle);

      // Cart Items List
      const cartItems = this.getCart();
      const itemsList = document.createElement('div');
      itemsList.className = 'checkout-items-list';

      cartItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'checkout-item-row';

        const info = document.createElement('div');
        info.className = 'checkout-item-info';

        const img = document.createElement('img');
        img.className = 'checkout-item-thumb';
        img.src = item.image || 'assets/images/hero-chicken.svg';
        img.alt = item.name || '';
        img.loading = 'lazy';

        const textDiv = document.createElement('div');
        const titleSpan = document.createElement('div');
        titleSpan.className = 'checkout-item-title';
        titleSpan.textContent = item.name || 'Món ăn';
        const qtySpan = document.createElement('div');
        qtySpan.className = 'checkout-item-qty';
        qtySpan.textContent = `Số lượng: ${item.quantity || 1}`;

        textDiv.appendChild(titleSpan);
        textDiv.appendChild(qtySpan);
        info.appendChild(img);
        info.appendChild(textDiv);

        const priceSpan = document.createElement('div');
        priceSpan.className = 'checkout-item-price';
        const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        priceSpan.textContent = formatMoney(lineTotal);

        row.appendChild(info);
        row.appendChild(priceSpan);
        itemsList.appendChild(row);
      });

      card.appendChild(itemsList);

      // Voucher input box
      const voucherBox = document.createElement('div');
      voucherBox.className = 'voucher-box';

      const voucherForm = document.createElement('div');
      voucherForm.className = 'voucher-form-box';

      const voucherInput = document.createElement('input');
      voucherInput.type = 'text';
      voucherInput.className = 'voucher-input';
      voucherInput.placeholder = 'Mã giảm giá (KFC30, FREESHIP...)';
      voucherInput.value = this.appliedVoucherCode;

      const voucherBtn = document.createElement('button');
      voucherBtn.type = 'button';
      voucherBtn.className = 'voucher-apply-btn';
      voucherBtn.textContent = 'Áp Dụng';

      const voucherMsg = document.createElement('span');
      voucherMsg.className = 'voucher-status-msg';

      voucherBtn.addEventListener('click', () => {
        const val = voucherInput.value.trim().toUpperCase();
        if (!val) {
          this.appliedVoucherCode = '';
          this.renderCheckoutForm();
          return;
        }

        const summary = CheckoutCalculator.calculateOrderSummary({
          cartItems,
          deliveryType: this.currentDeliveryType,
          voucherCode: val
        });

        if (summary.voucherResult.isValid) {
          this.appliedVoucherCode = val;
          this.renderCheckoutForm();
        } else {
          voucherMsg.textContent = summary.voucherResult.error || 'Mã không hợp lệ';
          voucherMsg.className = 'voucher-status-msg is-error';
        }
      });

      voucherForm.appendChild(voucherInput);
      voucherForm.appendChild(voucherBtn);
      voucherBox.appendChild(voucherForm);
      voucherBox.appendChild(voucherMsg);
      card.appendChild(voucherBox);

      // Calculations table
      const summary = CheckoutCalculator.calculateOrderSummary({
        cartItems,
        deliveryType: this.currentDeliveryType,
        voucherCode: this.appliedVoucherCode
      });

      const calcTable = document.createElement('div');
      calcTable.className = 'checkout-calc-table';

      // Subtotal
      const subRow = document.createElement('div');
      subRow.className = 'calc-row';
      subRow.innerHTML = `<span>Tạm tính (${summary.itemsCount} món)</span><span>${formatMoney(summary.subtotal)}</span>`;
      calcTable.appendChild(subRow);

      // Shipping fee
      const shipRow = document.createElement('div');
      shipRow.className = 'calc-row';
      const shipText = this.currentDeliveryType === CONFIG.DELIVERY_TYPES.PICKUP
        ? 'Miễn phí (Lấy tại quán)'
        : (summary.shippingFee === 0 ? '0 đ (Freeship)' : formatMoney(summary.shippingFee));
      shipRow.innerHTML = `<span>Phí giao hàng</span><span>${shipText}</span>`;
      calcTable.appendChild(shipRow);

      // Discount
      if (summary.discount > 0) {
        const discRow = document.createElement('div');
        discRow.className = 'calc-row discount-row';
        discRow.innerHTML = `<span>Giảm giá voucher (${this.appliedVoucherCode})</span><span>-${formatMoney(summary.discount)}</span>`;
        calcTable.appendChild(discRow);
      }

      // Total
      const totalRow = document.createElement('div');
      totalRow.className = 'calc-row total-row';
      totalRow.innerHTML = `<span>Tổng thanh toán</span><span>${formatMoney(summary.total)}</span>`;
      calcTable.appendChild(totalRow);

      card.appendChild(calcTable);
      return card;
    }

    /**
     * Submit Order Handler
     */
    async handleSubmit() {
      if (this.isSubmitting) return;

      const submitBtn = document.getElementById('checkout-submit-btn');
      const cartItems = this.getCart();

      // Collect form inputs safely
      const nameInput = document.getElementById('checkout-customer-name');
      const phoneInput = document.getElementById('checkout-customer-phone');
      const addrInput = document.getElementById('checkout-customer-address');
      const noteInput = document.getElementById('checkout-order-note');
      const cardNumInput = document.getElementById('checkout-card-number');
      const cardExpInput = document.getElementById('checkout-card-expiry');

      if (cardNumInput) this.cachedCardNumber = cardNumInput.value;
      if (cardExpInput) this.cachedCardExpiry = cardExpInput.value;

      const orderData = {
        customerName: nameInput ? nameInput.value : '',
        phone: phoneInput ? phoneInput.value : '',
        address: addrInput ? addrInput.value : '',
        note: noteInput ? noteInput.value : '',
        deliveryType: this.currentDeliveryType,
        paymentMethod: this.currentPaymentMethod,
        selectedBank: this.selectedBank,
        cashChange: this.selectedCashChange,
        voucherCode: this.appliedVoucherCode,
        cardNumber: cardNumInput ? cardNumInput.value : '',
        cardExpiry: cardExpInput ? cardExpInput.value : ''
      };

      // Reset inline errors
      document.querySelectorAll('.form-error-msg').forEach(el => el.classList.add('is-hidden'));
      document.querySelectorAll('.form-input').forEach(el => el.classList.remove('has-error'));

      // Validate
      const validation = CheckoutValidator.validateOrder(orderData, cartItems);
      if (!validation.isValid) {
        // Highlight specific fields
        if (validation.errors.customerName && nameInput) {
          nameInput.classList.add('has-error');
          const err = document.getElementById('err-customer-name');
          if (err) { err.textContent = validation.errors.customerName; err.classList.remove('is-hidden'); }
        }
        if (validation.errors.phone && phoneInput) {
          phoneInput.classList.add('has-error');
          const err = document.getElementById('err-customer-phone');
          if (err) { err.textContent = validation.errors.phone; err.classList.remove('is-hidden'); }
        }
        if (validation.errors.address && addrInput) {
          addrInput.classList.add('has-error');
          const err = document.getElementById('err-customer-address');
          if (err) { err.textContent = validation.errors.address; err.classList.remove('is-hidden'); }
        }
        if (validation.errors.card) {
          alert(validation.errors.card);
        }
        return;
      }

      // Enter loading state
      this.isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="btn-spinner"></span> Đang xử lý...';
      }

      try {
        const completedOrder = await PaymentService.processPayment(orderData, cartItems);
        this.renderReceiptView(completedOrder);
        this.onSuccess(completedOrder);
      } catch (err) {
        console.error('Lỗi thanh toán:', err);
        alert(err.message || 'Có lỗi xảy ra khi xử lý đơn hàng.');
      } finally {
        this.isSubmitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Xác Nhận Đặt Hàng';
        }
      }
    }

    /**
     * Render Order Receipt confirmation screen
     */
    renderReceiptView(order) {
      const body = document.getElementById('checkout-modal-body');
      const footer = this.overlay.querySelector('.checkout-footer');
      if (!body) return;

      if (footer) footer.style.display = 'none';

      while (body.firstChild) {
        body.removeChild(body.firstChild);
      }

      const receipt = document.createElement('div');
      receipt.className = 'receipt-view';

      const icon = document.createElement('div');
      icon.className = 'receipt-success-icon';
      icon.textContent = '✓';

      const title = document.createElement('h3');
      title.className = 'receipt-title';
      title.textContent = 'Đặt Hàng & Thanh Toán Thành Công!';

      const orderIdSpan = document.createElement('p');
      orderIdSpan.className = 'receipt-order-id';
      orderIdSpan.innerHTML = `Mã đơn hàng: <strong>${order.orderId}</strong> | Thời gian: ${new Date(order.createdAt).toLocaleTimeString('vi-VN')}`;

      const card = document.createElement('div');
      card.className = 'receipt-card';

      card.innerHTML = `
        <div class="receipt-detail-line">
          <span>Người nhận:</span>
          <strong>${order.customer.name} (${order.customer.phone})</strong>
        </div>
        <div class="receipt-detail-line">
          <span>Hình thức:</span>
          <span>${order.delivery.type === CONFIG.DELIVERY_TYPES.DELIVERY ? 'Giao hàng tận nơi' : 'Nhận tại cửa hàng'}</span>
        </div>
        <div class="receipt-detail-line">
          <span>Địa chỉ:</span>
          <span>${order.customer.address}</span>
        </div>
        <div class="receipt-detail-line">
          <span>Phương thức:</span>
          <span>${order.payment.note}</span>
        </div>
        <div class="receipt-detail-line">
          <span>Dự kiến hoàn thành:</span>
          <span>Khoảng 30 phút</span>
        </div>
        <div class="receipt-detail-line highlight">
          <span>Tổng thanh toán:</span>
          <span>${formatMoney(order.summary.total)}</span>
        </div>
      `;

      const closeActionBtn = document.createElement('button');
      closeActionBtn.type = 'button';
      closeActionBtn.className = 'btn btn-primary btn-lg';
      closeActionBtn.textContent = 'Hoàn Tất & Đóng';
      closeActionBtn.addEventListener('click', () => {
        if (footer) footer.style.display = '';
        this.close();
      });

      receipt.appendChild(icon);
      receipt.appendChild(title);
      receipt.appendChild(orderIdSpan);
      receipt.appendChild(card);
      receipt.appendChild(closeActionBtn);

      body.appendChild(receipt);
    }
  }

  // ==========================================================================
  // 7. Public API Export
  // ==========================================================================
  return {
    CONFIG,
    VOUCHER_CATALOG,
    formatMoney,
    CheckoutValidator,
    CheckoutCalculator,
    PaymentService,
    CheckoutModal
  };
});
