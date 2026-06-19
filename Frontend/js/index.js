const API_URL = 'http://localhost:5262/api';
// ===== جلب اسم ووصف المطعم =====
async function loadRestaurantSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const settings = await res.json();

        document.getElementById('restaurantName').textContent = settings.name;
        document.getElementById('restaurantDescription').textContent = settings.description;
        document.title = settings.name + ' - منيو إلكتروني';
    } catch {
        console.log('تعذر تحميل بيانات المطعم');
    }
}

window.addEventListener('load', () => {
    loadRestaurantSettings();
});
// ===== بيانات المنيو (يتم تحميلها من قاعدة البيانات) =====
let menuData = {};

let cart = [];
let currentCategory = null;
let pageHistory = [];
let currentEditItemId = null;
let selectedPayment = null;

// ===== جلب المنيو من قاعدة البيانات =====
async function loadMenuData() {
    try {
        const res = await fetch(`${API_URL}/menu`);
        const categories = await res.json();

        const data = {};
        categories.forEach(cat => {
            data[cat.id] = {
                name: cat.name,
                icon: cat.icon,
                image: cat.image,
                items: (cat.items || []).map(item => ({
                    id: String(item.id),
                    name: item.name,
                    description: item.description,
                    price: item.price,
                    image: item.image,
                    badge: item.badge
                }))
            };
        });

        menuData = data;
    } catch (err) {
        showNotification('تعذر تحميل المنيو من السيرفر');
    }
}

// ===== التنقل بين الصفحات =====
async function showCategories() {
    pageHistory = [];
    document.getElementById('welcomePage').classList.add('hidden');
    document.getElementById('navbar').style.display = 'flex';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('categoriesPage').classList.add('active');
    document.getElementById('catBackBtn').style.display = 'none';

    if (Object.keys(menuData).length === 0) {
        await loadMenuData();
    }

    renderCategories();
}

function showItems(categoryKey) {
    pageHistory.push('categories');
    currentCategory = categoryKey;
    const category = menuData[categoryKey];
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('itemsPage').classList.add('active');
    document.getElementById('itemsTitle').textContent = category.name;
    renderItems(category);
}

function goBack() {
    if (pageHistory.length > 0) {
        pageHistory.pop();
        showCategories();
    }
}

// ===== عرض التصنيفات =====
function renderCategories() {
    const grid = document.getElementById('categoriesGrid');

    if (Object.keys(menuData).length === 0) {
        grid.innerHTML = `<p style="text-align:center; padding:2rem; color:#888;">لا توجد تصنيفات متاحة حالياً</p>`;
        return;
    }

    grid.innerHTML = Object.keys(menuData).map(key => {
        const cat = menuData[key];
        return `
            <div class="category-card" onclick="showItems('${key}')">
                <div class="category-image">
                    <img src="${cat.image}" alt="${cat.name}" loading="lazy">
                    <div class="category-overlay">
                        <i class="fas ${cat.icon}"></i>
                    </div>
                </div>
                <div class="category-info">
                    <h3 class="category-name">${cat.name}</h3>
                    <p class="category-count">${cat.items.length} صنف</p>
                </div>
            </div>
        `;
    }).join('');
}

