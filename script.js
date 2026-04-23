/* Get references to DOM elements used by the app. */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const toggleProductsButton = document.getElementById("toggleProducts");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectedButton = document.getElementById("clearSelected");
const generateRoutineButton = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const productModal = document.getElementById("productModal");
const productModalTitle = document.getElementById("productModalTitle");
const productModalImage = document.getElementById("productModalImage");
const productModalBrand = document.getElementById("productModalBrand");
const productModalCategory = document.getElementById("productModalCategory");
const productModalName = document.getElementById("productModalName");
const productModalDescription = document.getElementById(
  "productModalDescription",
);

/* Replace this with your deployed Cloudflare Worker URL. */
const workerUrl = "https://wanderbot-worker.sgracia3.workers.dev/";

/* localStorage key keeps the selected products saved after refresh. */
const selectedProductsStorageKey = "loreal-selected-products";

/* RTL languages that should switch the layout direction automatically. */
const rtlLanguages = ["ar", "he", "fa", "ur", "yi", "ps", "ku", "dv"];

/* App state stores all products, filtered products, and selected product ids. */
let allProducts = [];
let filteredProducts = [];
let showAllProducts = false;
const selectedProductIds = new Set();
let lastFocusedElement = null;

/* Keep one conversation array so follow-up messages remember full context. */
const systemMessage = {
  role: "system",
  content:
    "You are the L'Oreal Beauty Advisor chatbot. Recommend products from across the full L'Oreal family of brands, including but not limited to L'Oreal Paris, CeraVe, La Roche-Posay, Vichy, Kiehl's, Lancome, Maybelline, Garnier, NYX Professional Makeup, Urban Decay, IT Cosmetics, and SkinCeuticals. You provide personalized routines and recommendations focused on L'Oreal portfolio products, routines, ingredients, and beauty guidance. Always treat all L'Oreal family brands as in-scope. If a user asks something unrelated, politely redirect to L'Oreal beauty topics. Keep answers concise and beginner-friendly. Never use product image URLs as product links. Instead, search the web and provide exact official product page links from L'Oreal or official L'Oreal-family brand websites only. Format links as markdown like [Product Name](https://...).",
};

const messages = [systemMessage];

