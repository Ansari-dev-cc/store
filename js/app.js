// NIHMA Store - Main Application Script
// Features: Dynamic Catalog, Interactive Cart, WhatsApp Pickup Order Generation, Live Search & Filters
// (No prices displayed, pure item & quantity selection for pre-order packing)

const STORE_CONFIG = {
  name: "NIHMA Store",
  malayalamName: "നിഹ്മ സ്റ്റോർ",
  phone: "6282272705",
  whatsappNumber: "916282272705",
  timing: "7:00 AM – 9:30 PM (All 7 Days)",
  locationHint: "Near Main Road, Kerala"
};

// State
let cart = [];
let activeCategory = "all";
let searchQuery = "";

// Initialize application on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  loadCartFromStorage();
  renderCategoryPills();
  renderProducts();
  updateCartUI();
  setupEventListeners();
});

// Load Cart from LocalStorage
function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem("nihma_store_cart");
    if (saved) {
      cart = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed to load cart from storage", e);
    cart = [];
  }
}

// Save Cart to LocalStorage
function saveCartToStorage() {
  try {
    localStorage.setItem("nihma_store_cart", JSON.stringify(cart));
  } catch (e) {
    console.error("Failed to save cart", e);
  }
}

// Category Pills Rendering
function renderCategoryPills() {
  const container = document.getElementById("categoryPills");
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => `
    <button class="cat-pill ${cat.id === activeCategory ? 'active' : ''}" data-cat="${cat.id}">
      <i class="fa-solid ${cat.icon}"></i>
      <span>${cat.label}</span>
      <span class="cat-count">${getCategoryCount(cat.id)}</span>
    </button>
  `).join("");

  // Add click handlers
  container.querySelectorAll(".cat-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.getAttribute("data-cat");
      renderCategoryPills();
      renderProducts();
    });
  });
}

function getCategoryCount(catId) {
  if (catId === "all") return PRODUCTS.length;
  return PRODUCTS.filter(p => p.category === catId).length;
}

// Render Products Grid
function renderProducts() {
  const grid = document.getElementById("productsGrid");
  const countDisplay = document.getElementById("filteredCount");
  if (!grid) return;

  // Filter products by category and search
  const filtered = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === "all" || product.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      product.name.toLowerCase().includes(q) || 
      product.malayalam.toLowerCase().includes(q) ||
      product.categoryName.toLowerCase().includes(q) ||
      (product.description && product.description.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  if (countDisplay) {
    countDisplay.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'item' : 'items'}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-products-state">
        <div class="empty-icon"><i class="fa-solid fa-basket-shopping"></i></div>
        <h3>No matching grocery items found</h3>
        <p>Try searching with another keyword or browse all items</p>
        <button class="btn btn-secondary" onclick="resetFilters()">
          <i class="fa-solid fa-rotate-left"></i> View All Items
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const cartItem = cart.find(item => item.id === product.id);
    const inCart = !!cartItem;
    const qty = cartItem ? cartItem.qty : 0;

    const visualHeader = product.image ? `
      <div class="product-image-wrap">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <span class="category-tag">${product.categoryName}</span>
      </div>
    ` : `
      <div class="product-badge-wrap theme-${product.theme || 'emerald'}">
        <div class="product-badge-icon-circle">
          <i class="fa-solid ${product.icon || 'fa-basket-shopping'}"></i>
        </div>
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <span class="category-tag">${product.categoryName}</span>
      </div>
    `;

    return `
      <div class="product-card" data-id="${product.id}">
        ${visualHeader}
        <div class="product-content">
          <div class="malayalam-subtitle">${product.malayalam}</div>
          <h3 class="product-title">${product.name}</h3>
          <p class="product-desc">${product.description || ''}</p>
          
          <div class="product-footer">
            <div class="unit-box">
              <span class="unit-label">Quantity Unit:</span>
              <span class="unit-val">${product.unit}</span>
            </div>

            <div class="action-box" id="action-box-${product.id}">
              ${inCart ? `
                <div class="qty-control">
                  <button class="qty-btn minus" onclick="updateItemQuantity('${product.id}', -1)" title="Decrease">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <span class="qty-val">${qty}</span>
                  <button class="qty-btn plus" onclick="updateItemQuantity('${product.id}', 1)" title="Increase">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
              ` : `
                <button class="btn-add-cart" onclick="addToCart('${product.id}')">
                  <i class="fa-solid fa-cart-plus"></i>
                  <span>Add</span>
                </button>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// Add Item to Cart
function addToCart(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.qty += (product.step || 1);
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      malayalam: product.malayalam,
      unit: product.unit,
      image: product.image || null,
      icon: product.icon || null,
      theme: product.theme || 'emerald',
      qty: product.minQty || 1,
      step: product.step || 1
    });
  }

  saveCartToStorage();
  updateCartUI();
  renderProducts();
  showToast(`Added ${product.name} to pickup bag`);
}