// ===== عرض الأصناف =====
function renderItems(category) {
    const grid = document.getElementById('itemsGrid');
    grid.innerHTML = category.items.map(item => `
        <div class="item-card">
            <div class="item-image">
                <img src="${item.image}" alt="${item.name}" loading="lazy">
                ${item.badge ? `<span class="item-badge">${item.badge}</span>` : ''}
            </div>
            <div class="item-details">
                <h3 class="item-name">${item.name}</h3>
                <p class="item-description">${item.description}</p>
                <div class="item-footer">
                    <span class="item-price">${item.price.toLocaleString()} ل.س</span>
                    <button class="add-to-cart-btn" onclick="addToCart('${item.id}')">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== إدارة السلة =====
function addToCart(itemId) {
    const item = findItem(itemId);
    if (!item) return;
    const existing = cart.find(c => c.id === itemId);

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...item, quantity: 1, note: '' });
    }

    updateCart();
    showNotification('تمت الإضافة للسلة!');
}

function findItem(itemId) {
    for (let key in menuData) {
        const item = menuData[key].items.find(i => i.id === itemId);
        if (item) return item;
    }
    return null;
}

function updateQuantity(itemId, change) {
    const item = cart.find(c => c.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(c => c.id !== itemId);
        }
        updateCart();
    }
}

function removeFromCart(itemId) {
    cart = cart.filter(c => c.id !== itemId);
    updateCart();
}

// ===== ملاحظة الوجبة =====
function openNoteModal(itemId) {
    currentEditItemId = itemId;
    const item = cart.find(c => c.id === itemId);
    if (item) {
        document.getElementById('noteItemName').textContent = item.name;
        document.getElementById('itemNoteInput').value = item.note || '';
        document.getElementById('noteModal').classList.add('active');
    }
}

function closeNoteModal() {
    document.getElementById('noteModal').classList.remove('active');
    currentEditItemId = null;
}

function saveItemNote() {
    if (currentEditItemId) {
        const item = cart.find(c => c.id === currentEditItemId);
        if (item) {
            item.note = document.getElementById('itemNoteInput').value;
            updateCart();
            showNotification('تم حفظ الملاحظة!');
        }
    }
    closeNoteModal();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartBadge = document.getElementById('cartBadge');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartBadge.textContent = totalItems;
    cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
    cartTotal.textContent = totalPrice.toLocaleString() + ' ل.س';
    checkoutBtn.disabled = cart.length === 0;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>السلة فارغة</p>
            </div>
        `;
    } else {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toLocaleString()} ل.س</div>
                    ${item.note ? `<div class="cart-item-note">${item.note}</div>` : ''}
                    <div class="cart-item-actions">
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                        <button class="edit-note-btn" onclick="openNoteModal('${item.id}')">تعديل</button>
                        <button class="remove-item" onclick="removeFromCart('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function toggleCart() {
    document.getElementById('cartOverlay').classList.toggle('active');
    document.getElementById('cartSidebar').classList.toggle('active');
}

// ===== طرق الدفع =====
function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('.payment-details').forEach(det => det.classList.remove('active'));
    const selectedOption = document.querySelector(`input[value="${method}"]`).closest('.payment-option');
    selectedOption.classList.add('selected');
    document.querySelector(`input[value="${method}"]`).checked = true;
    if (method === 'shamcash') {
        document.getElementById('shamcashDetails').classList.add('active');
    } else if (method === 'fouri') {
        document.getElementById('fouriDetails').classList.add('active');
    } else if (method === 'bank') {
        document.getElementById('bankDetails').classList.add('active');
    }
}

// ===== حساب وقت التجهيز =====
function calculateDeliveryTime() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalMinutes = 5 + (totalItems * 2);
    return {
        minutes: totalMinutes,
        text: totalMinutes < 60 ? `${totalMinutes} دقيقة` : `${Math.floor(totalMinutes / 60)} ساعة و ${totalMinutes % 60} دقيقة`
    };
}

// ===== نموذج الطلب =====
function showOrderForm() {
    toggleCart();
    const modal = document.getElementById('orderModal');
    const summaryItems = document.getElementById('orderSummaryItems');
    const summaryTotal = document.getElementById('orderSummaryTotal');
    const deliveryTimeText = document.getElementById('deliveryTimeText');

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryTime = calculateDeliveryTime();

    summaryItems.innerHTML = cart.map(item => `
        <div class="order-summary-item">
            <div>
                <span>${item.name} × ${item.quantity}</span>
                ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
            </div>
            <span>${(item.price * item.quantity).toLocaleString()} ل.س</span>
        </div>
    `).join('');

    summaryTotal.textContent = totalPrice.toLocaleString() + ' ل.س';
    deliveryTimeText.textContent = 'وقت التجهيز المتوقع: ' + deliveryTime.text;
    document.getElementById('deliveryTimeBox').style.display = 'block';

    selectedPayment = null;
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
    document.querySelectorAll('.payment-details').forEach(det => det.classList.remove('active'));
    document.querySelectorAll('input[name="payment"]').forEach(r => r.checked = false);

    modal.classList.add('active');
}