/* Convert markdown-style links into HTML anchor tags. */
function convertLinks(text) {
  return text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

/* Convert assistant text into paragraph blocks with clickable links. */
function formatAssistantText(text) {
  /* Clean up common malformed list output such as "- !Product Name". */
  const cleanedText = text.replace(/-\s*!/g, "- ");

  return cleanedText
    .split("\n\n")
    .filter((paragraph) => paragraph.trim() !== "")
    .map((paragraph) => `<p>${convertLinks(paragraph)}</p>`)
    .join("");
}

/* Return a visible role label for each chat bubble. */
function getRoleLabel(role) {
  if (role === "user") {
    return "YOU";
  }

  if (role === "assistant") {
    return "BEAUTY ADVISOR";
  }

  return "CHAT";
}

/* Add one message bubble to the chat window. */
function appendMessage(role, text, isHtml = false) {
  const message = document.createElement("div");
  message.className = `chat-message ${role}`;

  const label = document.createElement("strong");
  label.className = "chat-message-label";
  label.textContent = getRoleLabel(role);

  const content = document.createElement("div");
  content.className = "chat-message-content";

  if (isHtml) {
    content.innerHTML = text;
  } else {
    content.textContent = text;
  }

  message.append(label, content);

  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return message;
}

/* Disable inputs while waiting for the API so the user cannot submit twice. */
function setChatBusy(isBusy) {
  userInput.disabled = isBusy;
  sendBtn.disabled = isBusy;
  generateRoutineButton.disabled = isBusy;
}

/* Load product data from JSON file. */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Save selected product ids so they stay after a page refresh. */
function saveSelectedProducts() {
  const selectedIdsArray = Array.from(selectedProductIds);
  localStorage.setItem(
    selectedProductsStorageKey,
    JSON.stringify(selectedIdsArray),
  );
}

/* Restore selected product ids from localStorage. */
function restoreSelectedProducts() {
  const savedValue = localStorage.getItem(selectedProductsStorageKey);

  if (!savedValue) {
    return;
  }

  try {
    const savedIds = JSON.parse(savedValue);

    if (Array.isArray(savedIds)) {
      savedIds.forEach((id) => selectedProductIds.add(id));
    }
  } catch (error) {
    console.error("Could not read selected products from localStorage", error);
  }
}

/* Check the current page language and apply RTL/LTR automatically. */
function updateRTL() {
  const html = document.documentElement;
  const lang = html.getAttribute("lang") || navigator.language || "en";
  const normalizedLang = lang.toLowerCase();

  if (rtlLanguages.some((rtlLang) => normalizedLang.startsWith(rtlLang))) {
    html.setAttribute("dir", "rtl");
    document.body.classList.add("rtl");
  } else {
    html.setAttribute("dir", "ltr");
    document.body.classList.remove("rtl");
  }
}

/* Toggle a product in or out of the selected set. */
function toggleProductSelection(productId) {
  if (selectedProductIds.has(productId)) {
    selectedProductIds.delete(productId);
  } else {
    selectedProductIds.add(productId);
  }

  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
}

/* Open the product details modal for a specific item. */
function openProductModal(productId) {
  const product = allProducts.find((item) => item.id === productId);

  if (!product || !productModal) {
    return;
  }

  lastFocusedElement = document.activeElement;

  productModalTitle.textContent = `${product.brand} - ${product.name}`;
  productModalImage.src = normalizeImageUrl(product.image);
  productModalImage.alt = product.name;
  productModalImage.parentElement.href = product.image;
  productModalBrand.textContent = product.brand;
  productModalCategory.textContent = titleCaseText(product.category);
  productModalName.textContent = product.name;
  productModalDescription.textContent = product.description;

  productModal.hidden = false;
  document.body.classList.add("modal-open");
  productModal.querySelector(".product-modal__close")?.focus();
}

/* Close the product details modal. */
function closeProductModal() {
  if (!productModal || productModal.hidden) {
    return;
  }

  productModal.hidden = true;
  document.body.classList.remove("modal-open");

  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

/* Remove one product from the selected set. */
function removeSelectedProduct(productId) {
  selectedProductIds.delete(productId);
  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
}

/* Clear all selected products at once. */
function clearSelectedProducts() {
  selectedProductIds.clear();
  saveSelectedProducts();
  renderProducts();
  renderSelectedProducts();
}

/* Normalize image URLs so special characters like % are safely encoded. */
function normalizeImageUrl(url) {
  try {
    return encodeURI(url);
  } catch (error) {
    return url;
  }
}

/* Normalize text for accent-insensitive searching (e.g., L'Oréal matches loreal). */
function normalizeForSearch(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/* Convert labels like "skincare" into "Skincare" for display. */
function titleCaseText(text) {
  return (text || "")
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/* Build one searchable string per product so matching logic stays simple. */
function getProductSearchText(product) {
  return normalizeForSearch(
    `${product.name} ${product.brand} ${product.category} ${product.description}`,
  );
}

/* Update the button that reveals the rest of the products. */
function updateProductToggleButton() {
  const hasExtraProducts = filteredProducts.length > 6;

  if (!hasExtraProducts) {
    toggleProductsButton.hidden = true;
    return;
  }

  toggleProductsButton.hidden = false;
  toggleProductsButton.textContent = showAllProducts
    ? "Show less items"
    : "Show more products";
}

/* Render the product cards that match the current filters. */
function renderProducts() {
  if (filteredProducts.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        No products match your filters yet. Try another category or search term.
      </div>
    `;
    toggleProductsButton.hidden = true;
    return;
  }

  const visibleProducts = showAllProducts
    ? filteredProducts
    : filteredProducts.slice(0, 6);

  productsContainer.innerHTML = visibleProducts
    .map((product) => {
      const isSelected = selectedProductIds.has(product.id);
      const normalizedImageUrl = normalizeImageUrl(product.image);

      return `
        <article class="product-card ${isSelected ? "selected" : ""}" data-product-id="${product.id}">
          <img src="${normalizedImageUrl}" alt="${product.name}" onerror="this.onerror=null;this.src='img/loreal-logo.png';this.classList.add('image-fallback');">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-brand">${product.brand}</p>
            <p class="product-category">${product.category}</p>
            <button type="button" class="description-toggle" data-description-toggle="${product.id}">
              View Details
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  updateProductToggleButton();
}

/* Render the list of selected products above the routine button. */
function renderSelectedProducts() {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id),
  );

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<p class="selected-empty">No products selected yet.</p>';
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <button type="button" class="selected-chip" data-remove-id="${product.id}">
          ${product.brand} - ${product.name}
          <span aria-hidden="true">&times;</span>
        </button>
      `,
    )
    .join("");
}

/* Apply the search and category filters together. */
function applyFilters() {
  const selectedCategory = categoryFilter.value;
  const normalizedSearchText = normalizeForSearch(productSearch.value.trim());

  filteredProducts = allProducts.filter((product) => {
    const categoryMatches =
      selectedCategory === "all" || product.category === selectedCategory;

    const searchMatches =
      normalizedSearchText.length === 0 ||
      getProductSearchText(product).includes(normalizedSearchText);

    return categoryMatches && searchMatches;
  });

  /* Reset the product list back to the first six items after any filter change. */
  showAllProducts = false;
  renderProducts();
}

/* Send the conversation to the Cloudflare Worker, which handles the API key. */
async function sendMessagesToWorker() {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

/* Add the user message, call the worker, and render the assistant response. */
async function askAssistant(promptText, { showUserMessage = true } = {}) {
  if (showUserMessage) {
    appendMessage("user", promptText);
  }

  const loadingMessage = appendMessage("assistant", "Thinking...");

  messages.push({ role: "user", content: promptText });
  setChatBusy(true);

  try {
    const assistantText = await sendMessagesToWorker();
    const reply =
      assistantText ||
      "I could not create a response yet. Please try one more time.";

    messages.push({ role: "assistant", content: reply });
    const loadingContent = loadingMessage.querySelector(
      ".chat-message-content",
    );
    loadingContent.innerHTML = formatAssistantText(reply);
  } catch (error) {
    console.error("Worker request failed:", error);
    const loadingContent = loadingMessage.querySelector(
      ".chat-message-content",
    );
    loadingContent.textContent =
      "The request failed. Check your Cloudflare Worker URL and try again.";

    if (messages[messages.length - 1]?.role === "user") {
      messages.pop();
    }
  } finally {
    setChatBusy(false);
    userInput.focus();
  }
}

/* Generate a routine using only the selected products. */
async function generateRoutineFromSelection() {
  const selectedProducts = allProducts.filter((product) =>
    selectedProductIds.has(product.id),
  );

  if (selectedProducts.length === 0) {
    appendMessage(
      "assistant",
      "Select at least one product first, then click Generate Routine.",
    );
    return;
  }

  /* Only send selected products to the AI so the routine is personalized. */
  const routinePrompt = `Build a personalized beauty routine using ONLY these selected products:\n${JSON.stringify(
    selectedProducts,
    null,
    2,
  )}\n\nPlease format the response with:\n1) Morning routine\n2) Evening routine\n3) Weekly tips\n4) Safety notes\nKeep it concise and clear for beginners. Include links to official product pages when possible.`;

  await askAssistant(routinePrompt, {
    showUserMessage: false,
  });
}

/* Product card interactions: select card and toggle descriptions */
/* Handle clicks on product cards and their description toggles. */
productsContainer.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-description-toggle]");

  if (toggleButton) {
    const productId = Number(toggleButton.dataset.descriptionToggle);
    openProductModal(productId);
    return;
  }

  const card = event.target.closest(".product-card");

  if (!card) {
    return;
  }

  const productId = Number(card.dataset.productId);
  toggleProductSelection(productId);
});

/* Handle removing items from the selected product chips. */
selectedProductsList.addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-id]");

  if (!removeButton) {
    return;
  }

  const productId = Number(removeButton.dataset.removeId);
  removeSelectedProduct(productId);
});

/* Re-render products when the category changes. */
categoryFilter.addEventListener("change", applyFilters);

/* Re-render products as the user types in the search field. */
productSearch.addEventListener("input", applyFilters);

/* Expand or collapse the product list beyond the first six items. */
toggleProductsButton.addEventListener("click", () => {
  showAllProducts = !showAllProducts;
  renderProducts();
});

/* Generate the routine when the button is clicked. */
generateRoutineButton.addEventListener("click", async () => {
  await generateRoutineFromSelection();
});

/* Clear all selections when the user clicks the reset button. */
clearSelectedButton.addEventListener("click", () => {
  clearSelectedProducts();
});

/* Close the modal when the overlay or close button is clicked. */
productModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-modal-close]")) {
    closeProductModal();
  }
});

/* Allow the Escape key to dismiss the modal quickly. */
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && productModal && !productModal.hidden) {
    closeProductModal();
  }
});

/* Send follow-up questions through the same conversation history. */
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const promptText = userInput.value.trim();

  if (!promptText) {
    return;
  }

  userInput.value = "";
  await askAssistant(promptText, {
    showUserMessage: true,
  });
});

/* Load products, restore saved state, and render the initial UI. */
async function initializeApp() {
  try {
    allProducts = await loadProducts();
    restoreSelectedProducts();

    filteredProducts = [...allProducts];
    renderProducts();
    renderSelectedProducts();

    appendMessage(
      "assistant",
      "Welcome to your L'Oreal Beauty Advisor. Select products to build a personalized routine, then ask me follow-up questions anytime.",
    );
  } catch (error) {
    console.error("Could not initialize app:", error);
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        Could not load products. Please refresh and try again.
      </div>
    `;
  }
}

/* Run once on load and watch for language changes (like browser translation). */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateRTL);
} else {
  updateRTL();
}

const rtlObserver = new MutationObserver(updateRTL);
rtlObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["lang"],
});

/* Register a tiny service worker so the app can be installed on mobile. */
async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("sw.js");
  } catch (error) {
    console.error("Service worker registration failed:", error);
  }
}

initializeApp();
registerServiceWorker();