// Update Quantity
function updateItemQuantity(productId, delta) {
  const itemIndex = cart.findIndex(i => i.id === productId);
  if (itemIndex === -1) {
    if (delta > 0) addToCart(productId);
    return;
  }

  const item = cart[itemIndex];
  const step = item.step || 1;
  const newQty = item.qty + (delta * step);

  if (newQty <= 0) {
    cart.splice(itemIndex, 1);
    showToast(`Removed ${item.name} from bag`);
  } else {
    // Keep decimal clean if fractional steps (e.g. 0.5 kg)
    item.qty = Math.round(newQty * 10) / 10;
  }

  saveCartToStorage();
  updateCartUI();
  renderProducts();
}

// Remove Item from Cart directly
function removeFromCart(productId) {
  const itemIndex = cart.findIndex(i => i.id === productId);
  if (itemIndex > -1) {
    const item = cart[itemIndex];
    cart.splice(itemIndex, 1);
    saveCartToStorage();
    updateCartUI();
    renderProducts();
    showToast(`Removed ${item.name}`);
  }
}

// Clear all cart items
function clearCart() {
  if (cart.length === 0) return;
  if (confirm("Are you sure you want to empty your pickup cart?")) {
    cart = [];
    saveCartToStorage();
    updateCartUI();
    renderProducts();
    showToast("Cart has been cleared");
  }
}

