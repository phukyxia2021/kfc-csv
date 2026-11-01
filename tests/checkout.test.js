/**
 * KFC Landing Page - Rigorous Test Suite for Module 2: Thanh Toán (Checkout & Payment)
 * Executable in Node.js environment
 */

const assert = require('assert');
const path = require('path');
const KfcCheckout = require('../js/checkout.js');

const {
  CONFIG,
  VOUCHER_CATALOG,
  formatMoney,
  CheckoutValidator,
  CheckoutCalculator,
  PaymentService
} = KfcCheckout;

let passCount = 0;
let failCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    -> ${err.message}`);
    failCount++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    -> ${err.message}`);
    failCount++;
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ MODULE THANH TOÁN (CHECKOUT)');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // GROUP 1: Formatters
  // --------------------------------------------------------------------------
  console.log('--- 1. Kiểm thử định dạng tiền tệ (formatMoney) ---');
  
  runTest('Định dạng 39000 thành 39.000 đ', () => {
    assert.strictEqual(formatMoney(39000), '39.000 đ');
  });

  runTest('Định dạng 0 thành 0 đ', () => {
    assert.strictEqual(formatMoney(0), '0 đ');
  });

  runTest('Định dạng chuỗi không hợp lệ trả về 0 đ', () => {
    assert.strictEqual(formatMoney('abc'), '0 đ');
  });

  // --------------------------------------------------------------------------
  // GROUP 2: CheckoutValidator - Full Name
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Kiểm thử hợp lệ họ tên (validateFullName) ---');

  runTest('Họ tên tiếng Việt có dấu hợp lệ', () => {
    const res = CheckoutValidator.validateFullName('Nguyễn Văn An');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.error, null);
  });

  runTest('Họ tên tiếng Việt phức tạp có chữ Đ', () => {
    const res = CheckoutValidator.validateFullName('Trần Thị Thu Thảo');
    assert.strictEqual(res.isValid, true);
  });

  runTest('Từ chối họ tên rỗng hoặc khoảng trắng', () => {
    assert.strictEqual(CheckoutValidator.validateFullName('').isValid, false);
    assert.strictEqual(CheckoutValidator.validateFullName('   ').isValid, false);
    assert.strictEqual(CheckoutValidator.validateFullName(null).isValid, false);
  });

  runTest('Từ chối họ tên quá ngắn (< 2 ký tự)', () => {
    assert.strictEqual(CheckoutValidator.validateFullName('A').isValid, false);
  });

  runTest('Từ chối họ tên chứa chữ số', () => {
    assert.strictEqual(CheckoutValidator.validateFullName('Nguyễn Văn 123').isValid, false);
  });

  runTest('Từ chối họ tên chứa thẻ script độc hại (Anti-XSS)', () => {
    assert.strictEqual(CheckoutValidator.validateFullName('<script>alert(1)</script>').isValid, false);
  });

  // --------------------------------------------------------------------------
  // GROUP 3: CheckoutValidator - Phone Number
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Kiểm thử số điện thoại Việt Nam (validatePhone) ---');

  const validPhones = ['0901234567', '0389998888', '0776543210', '0868889999', '0581234567', '+84901234567'];
  validPhones.forEach(phone => {
    runTest(`Chấp nhận số điện thoại hợp lệ: ${phone}`, () => {
      const res = CheckoutValidator.validatePhone(phone);
      assert.strictEqual(res.isValid, true);
    });
  });

  const invalidPhones = ['0123456789', '090123456', '09012345678', '09012abcde', '', '   ', '0201234567'];
  invalidPhones.forEach(phone => {
    runTest(`Từ chối số điện thoại sai định dạng: "${phone}"`, () => {
      const res = CheckoutValidator.validatePhone(phone);
      assert.strictEqual(res.isValid, false);
    });
  });

  // --------------------------------------------------------------------------
  // GROUP 4: CheckoutValidator - Address & Delivery Type
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Kiểm thử địa chỉ theo hình thức giao hàng (validateAddress) ---');

  runTest('Hình thức giao hàng tận nơi: địa chỉ hợp lệ', () => {
    const res = CheckoutValidator.validateAddress('123 Nguyễn Thị Minh Khai, Phường 6, Quận 3', 'delivery');
    assert.strictEqual(res.isValid, true);
  });

  runTest('Hình thức giao hàng tận nơi: từ chối địa chỉ rỗng', () => {
    const res = CheckoutValidator.validateAddress('', 'delivery');
    assert.strictEqual(res.isValid, false);
  });

  runTest('Hình thức giao hàng tận nơi: từ chối địa chỉ quá ngắn (< 5 ký tự)', () => {
    const res = CheckoutValidator.validateAddress('123', 'delivery');
    assert.strictEqual(res.isValid, false);
  });

  runTest('Hình thức đến lấy tại quán: địa chỉ để trống vẫn hợp lệ', () => {
    const res = CheckoutValidator.validateAddress('', 'pickup');
    assert.strictEqual(res.isValid, true);
  });

  // --------------------------------------------------------------------------
  // GROUP 5: CheckoutValidator - Payment Methods
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Kiểm thử phương thức thanh toán (validatePaymentMethod) ---');

  const requiredMethods = ['momo_qr', 'zalopay_qr', 'atm', 'cod'];
  requiredMethods.forEach(method => {
    runTest(`Chấp nhận phương thức theo yêu cầu: ${method}`, () => {
      assert.strictEqual(CheckoutValidator.validatePaymentMethod(method).isValid, true);
    });
  });

  const aliasMethods = ['momo', 'card', 'vietqr'];
  aliasMethods.forEach(method => {
    runTest(`Chấp nhận bí danh tương thích ngược: ${method}`, () => {
      assert.strictEqual(CheckoutValidator.validatePaymentMethod(method).isValid, true);
    });
  });

  ['bitcoin', 'paypal', 'applepay', '', null, 'unknown_method'].forEach(method => {
    runTest(`Từ chối phương thức không hỗ trợ: ${method}`, () => {
      assert.strictEqual(CheckoutValidator.validatePaymentMethod(method).isValid, false);
    });
  });

  // --------------------------------------------------------------------------
  // GROUP 6: CheckoutCalculator - Subtotal & Shipping Fee
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Kiểm thử tính toán tạm tính & phí ship (CheckoutCalculator) ---');

  runTest('Tạm tính giỏ hàng nhiều món và số lượng khác nhau', () => {
    const items = [
      { id: 'P1', price: 39000, quantity: 2 }, // 78.000
      { id: 'P2', price: 22000, quantity: 1 }, // 22.000
      { id: 'P3', price: 18000, quantity: 3 }  // 54.000
    ];
    const subtotal = CheckoutCalculator.calculateSubtotal(items);
    assert.strictEqual(subtotal, 154000);
  });

  runTest('Phí ship mặc định 20.000đ khi đơn dưới 150.000đ', () => {
    const fee = CheckoutCalculator.calculateShippingFee(120000, 'delivery');
    assert.strictEqual(fee, 20000);
  });

  runTest('Freeship (0đ) khi đơn hàng từ 150.000đ trở lên', () => {
    const fee150k = CheckoutCalculator.calculateShippingFee(150000, 'delivery');
    const fee200k = CheckoutCalculator.calculateShippingFee(200000, 'delivery');
    assert.strictEqual(fee150k, 0);
    assert.strictEqual(fee200k, 0);
  });

  runTest('Phí ship là 0đ khi chọn đến lấy tại quán (pickup) bất kể giá trị đơn', () => {
    const fee = CheckoutCalculator.calculateShippingFee(50000, 'pickup');
    assert.strictEqual(fee, 0);
  });

  // --------------------------------------------------------------------------
  // GROUP 7: CheckoutCalculator - Voucher Discount
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Kiểm thử mã giảm giá (Vouchers) ---');

  runTest('Voucher KFC30: giảm 30% khi đơn >= 100k', () => {
    const res = CheckoutCalculator.calculateDiscount(120000, 'KFC30');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.discountAmount, 36000); // 30% of 120.000
  });

  runTest('Voucher KFC30: áp dụng mức giảm tối đa 50.000đ khi đơn lớn', () => {
    const res = CheckoutCalculator.calculateDiscount(300000, 'KFC30');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.discountAmount, 50000); // Capped at 50.000
  });

  runTest('Voucher KFC30: từ chối khi đơn hàng chưa đạt mức tối thiểu 100k', () => {
    const res = CheckoutCalculator.calculateDiscount(80000, 'KFC30');
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(res.discountAmount, 0);
  });

  runTest('Voucher FREESHIP: giảm phí giao hàng 20.000đ', () => {
    const res = CheckoutCalculator.calculateDiscount(100000, 'FREESHIP', 20000);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.discountAmount, 20000);
  });

  runTest('Voucher GIAM20K: giảm 20.000đ cố định cho đơn từ 60.000đ', () => {
    const res = CheckoutCalculator.calculateDiscount(75000, 'GIAM20K');
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.discountAmount, 20000);
  });

  runTest('Voucher không tồn tại: trả về isValid false kèm thông báo lỗi', () => {
    const res = CheckoutCalculator.calculateDiscount(100000, 'MA_KHONG_TON_TAI');
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error);
  });

  // --------------------------------------------------------------------------
  // GROUP 8: Comprehensive Order Total Calculation
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Kiểm thử tính tổng hóa đơn hoàn chỉnh ---');

  runTest('Tính toán tổng hóa đơn: Subtotal 120k + Ship 20k - Voucher GIAM20K = 120k', () => {
    const items = [
      { id: 'P1', price: 60000, quantity: 2 }
    ];
    const summary = CheckoutCalculator.calculateOrderSummary({
      cartItems: items,
      deliveryType: 'delivery',
      voucherCode: 'GIAM20K'
    });

    assert.strictEqual(summary.subtotal, 120000);
    assert.strictEqual(summary.shippingFee, 20000);
    assert.strictEqual(summary.discount, 20000);
    assert.strictEqual(summary.total, 120000);
  });

  runTest('Tính toán tổng hóa đơn: Subtotal 200k + Ship 0k (Freeship) - Voucher KFC30 (50k) = 150k', () => {
    const items = [
      { id: 'P1', price: 100000, quantity: 2 }
    ];
    const summary = CheckoutCalculator.calculateOrderSummary({
      cartItems: items,
      deliveryType: 'delivery',
      voucherCode: 'KFC30'
    });

    assert.strictEqual(summary.subtotal, 200000);
    assert.strictEqual(summary.shippingFee, 0);
    assert.strictEqual(summary.discount, 50000);
    assert.strictEqual(summary.total, 150000);
  });

  // --------------------------------------------------------------------------
  // GROUP 9: PaymentService & Transaction Processing
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Kiểm thử xử lý thanh toán (PaymentService) ---');

  runTest('Tạo mã đơn hàng chuẩn định dạng KFC-YYYYMMDD-XXXX', () => {
    const id = PaymentService.generateOrderId();
    const regex = /^KFC-\d{8}-[A-Z0-9]{4}$/;
    assert.ok(regex.test(id), `Order ID ${id} không khớp regex`);
  });

  await runAsyncTest('Xử lý thành công đơn hàng Tiền mặt (COD)', async () => {
    const orderData = {
      customerName: 'Hoàng Minh Quân',
      phone: '0912345678',
      address: '456 Hai Bà Trưng, Phường Tân Định, Quận 1',
      deliveryType: 'delivery',
      paymentMethod: 'cod',
      cashChange: 'Cần thối từ 500.000đ',
      voucherCode: 'GIAM20K',
      note: 'Vui lòng giao trước 11h30'
    };
    const cartItems = [
      { id: 'P001', name: 'Gà Rán Giòn Cay', price: 39000, quantity: 2 }
    ];

    const completed = await PaymentService.processPayment(orderData, cartItems);
    assert.ok(completed.orderId.startsWith('KFC-'));
    assert.strictEqual(completed.customer.name, 'Hoàng Minh Quân');
    assert.strictEqual(completed.payment.method, 'cod');
    assert.strictEqual(completed.payment.status, 'PENDING_CASH_ON_DELIVERY');
    assert.ok(completed.payment.note.includes('Tiền mặt'));
    assert.strictEqual(completed.summary.subtotal, 78000);
    assert.strictEqual(completed.summary.total, 78000); // 78k + 20k ship - 20k voucher = 78k
  });

  await runAsyncTest('Xử lý thành công đơn hàng Mã QR Momo', async () => {
    const orderData = {
      customerName: 'Nguyễn Thị Mai',
      phone: '0909888777',
      address: '12 Nguyễn Trãi, Quận 5',
      deliveryType: 'delivery',
      paymentMethod: 'momo_qr'
    };
    const cartItems = [
      { id: 'P005', name: 'Burger Gà Giòn Zinger', price: 59000, quantity: 2 }
    ];

    const completed = await PaymentService.processPayment(orderData, cartItems);
    assert.strictEqual(completed.payment.method, 'momo_qr');
    assert.strictEqual(completed.payment.status, 'AWAITING_MOMO_QR_SCAN');
    assert.ok(completed.payment.note.includes('Mã QR MoMo'));
    assert.ok(completed.payment.note.includes(completed.orderId));
  });

  await runAsyncTest('Xử lý thành công đơn hàng Mã QR Zalo Pay', async () => {
    const orderData = {
      customerName: 'Lê Hữu Đạt',
      phone: '0987654321',
      address: '789 Điện Biên Phủ, Bình Thạnh',
      deliveryType: 'delivery',
      paymentMethod: 'zalopay_qr'
    };
    const cartItems = [
      { id: 'P006', name: 'Combo Gà Rán 1 Người', price: 75000, quantity: 2 }
    ];

    const completed = await PaymentService.processPayment(orderData, cartItems);
    assert.strictEqual(completed.payment.method, 'zalopay_qr');
    assert.strictEqual(completed.payment.status, 'AWAITING_ZALOPAY_QR_SCAN');
    assert.ok(completed.payment.note.includes('Mã QR Zalo Pay'));
    assert.ok(completed.payment.note.includes(completed.orderId));
  });

  await runAsyncTest('Xử lý thành công đơn hàng thẻ ATM nội địa', async () => {
    const orderData = {
      customerName: 'Trần Văn Nam',
      phone: '0903112233',
      address: '',
      deliveryType: 'pickup',
      paymentMethod: 'atm',
      selectedBank: 'Vietcombank',
      cardNumber: '9704000012345678',
      cardExpiry: '10/29'
    };
    const cartItems = [
      { id: 'P005', name: 'Burger Gà Giòn Zinger', price: 59000, quantity: 1 }
    ];

    const completed = await PaymentService.processPayment(orderData, cartItems);
    assert.strictEqual(completed.payment.method, 'atm');
    assert.strictEqual(completed.payment.status, 'PAID_ATM_SIMULATED');
    assert.ok(completed.payment.note.includes('Thẻ ATM nội địa'));
    assert.ok(completed.payment.note.includes('Vietcombank'));
    assert.strictEqual(completed.delivery.type, 'pickup');
  });

  await runAsyncTest('Từ chối đơn hàng khi giỏ hàng trống', async () => {
    const orderData = {
      customerName: 'Nguyễn Văn A',
      phone: '0901234567',
      address: '123 Đường ABC',
      deliveryType: 'delivery',
      paymentMethod: 'cod'
    };

    let errorThrown = false;
    try {
      await PaymentService.processPayment(orderData, []);
    } catch (e) {
      errorThrown = true;
      assert.ok(e.details && e.details.cart);
    }
    assert.strictEqual(errorThrown, true, 'Hệ thống phải chặn thanh toán khi giỏ rỗng');
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`🏁 KẾT QUẢ KIỂM THỬ: ${passCount} PASSED | ${failCount} FAILED`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
