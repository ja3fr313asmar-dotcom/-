const API_URL = 'http://localhost:5262/api';

// ===== صورة بديلة محلية (SVG) — تعمل بدون إنترنت =====
const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#eee"/>
        <text x="50" y="55" font-size="12" fill="#999" text-anchor="middle" font-family="sans-serif">صورة</text>
    </svg>`
);

// ===== متغيرات عامة =====
let menuItems = [];
let categories = [];
let deleteTarget = null;
let deleteType = null;
const categoryNames = {};

// ===== جلب كل البيانات من API =====
async function loadMenuFromAPI() {
    try {
        const res = await fetch(`${API_URL}/menu`);
        const apiCategories = await res.json();

        categories = apiCategories.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon || 'fa-utensils',
            count: c.items ? c.items.length : 0,
            image: c.image || PLACEHOLDER_IMG
        }));

        menuItems = apiCategories.flatMap(c =>
            (c.items || []).map(item => ({
                id: item.id,
                name: item.name,
                category: c.id,
                categoryName: c.name,
                price: item.price,
                description: item.description || '',
                badge: item.badge || '',
                image: item.image || PLACEHOLDER_IMG
            }))
        );

        apiCategories.forEach(c => { categoryNames[c.id] = c.name; });
        updateCategorySelects(apiCategories);
        renderMenuTable();
        renderCategoriesTable();

    } catch(e) {
        showToast('error', 'تعذر تحميل البيانات من السيرفر');
    }
}

function updateCategorySelects(apiCategories) {
    ['itemCategory', 'filterCategory'].forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;
        const firstOption = select.options[0];
        select.innerHTML = '';
        select.appendChild(firstOption);
        apiCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
        });
    });
}

// ===== عرض جدول المنيو =====
function renderMenuTable(items = menuItems) {
    const tbody = document.getElementById('menuTableBody');
    if (!tbody) return;

    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#888;">لا توجد أصناف</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
            <td><img src="${item.image}" alt="${item.name}" class="item-img" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'"></td>
            <td>
                <div class="item-name">${item.name}</div>
                ${item.badge ? `<span class="badge badge-warning">${item.badge}</span>` : ''}
            </td>
            <td><span class="item-category">${categoryNames[item.category] || item.categoryName || ''}</span></td>
            <td class="item-price">${item.price.toLocaleString()} ل.س</td>
            <td style="max-width:200px;font-size:0.9rem;color:#666;">${item.description}</td>
            <td class="actions-cell">
                <button class="btn-edit" onclick="editItem(${item.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="deleteItem(${item.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ===== عرض جدول التصنيفات =====
function renderCategoriesTable() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:2rem;color:#888;">لا توجد تصنيفات</td></tr>`;
        return;
    }

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td><img src="${cat.image}" alt="${cat.name}" class="item-img" style="width:80px;height:60px;" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}'"></td>
            <td><div class="item-name">${cat.name}</div></td>
            <td>${cat.count} أصناف</td>
            <td><i class="fas ${cat.icon}" style="color:var(--primary);font-size:1.2rem;"></i> ${cat.icon}</td>
            <td class="actions-cell">
                <button class="btn-edit" onclick="editCategory(${cat.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-danger" onclick="deleteCategory(${cat.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ===== البحث والفلتر =====
function searchItems() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('filterCategory').value;
    let filtered = menuItems;
    if (category) filtered = filtered.filter(i => i.category == category);
    if (query) filtered = filtered.filter(i => i.name.toLowerCase().includes(query));
    renderMenuTable(filtered);
}

function filterItems() { searchItems(); }

// ===== Item Modal =====
function openItemModal(itemId = null) {
    const modal = document.getElementById('itemModal');
    const title = document.getElementById('itemModalTitle');
    const form = document.getElementById('itemForm');

    if (itemId) {
        const item = menuItems.find(i => i.id == itemId);
        if (!item) return;
        title.textContent = 'تعديل الوجبة';
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemCategory').value = item.category;
        document.getElementById('itemPrice').value = item.price;
        document.getElementById('itemDescription').value = item.description;
        document.getElementById('itemBadge').value = item.badge || '';
        const preview = document.getElementById('imagePreview');
        preview.src = item.image;
        preview.classList.add('active');
    } else {
        title.textContent = 'إضافة وجبة جديدة';
        form.reset();
        document.getElementById('itemId').value = '';
        document.getElementById('imagePreview').classList.remove('active');
    }

    modal.classList.add('active');
}