// Update Cart UI everywhere
function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + (item.qty > 0 ? 1 : 0), 0);

  // Floating Cart Trigger
  const cartBadge = document.getElementById("cartBadgeCount");
  const navCartBadge = document.getElementById("navCartCount");
  const floatingCountLabel = document.getElementById("floatingCartTotal");

  if (cartBadge) cartBadge.textContent = totalCount;
  if (navCartBadge) navCartBadge.textContent = totalCount;
  if (floatingCountLabel) {
    floatingCountLabel.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
  }

  // Drawer Content
  const drawerList = document.getElementById("cartDrawerItems");
  const orderCountText = document.getElementById("orderItemCountText");
  const totalItemsSummary = document.getElementById("cartTotalItemsCount");
  const checkoutBtn = document.getElementById("btnSendWhatsappOrder");

  if (orderCountText) {
    orderCountText.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
  }
  if (totalItemsSummary) {
    totalItemsSummary.textContent = `${totalCount} ${totalCount === 1 ? 'item' : 'items'}`;
  }

  if (drawerList) {
    if (cart.length === 0) {
      drawerList.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-bag-icon"><i class="fa-solid fa-basket-shopping"></i></div>
          <h4>Your Pickup Bag is Empty</h4>
          <p>Browse our fresh vegetables, bakery snacks, and grocery items to order ahead!</p>
          <button class="btn btn-primary" onclick="closeCartDrawer()">
            <i class="fa-solid fa-plus"></i> Add Items Now
          </button>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.disabled = true;
    } else {
      drawerList.innerHTML = cart.map(item => {
        const itemThumb = item.image ? `
          <img src="${item.image}" alt="${item.name}" class="cart-item-thumb">
        ` : `
          <div class="cart-item-thumb-badge theme-${item.theme || 'emerald'}">
            <i class="fa-solid ${item.icon || 'fa-basket-shopping'}"></i>
          </div>
        `;

        return `
          <div class="cart-item-row" data-id="${item.id}">
            ${itemThumb}
            <div class="cart-item-info">
              <h4 class="cart-item-title">${item.name}</h4>
              <div class="cart-item-malayalam">${item.malayalam}</div>
              <div class="cart-item-unit-tag"><i class="fa-solid fa-scale-balanced"></i> ${item.unit}</div>
            </div>
            <div class="cart-item-actions">
              <div class="cart-qty-pill">
                <button class="cart-qty-btn" onclick="updateItemQuantity('${item.id}', -1)">-</button>
                <span class="cart-qty-number">${item.qty}</span>
                <button class="cart-qty-btn" onclick="updateItemQuantity('${item.id}', 1)">+</button>
              </div>
              <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')" title="Remove item">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      }).join("");

      if (checkoutBtn) checkoutBtn.disabled = false;
    }
  }

  // Pre-fill user name if stored in localStorage
  const nameInput = document.getElementById("customerNameInput");
  if (nameInput && !nameInput.value) {
    const savedName = localStorage.getItem("nihma_customer_name");
    if (savedName) nameInput.value = savedName;
  }
}

// Generate WhatsApp Order Message (Without Prices)
function generateOrderMessage() {
  const customerName = (document.getElementById("customerNameInput")?.value || "").trim();
  const customerPhone = (document.getElementById("customerPhoneInput")?.value || "").trim();
  const pickupTime = document.getElementById("pickupTimeSelect")?.value || "Within 30 minutes";
  const customerNote = (document.getElementById("customerNoteInput")?.value || "").trim();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  let msg = `🛒 *NEW PRE-ORDER FOR STORE PICKUP*\n`;
  msg += `*${STORE_CONFIG.name} (${STORE_CONFIG.malayalamName})*\n`;
  msg += `📅 Date: ${dateStr} at ${timeStr}\n`;
  msg += `----------------------------------------\n`;
  msg += `👤 *Customer Name:* ${customerName || "Valued Customer"}\n`;
  if (customerPhone) {
    msg += `📞 *Customer Phone:* ${customerPhone}\n`;
  }
  msg += `⏰ *Expected Pickup:* ${pickupTime}\n`;
  if (customerNote) {
    msg += `📝 *Customer Note:* ${customerNote}\n`;
  }
  msg += `----------------------------------------\n`;
  msg += `🛍️ *ITEMS TO PACK (${cart.length} items):*\n`;

  cart.forEach((item, index) => {
    msg += `${index + 1}. *${item.name}* (${item.malayalam})\n`;
    msg += `   └ Quantity: *${item.qty} ${item.unit}*\n`;
  });

  msg += `----------------------------------------\n`;
  msg += `📍 *Pickup Notice:* Small store pickup only (No Delivery). Please pack these items in advance. I will collect and pay directly at the shop counter.\n`;
  msg += `🙏 *Thank you!*`;

  return msg;
}

// Send Order directly to WhatsApp
function sendWhatsAppOrder() {
  if (cart.length === 0) {
    showToast("Please add items to your cart first!", "warning");
    return;
  }

  const nameInput = document.getElementById("customerNameInput");
  const customerName = nameInput ? nameInput.value.trim() : "";

  if (!customerName) {
    showToast("Please enter your name so the shop can label your bag!", "warning");
    if (nameInput) {
      nameInput.focus();
      nameInput.classList.add("input-highlight-error");
      setTimeout(() => nameInput.classList.remove("input-highlight-error"), 2500);
    }
    return;
  }

  // Save customer name for next time
  localStorage.setItem("nihma_customer_name", customerName);

  const message = generateOrderMessage();
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${STORE_CONFIG.whatsappNumber}?text=${encodedText}`;

  // Open WhatsApp in new tab / application
  window.open(whatsappUrl, "_blank");

  showToast("Opening WhatsApp with your order...", "success");

  // Show Order Confirmation Modal
  const pickupTimeSelect = document.getElementById("pickupTimeSelect");
  showOrderSuccessModal(customerName, pickupTimeSelect?.value || "Within 30 minutes");
}

// Copy Order Text to Clipboard
function copyOrderText() {
  if (cart.length === 0) {
    showToast("Cart is empty", "warning");
    return;
  }

  const message = generateOrderMessage();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message)
      .then(() => showToast("Order list copied to clipboard! You can paste in WhatsApp/SMS.", "success"))
      .catch(() => fallbackCopy(message));
  } else {
    fallbackCopy(message);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  showToast("Order list copied to clipboard!", "success");
}

// Order Success Dialog
function showOrderSuccessModal(name, time) {
  const modal = document.getElementById("orderSuccessModal");
  if (!modal) return;

  const nameEl = document.getElementById("successCustomerName");
  const timeEl = document.getElementById("successPickupTime");
  if (nameEl) nameEl.textContent = name;
  if (timeEl) timeEl.textContent = time;

  modal.classList.add("open");
  closeCartDrawer();
}

function closeOrderSuccessModal() {
  const modal = document.getElementById("orderSuccessModal");
  if (modal) modal.classList.remove("open");
}

// Cart Drawer open/close
function openCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeCartDrawer() {
  const drawer = document.getElementById("cartDrawer");
  const overlay = document.getElementById("cartOverlay");
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
}

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type} toast-enter`;

  let icon = "fa-circle-check";
  if (type === "warning") icon = "fa-triangle-exclamation";
  if (type === "error") icon = "fa-circle-xmark";

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("toast-enter");
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

// Reset filters
function resetFilters() {
  activeCategory = "all";
  searchQuery = "";
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
  renderCategoryPills();
  renderProducts();
}

// Event Listeners setup
function setupEventListeners() {
  // Search input with debounce
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderProducts();
    });
  }

  const clearSearchBtn = document.getElementById("clearSearchBtn");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        searchQuery = "";
        renderProducts();
        searchInput.focus();
      }
    });
  }

  // Cart Drawer triggers
  const btnOpenCart = document.getElementById("btnOpenCart");
  const btnFloatingCart = document.getElementById("btnFloatingCart");
  const btnCloseCart = document.getElementById("btnCloseCart");
  const cartOverlay = document.getElementById("cartOverlay");

  if (btnOpenCart) btnOpenCart.addEventListener("click", openCartDrawer);
  if (btnFloatingCart) btnFloatingCart.addEventListener("click", openCartDrawer);
  if (btnCloseCart) btnCloseCart.addEventListener("click", closeCartDrawer);
  if (cartOverlay) cartOverlay.addEventListener("click", closeCartDrawer);

  // Send WhatsApp Checkout Button
  const btnSendWhatsapp = document.getElementById("btnSendWhatsappOrder");
  if (btnSendWhatsapp) {
    btnSendWhatsapp.addEventListener("click", sendWhatsAppOrder);
  }

  // Copy order button
  const btnCopyOrder = document.getElementById("btnCopyOrder");
  if (btnCopyOrder) {
    btnCopyOrder.addEventListener("click", copyOrderText);
  }

  // Clear cart button
  const btnClearCart = document.getElementById("btnClearCart");
  if (btnClearCart) {
    btnClearCart.addEventListener("click", clearCart);
  }

  // Keyboard escape for modal / drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCartDrawer();
      closeOrderSuccessModal();
    }
  });
}
