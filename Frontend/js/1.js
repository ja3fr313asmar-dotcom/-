const API_URL = 'http://localhost:5262/api';

// ===== جلب الطلبات من API =====
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
        const statusMap = {
            pending:   { label: 'قيد الانتظار', class: 'badge-warning' },
            preparing: { label: 'قيد التحضير', class: 'badge-warning' },
            done:      { label: 'مكتمل',        class: 'badge-success' },
            cancelled: { label: 'ملغي',          class: 'badge-danger'  }
        };
        const s = statusMap[order.status] || { label: order.status, class: 'badge-warning' };
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
                        <option value="pending"   ${order.status === 'pending'   ? 'selected' : ''}>⏳ قيد الانتظار</option>
                        <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>👨‍🍳 قيد التحضير</option>
                        <option value="done"      ${order.status === 'done'      ? 'selected' : ''}>✅ مكتمل</option>
                        <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ ملغي</option>
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
        if (res.ok) {
            showToast('success', 'تم تحديث حالة الطلب');
        } else {
            showToast('error', 'فشل تحديث الحالة');
        }
    } catch {
        showToast('error', 'تعذر الاتصال بالسيرفر');
    }
}

function printOrder(id) {
    showToast('info', `جاري طباعة الطلب #${id}`);
}

// ===== جلب المنيو من API =====
async function loadMenuFromAPI() {
    try {
        const res = await fetch(`${API_URL}/menu`);
        const apiCategories = await res.json();

        // تحديث قائمة التصنيفات
        categories = apiCategories.map(c => ({
            id: c.id,
            name: c.name,
            icon: c.icon || 'fa-utensils',
            count: c.items ? c.items.length : 0,
            image: c.image || 'https://via.placeholder.com/400x300'
        }));

        // تحديث قائمة الأصناف
        menuItems = apiCategories.flatMap(c =>
            (c.items || []).map(item => ({
                id: item.id,
                name: item.name,
                category: c.id,
                categoryName: c.name,
                price: item.price,
                description: item.description,
                badge: item.badge || '',
                image: item.image || 'https://via.placeholder.com/300x200'
            }))
        );

        // تحديث categoryNames
        apiCategories.forEach(c => { categoryNames[c.id] = c.name; });

        // تحديث قائمة التصنيفات في الـ select
        updateCategorySelects(apiCategories);

        renderMenuTable();
        renderCategoriesTable();

    } catch {
        showToast('error', 'تعذر تحميل المنيو من السيرفر — يعمل على البيانات المحلية');
    }
}

function updateCategorySelects(apiCategories) {
    const selects = ['itemCategory', 'filterCategory'];
    selects.forEach(selectId => {
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

// ===== إضافة صنف للـ API =====
const originalSaveItem = window.saveItem;
window.saveItem = async function(e) {
    e.preventDefault();

    const id = document.getElementById('itemId').value;
    const name = document.getElementById('itemName').value;
    const categoryId = parseInt(document.getElementById('itemCategory').value);
    const price = parseInt(document.getElementById('itemPrice').value);
    const description = document.getElementById('itemDescription').value;
    const badge = document.getElementById('itemBadge').value;
    const preview = document.getElementById('imagePreview');
    const image = preview.classList.contains('active') ? preview.src : '';

    if (id) {
        // تعديل — محلي فقط هلق
        const index = menuItems.findIndex(i => i.id == id);
        if (index !== -1) {
            menuItems[index] = { ...menuItems[index], name, price, description, badge, image };
        }
        showToast('success', 'تم تعديل الوجبة محلياً');
        closeItemModal();
        renderMenuTable();
    } else {
        // إضافة جديدة للـ API
        try {
            const res = await fetch(`${API_URL}/menu/item`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, categoryId, price, description, badge, image })
            });
            if (res.ok) {
                showToast('success', 'تم إضافة الوجبة بنجاح!');
                closeItemModal();
                await loadMenuFromAPI();
            } else {
                showToast('error', 'فشل إضافة الوجبة');
            }
        } catch {
            showToast('error', 'تعذر الاتصال بالسيرفر');
        }
    }
};

// ===== حذف صنف من API =====
const originalConfirmDelete = window.confirmDelete;
window.confirmDelete = async function() {
    if (deleteType === 'item') {
        try {
            const res = await fetch(`${API_URL}/menu/item/${deleteTarget}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast('success', 'تم حذف الوجبة بنجاح!');
                closeDeleteModal();
                await loadMenuFromAPI();
            } else {
                // إذا فشل الـ API احذف محلياً
                menuItems = menuItems.filter(i => i.id !== deleteTarget);
                renderMenuTable();
                showToast('success', 'تم حذف الوجبة');
                closeDeleteModal();
            }
        } catch {
            menuItems = menuItems.filter(i => i.id !== deleteTarget);
            renderMenuTable();
            showToast('success', 'تم حذف الوجبة محلياً');
            closeDeleteModal();
        }
    } else if (deleteType === 'category') {
        try {
            const res = await fetch(`${API_URL}/menu/category/${deleteTarget}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast('success', 'تم حذف التصنيف بنجاح!');
            } else {
                showToast('error', 'فشل حذف التصنيف');
            }
        } catch {
            showToast('error', 'تعذر الاتصال بالسيرفر');
        }
        categories = categories.filter(c => c.id !== deleteTarget);
        renderCategoriesTable();
        closeDeleteModal();
    }
};

// ===== إضافة تصنيف للـ API =====
const originalSaveCategory = window.saveCategory;
window.saveCategory = async function(e) {
    e.preventDefault();

    const id = document.getElementById('categoryId').value;
    const name = document.getElementById('categoryName').value;
    const icon = document.getElementById('categoryIcon').value || 'fa-utensils';

    if (id) {
        // تعديل محلي
        const index = categories.findIndex(c => c.id == id);
        if (index !== -1) categories[index] = { ...categories[index], name, icon };
        showToast('success', 'تم تعديل التصنيف');
        closeCategoryModal();
        renderCategoriesTable();
    } else {
        // إضافة للـ API
        try {
            const res = await fetch(`${API_URL}/menu/category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, icon, image: '' })
            });
            if (res.ok) {
                showToast('success', 'تم إضافة التصنيف بنجاح!');
                closeCategoryModal();
                await loadMenuFromAPI();
            } else {
                showToast('error', 'فشل إضافة التصنيف');
            }
        } catch {
            showToast('error', 'تعذر الاتصال بالسيرفر');
        }
    }
};

// ===== تحميل البيانات عند فتح قسم الطلبات =====
const originalShowSection = window.showSection;
window.showSection = function(section) {
    originalShowSection.call(this, section);
    if (section === 'orders') loadOrders();
    if (section === 'menu' || section === 'categories') loadMenuFromAPI();
};

// ===== تحديث تلقائي للطلبات كل 30 ثانية =====
setInterval(() => {
    const ordersSection = document.getElementById('ordersSection');
    if (ordersSection && ordersSection.classList.contains('active')) {
        loadOrders();
    }
}, 30000);

// ===== تحميل المنيو عند فتح الصفحة =====
window.addEventListener('load', () => {
    loadMenuFromAPI();
});