function closeItemModal() {
    document.getElementById('itemModal').classList.remove('active');
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;
            document.getElementById('imagePreview').classList.add('active');
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function editItem(id) { openItemModal(id); }

// ===== حفظ الوجبة =====
async function saveItem(e) {
    e.preventDefault();

    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const categoryId = parseInt(document.getElementById('itemCategory').value);
    const price = parseInt(document.getElementById('itemPrice').value);
    const description = document.getElementById('itemDescription').value;
    const badge = document.getElementById('itemBadge').value;
    const preview = document.getElementById('imagePreview');
    const image = preview.classList.contains('active') ? preview.src : '';

    const itemData = { name, categoryId, price, description, badge, image };

    try {
        const res = await fetch(
            id ? `${API_URL}/menu/item/${id}` : `${API_URL}/menu/item`,
            {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(itemData)
            }
        );

        if (res.ok) {
            showToast('success', id ? 'تم تعديل الوجبة بنجاح!' : 'تم إضافة الوجبة بنجاح!');
            closeItemModal();
            await loadMenuFromAPI();
        } else {
            showToast('error', 'فشلت العملية');
        }
    } catch {
        showToast('error', 'تعذر الاتصال بالسيرفر');
    }
}

// ===== حذف وجبة =====
function deleteItem(id) {
    const item = menuItems.find(i => i.id == id);
    if (!item) return;
    deleteTarget = id;
    deleteType = 'item';
    document.getElementById('deleteItemName').textContent = item.name;
    document.getElementById('deleteModal').classList.add('active');
}

// ===== Category Modal =====
function openCategoryModal(catId = null) {
    const modal = document.getElementById('categoryModal');
    const title = document.getElementById('categoryModalTitle');

    if (catId) {
        const cat = categories.find(c => c.id == catId);
        if (!cat) return;
        title.textContent = 'تعديل التصنيف';
        document.getElementById('categoryId').value = cat.id;
        document.getElementById('categoryName').value = cat.name;
        document.getElementById('categoryIcon').value = cat.icon;
        document.getElementById('categoryImageUrl').value = cat.image || '';
    } else {
        title.textContent = 'إضافة تصنيف جديد';
        document.getElementById('categoryForm').reset();
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryImageUrl').value = '';
    }

    modal.classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

function editCategory(id) { openCategoryModal(id); }

// ===== حفظ التصنيف =====
async function saveCategory(e) {
    e.preventDefault();

    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value || 'fa-utensils';
    const image = document.getElementById('categoryImageUrl').value || '';
    const catData = { name, icon, image };

    try {
        const res = await fetch(
            id ? `${API_URL}/menu/category/${id}` : `${API_URL}/menu/category`,
            {
                method: id ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(catData)
            }
        );

        if (res.ok) {
            showToast('success', id ? 'تم تعديل التصنيف بنجاح!' : 'تم إضافة التصنيف بنجاح!');
            closeCategoryModal();
            await loadMenuFromAPI();
        } else {
            showToast('error', 'فشلت العملية');
        }
    } catch {
        showToast('error', 'تعذر الاتصال بالسيرفر');
    }
}

// ===== حذف تصنيف =====
function deleteCategory(id) {
    const cat = categories.find(c => c.id == id);
    if (!cat) return;
    deleteTarget = id;
    deleteType = 'category';
    document.getElementById('deleteItemName').textContent = cat.name;
    document.getElementById('deleteModal').classList.add('active');
}

// ===== تأكيد الحذف =====
async function confirmDelete() {
    const url = deleteType === 'item'
        ? `${API_URL}/menu/item/${deleteTarget}`
        : `${API_URL}/menu/category/${deleteTarget}`;

    try {
        const res = await fetch(url, { method: 'DELETE' });
        if (res.ok) {
            showToast('success', deleteType === 'item' ? 'تم حذف الوجبة!' : 'تم حذف التصنيف!');
            await loadMenuFromAPI();
        } else {
            showToast('error', 'فشل الحذف');
        }
    } catch {
        showToast('error', 'تعذر الاتصال بالسيرفر');
    }

    closeDeleteModal();
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    deleteTarget = null;
    deleteType = null;
}

// ===== الطلبات =====
async function loadOrders() {
    try {
        const res = await fetch(`${API_URL}/orders`);
        const orders = await res.json();
        renderOrdersTable(orders);
    } catch {
        showToast('error', 'تعذر تحميل الطلبات');
    }
}

function renderOrdersTable(orders) {
    const tbody = document.querySelector('#ordersSection tbody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:#888;">لا توجد طلبات</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const time = new Date(order.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
        const itemsList = order.items.map(i => `${i.itemName} × ${i.quantity}`).join(' — ');

        return `
            <tr>
                <td>#${order.id}</td>
                <td>طاولة ${order.tableNumber}</td>
                <td style="font-size:0.85rem;">${itemsList}</td>
                <td class="item-price">${order.totalPrice.toLocaleString()} ل.س</td>
                <td>${time}</td>
                <td>
                    <select class="form-select" style="padding:0.4rem 0.6rem;font-size:0.85rem;border-radius:8px;"
                            onchange="updateOrderStatus(${order.id}, this.value)">
                        <option value="pending"   ${order.status==='pending'   ?'selected':''}>⏳ قيد الانتظار</option>
                        <option value="preparing" ${order.status==='preparing' ?'selected':''}>👨‍🍳 قيد التحضير</option>
                        <option value="done"      ${order.status==='done'      ?'selected':''}>✅ مكتمل</option>
                        <option value="cancelled" ${order.status==='cancelled' ?'selected':''}>❌ ملغي</option>
                    </select>
                </td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="printOrder(${order.id})">طباعة</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateOrderStatus(id, status) {
    try {
        const res = await fetch(`${API_URL}/orders/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(status)
        });
        if (res.ok) showToast('success', 'تم تحديث حالة الطلب');
        else showToast('error', 'فشل تحديث الحالة');
    } catch {
        showToast('error', 'تعذر الاتصال بالسيرفر');
    }
}