function closeOrderForm() {
    document.getElementById('orderModal').classList.remove('active');
}

// ===== إرسال الطلب للـ API =====
async function submitOrder() {
    const table = document.getElementById('tableNumber').value;

    if (!table) {
        alert('الرجاء إدخال رقم الطاولة');
        return;
    }

    if (!selectedPayment) {
        alert('الرجاء اختيار طريقة الدفع');
        return;
    }

    let paymentDetails = '';
    if (selectedPayment === 'shamcash') {
        const num = document.getElementById('shamcashNumber').value;
        if (!num) { alert('الرجاء إدخال رقم حساب شام كاش'); return; }
        paymentDetails = 'شام كاش: ' + num;
    } else if (selectedPayment === 'fouri') {
        const num = document.getElementById('fouriNumber').value;
        if (!num) { alert('الرجاء إدخال رقم حساب فوري'); return; }
        paymentDetails = 'فوري: ' + num;
    } else if (selectedPayment === 'bank') {
        const bank = document.getElementById('bankName').value;
        const account = document.getElementById('bankAccount').value;
        if (!bank || !account) { alert('الرجاء إكمال بيانات التحويل البنكي'); return; }
        const bankText = document.getElementById('bankName').options[document.getElementById('bankName').selectedIndex].text;
        paymentDetails = bankText + ': ' + account;
    } else {
        paymentDetails = 'دفع كاش';
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryTime = calculateDeliveryTime();

    const orderData = {
        tableNumber: parseInt(table),
        paymentMethod: selectedPayment,
        paymentDetails: paymentDetails,
        totalPrice: totalPrice,
        items: cart.map(item => ({
            itemName: item.name,
            quantity: item.quantity,
            price: item.price,
            note: item.note || ''
        }))
    };

    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) throw new Error('فشل الإرسال');

        const successDetails = document.getElementById('successDetails');
        successDetails.innerHTML = `
            <p><strong>رقم الطاولة:</strong> ${table}</p>
            <p><strong>طريقة الدفع:</strong> ${paymentDetails}</p>
            <p><strong>المجموع:</strong> ${totalPrice.toLocaleString()} ل.س</p>
            <p><strong>وقت التجهيز:</strong> ${deliveryTime.text}</p>
        `;

        closeOrderForm();
        document.getElementById('successMessage').classList.add('active');

    } catch (err) {
        alert('تعذر الاتصال بالسيرفر، تأكد إن الـ API شغال على http://localhost:5262');
    }
}

// ===== إعادة تعيين التطبيق =====
function resetApp() {
    cart = [];
    updateCart();
    document.getElementById('successMessage').classList.remove('active');
    document.getElementById('welcomePage').classList.remove('hidden');
    document.getElementById('navbar').style.display = 'none';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    pageHistory = [];
}

// ===== الإشعارات =====
function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: var(--secondary); color: white; padding: 1rem 2rem;
        border-radius: 50px; font-weight: 600; z-index: 9999;
        animation: fadeInUp 0.3s ease-out; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.3s';
        setTimeout(() => notif.remove(), 300);
    }, 2000);
}

// ===== إغلاق النماذج بالنقر خارجها =====
document.getElementById('orderModal').addEventListener('click', function(e) {
    if (e.target === this) closeOrderForm();
});
document.getElementById('noteModal').addEventListener('click', function(e) {
    if (e.target === this) closeNoteModal();
});