function printOrder(id) {
    showToast('info', `جاري طباعة الطلب #${id}`);
}

// ===== Toast =====
function showToast(type, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type]}"></i><span class="toast-message">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Navigation =====
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const sectionEl = document.getElementById(section + 'Section');
    if (sectionEl) sectionEl.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    if (section === 'orders') loadOrders();
    if (section === 'menu' || section === 'categories') loadMenuFromAPI();

    if (window.innerWidth <= 1024) {
        document.getElementById('sidebar').classList.remove('active');
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function logout() {
    if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
        showToast('info', 'تم تسجيل الخروج بنجاح');
        setTimeout(() => location.reload(), 1500);
    }
}

// ===== إغلاق النوافذ =====
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('itemModal').addEventListener('click', function(e) {
        if (e.target === this) closeItemModal();
    });
    document.getElementById('categoryModal').addEventListener('click', function(e) {
        if (e.target === this) closeCategoryModal();
    });
    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) closeDeleteModal();
    });
});

// ===== تحديث تلقائي للطلبات كل 30 ثانية =====
setInterval(() => {
    const ordersSection = document.getElementById('ordersSection');
    if (ordersSection && ordersSection.classList.contains('active')) loadOrders();
}, 30000);

// ===== تحميل البيانات عند فتح الصفحة =====
// ===== جلب إعدادات المطعم =====
async function loadSettings() {
    try {
        const res = await fetch(`${API_URL}/settings`);
        const settings = await res.json();
        document.getElementById('settingsName').value = settings.name || '';
        document.getElementById('settingsPhone').value = settings.phone || '';
        document.getElementById('settingsAddress').value = settings.address || '';
        document.getElementById('settingsEmail').value = settings.email || '';
        document.getElementById('settingsDescription').value = settings.description || '';

        const sidebarName = document.getElementById('sidebarRestaurantName');
        if (sidebarName) sidebarName.textContent = settings.name;
    } catch {
        showToast('error', 'تعذر تحميل الإعدادات');
    }
}
// ===== حفظ إعدادات المطعم =====
async function saveSettings() {
    const settingsData = {
        name: document.getElementById('settingsName').value,
        phone: document.getElementById('settingsPhone').value,
        address: document.getElementById('settingsAddress').value,
        email: document.getElementById('settingsEmail').value,
        description: document.getElementById('settingsDescription').value
    };

    try {
        const res = await fetch(`${API_URL}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settingsData)
        });

        if (res.ok) {
            showToast('success', 'تم حفظ الإعدادات بنجاح!');
        } else {
            showToast('error', 'فشل حفظ الإعدادات');
        }
    } catch {
        showToast('error', 'تعذر الاتصال بالسيرفر');
    }
}

window.addEventListener('load', () => {
    loadMenuFromAPI();
    loadSettings();
});