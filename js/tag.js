/* ==========================================================
   MOON BOX
   TAG.JS
   TAG MANAGEMENT SYSTEM
========================================================== */

/* ==========================================================
   TAG DATA
========================================================== */

const DEFAULT_TAGS = [
  {
    id: "all",
    name: "ALL",
    icon: "layers-3",
    system: true,
  },

  { id: "chill", name: "Chill", icon: "moon" },
  { id: "rain", name: "Rain", icon: "cloud-rain" },
  { id: "night", name: "Night", icon: "moon-star" },
  { id: "lofi", name: "Lofi", icon: "audio-waveform" },
  { id: "drive", name: "Drive", icon: "car-front" },

  { id: "study", name: "Study", icon: "book-open" },
  { id: "piano", name: "Piano", icon: "piano" },
  { id: "coding", name: "Coding", icon: "code-xml" },
  { id: "focus", name: "Focus", icon: "crosshair" },
  { id: "sleep", name: "Sleep", icon: "bed" },

  { id: "jazz", name: "Jazz", icon: "music-4" },
  { id: "nature", name: "Nature", icon: "leaf" },
  { id: "travel", name: "Travel", icon: "plane" },
  { id: "happy", name: "Happy", icon: "smile" },
  { id: "relax", name: "Relax", icon: "flower-2" },
];

/* ==========================================================
   AVAILABLE LUCIDE ICONS
========================================================== */

const TAG_ICONS = [
  "music",
  "music-2",
  "music-3",
  "music-4",
  "audio-waveform",
  "headphones",
  "radio",
  "mic",
  "piano",
  "guitar",

  "moon",
  "moon-star",
  "sun",
  "cloud",
  "cloud-rain",
  "cloud-sun",
  "leaf",
  "flower-2",

  "heart",
  "star",
  "smile",
  "flame",

  "car-front",
  "plane",
  "book-open",
  "code-xml",
  "gamepad-2",
  "coffee",
  "camera",
  "sparkles",
  "zap",
  "circle-dot",
];

/* ==========================================================
   STATE
========================================================== */

let tags = loadTags();

let selectedTagIds = new Set();

let tagOrderMode = "custom";

let editingTagId = null;

let draggedTagId = null;

/* ==========================================================
   ELEMENTS
========================================================== */

const grid = document.getElementById("tagGrid");

const menu = document.getElementById("tagMenu");

const manageButton = document.getElementById("tagManageButton");

const searchInput = document.getElementById("tagSearch");

/* ==========================================================
   MODAL ROOT
   Created automatically.
========================================================== */

let modalRoot = document.getElementById("tagModalRoot");

if (!modalRoot) {
  modalRoot = document.createElement("div");

  modalRoot.id = "tagModalRoot";

  document.body.appendChild(modalRoot);
}

/* ==========================================================
   STORAGE
========================================================== */

function loadTags() {
  try {
    const saved = localStorage.getItem("moonboxTags");

    let loadedTags = [];

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        loadedTags = parsed;
      }
    }

    /* Make sure ALL always exists */
    const allTagExists = loadedTags.some((tag) => tag.id === "all");

    if (!allTagExists) {
      loadedTags.unshift({
        id: "all",
        name: "ALL",
        icon: "layers-3",
        system: true,
      });
    }

    return loadedTags;
  } catch (error) {
    console.warn("MoonBox: Could not load tags.", error);

    return [...DEFAULT_TAGS];
  }
}

function saveTags() {
  try {
    localStorage.setItem("moonboxTags", JSON.stringify(tags));
  } catch (error) {
    console.warn("MoonBox: Could not save tags.", error);
  }
}

/* ==========================================================
   SYNC FOLDER TAGS
   Folder names automatically become tags
========================================================== */

function syncFolderTags(folders) {
  if (!Array.isArray(folders)) return;

  let changed = false;

  folders.forEach((folder) => {
    /* ALL is virtual, not a folder-generated tag */

    if (!folder || folder.tagId === "all") {
      return;
    }

    const tagId = folder.tagId;

    const tagName = folder.name;

    /* Check if tag already exists */

    const existingTag = tags.find((tag) => tag.id === tagId);

    /* Already exists */
    if (existingTag) {
      return;
    }

    /* Create tag from folder */

    tags.push({
      id: tagId,

      name: tagName,

      icon: "folder",

      system: false,

      folderTag: true,
    });

    changed = true;
  });

  /* Save only if something changed */

  if (changed) {
    saveTags();

    renderTags();
  }
}

/* ==========================================================
   ID GENERATOR
========================================================== */

function createTagId(name) {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "tag";

  let id = base;

  let number = 2;

  while (tags.some((tag) => tag.id === id)) {
    id = `${base}-${number}`;

    number++;
  }

  return id;
}

/* ==========================================================
   ESCAPE HTML
========================================================== */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   CREATE LUCIDE ICON
========================================================== */

function createIcon(iconName, className = "") {
  const icon = document.createElement("i");

  icon.setAttribute("data-lucide", iconName);

  if (className) {
    icon.className = className;
  }

  return icon;
}

/* ==========================================================
   REFRESH LUCIDE
========================================================== */

function refreshIcons() {
  if (
    typeof lucide !== "undefined" &&
    typeof lucide.createIcons === "function"
  ) {
    lucide.createIcons();
  }
}

/* ==========================================================
   CREATE TAG ELEMENT
========================================================== */

function createTagElement(tag) {
  const button = document.createElement("button");

  button.className = "tag";

  button.dataset.tagId = tag.id;

  if (selectedTagIds.has(tag.id)) {
    button.classList.add("selected");
  }

  button.innerHTML = `
        <div class="tag-circle">
            <i data-lucide="${escapeHTML(tag.icon)}"></i>
        </div>

        <span>${escapeHTML(tag.name)}</span>
    `;

  button.addEventListener("click", () => {
    toggleTagSelection(tag.id);
  });

  return button;
}

/* ==========================================================
   TOGGLE TAG SELECTION
========================================================== */

function toggleTagSelection(tagId) {
  if (selectedTagIds.has(tagId)) {
    selectedTagIds.delete(tagId);
  } else {
    selectedTagIds.add(tagId);
  }

  renderTags();

  /*
       Later:
       This is where Library and Player can be notified
       about the selected tags.
    */

  document.dispatchEvent(
    new CustomEvent("moonbox:tagsChanged", {
      detail: {
        selectedTagIds: [...selectedTagIds],
      },
    }),
  );
}

/* ==========================================================
   RENDER TAGS
========================================================== */

function renderTags() {
  if (!grid) return;

  grid.innerHTML = "";

  let tagsToRender = [...tags];

  /* --------------------------------------------------------
       ALPHABETICAL
    -------------------------------------------------------- */

  if (tagOrderMode === "alphabetical") {
    tagsToRender.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      }),
    );

    let currentLetter = "";

    tagsToRender.forEach((tag) => {
      const firstLetter = tag.name.trim().charAt(0).toUpperCase() || "#";

      if (firstLetter !== currentLetter) {
        currentLetter = firstLetter;

        const letter = document.createElement("div");

        letter.className = "tag-letter";

        letter.textContent = currentLetter;

        grid.appendChild(letter);
      }

      grid.appendChild(createTagElement(tag));
    });
  } else {
    /* --------------------------------------------------------
       CUSTOM ORDER
    -------------------------------------------------------- */
    tagsToRender.forEach((tag) => {
      grid.appendChild(createTagElement(tag));
    });
  }

  refreshIcons();

  applySearchFilter();
}

/* ==========================================================
   SEARCH
========================================================== */

function applySearchFilter() {
  if (!searchInput) return;

  const value = searchInput.value.trim().toLowerCase();

  const tagElements = grid.querySelectorAll(".tag");

  tagElements.forEach((tagElement) => {
    const name =
      tagElement.querySelector("span")?.textContent.toLowerCase() || "";

    tagElement.style.display = name.includes(value) ? "" : "none";
  });

  /* --------------------------------------------------------
       Hide empty alphabetical headings
    -------------------------------------------------------- */

  if (tagOrderMode === "alphabetical") {
    const letters = grid.querySelectorAll(".tag-letter");

    letters.forEach((letter) => {
      let next = letter.nextElementSibling;

      let hasVisibleTag = false;

      while (next && !next.classList.contains("tag-letter")) {
        if (next.classList.contains("tag") && next.style.display !== "none") {
          hasVisibleTag = true;

          break;
        }

        next = next.nextElementSibling;
      }

      letter.style.display = hasVisibleTag ? "" : "none";
    });
  }
}

/* ==========================================================
   SEARCH EVENT
========================================================== */

if (searchInput) {
  searchInput.addEventListener("input", applySearchFilter);
}

/* ==========================================================
   MANAGE MENU
========================================================== */

function setupManageMenu() {
  if (!manageButton || !menu) return;

  manageButton.addEventListener("click", (event) => {
    event.stopPropagation();

    menu.classList.toggle("show");
  });

  const buttons = menu.querySelectorAll("button");

  /*
       Current HTML order:

       0 = Add Tag
       1 = Custom Order
       2 = Alphabetical
       3 = Edit Tags
    */

  if (buttons[0]) {
    buttons[0].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      openAddTagModal();
    });
  }

  if (buttons[1]) {
    buttons[1].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      openCustomOrderModal();
    });
  }

  if (buttons[2]) {
    buttons[2].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      setAlphabeticalOrder();
    });
  }

  if (buttons[3]) {
    buttons[3].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      openEditTagsModal();
    });
  }
}

function closeManageMenu() {
  if (!menu) return;

  menu.classList.remove("show");
}

document.addEventListener("click", (event) => {
  if (menu && !menu.contains(event.target) && event.target !== manageButton) {
    closeManageMenu();
  }
});

/* ==========================================================
   ALPHABETICAL ORDER
========================================================== */

function setAlphabeticalOrder() {
  tagOrderMode = "alphabetical";

  renderTags();
}

/* ==========================================================
   CUSTOM ORDER
========================================================== */

function setCustomOrder() {
  tagOrderMode = "custom";

  renderTags();
}

/* ==========================================================
   MODAL BASE
========================================================== */

function createModal({ title, subtitle = "", className = "" }) {
  modalRoot.innerHTML = "";

  const overlay = document.createElement("div");

  overlay.className = `tag-modal-overlay ${className}`.trim();

  overlay.innerHTML = `
    <div class="tag-modal">

        <div class="tag-modal-header">

            <div>
                <h2>${escapeHTML(title)}</h2>

                ${subtitle ? `<p>${escapeHTML(subtitle)}</p>` : ""}
            </div>

            <button
                class="tag-modal-close"
                type="button"
                aria-label="Close"
            >
                <i data-lucide="x"></i>
            </button>

        </div>

        <!-- ONLY THIS AREA SCROLLS -->
        <div class="tag-modal-body"></div>

        <!-- ALWAYS FIXED AT MODAL BOTTOM -->
        <div class="tag-modal-footer"></div>

    </div>
`;

  modalRoot.appendChild(overlay);

  const closeButton = overlay.querySelector(".tag-modal-close");

  closeButton.addEventListener("click", closeModal);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  refreshIcons();

  return {
    overlay,

    body: overlay.querySelector(".tag-modal-body"),

    footer: overlay.querySelector(".tag-modal-footer"),
  };
}

/* ==========================================================
   CLOSE MODAL
========================================================== */

function closeModal() {
  if (!modalRoot) return;

  modalRoot.innerHTML = "";
}

/* ==========================================================
   ADD TAG MODAL
========================================================== */

function openAddTagModal() {
  const modal = createModal({
    title: "Add Tag",
    subtitle: "Create a new tag to organize your music.",
  });

  modal.body.innerHTML = `

        <form class="tag-form" id="addTagForm">

            <label class="tag-form-label">
                TAG NAME
            </label>

            <input
                id="newTagName"
                class="tag-form-input"
                type="text"
                maxlength="40"
                placeholder="Enter tag name..."
                autocomplete="off"
                required
            />

            <div class="tag-form-hint">
                Keep it short and meaningful.
            </div>


            <label class="tag-form-label tag-icon-label">
                ICON (OPTIONAL)
            </label>

            <div
                class="tag-icon-picker"
                id="addTagIconPicker"
            ></div>

            <div class="tag-form-hint">
                Choose an icon to represent this tag.
            </div>

        </form>
    `;

  modal.footer.innerHTML = `
    <button
        type="button"
        class="tag-secondary-button"
        id="cancelAddTag"
    >
        Cancel
    </button>

    <button
        type="submit"
        form="addTagForm"
        class="tag-primary-button"
    >
        Add Tag
    </button>
`;

  renderIconPicker(document.getElementById("addTagIconPicker"), "moon");

  document.getElementById("cancelAddTag").addEventListener("click", closeModal);

  document.getElementById("addTagForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("newTagName").value.trim();

    const selectedIcon =
      document.querySelector("#addTagIconPicker .tag-icon-option.selected")
        ?.dataset.icon || "moon";

    if (!name) return;

    const duplicate = tags.some(
      (tag) => tag.name.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      alert("A tag with this name already exists.");

      return;
    }

    const newTag = {
      id: createTagId(name),

      name,

      icon: selectedIcon,
    };

    tags.push(newTag);

    saveTags();

    setCustomOrder();

    closeModal();

    renderTags();
  });

  setTimeout(() => {
    document.getElementById("newTagName")?.focus();
  }, 50);
}

/* ==========================================================
   ICON PICKER
========================================================== */

function renderIconPicker(container, selectedIcon) {
  if (!container) return;

  container.innerHTML = "";

  TAG_ICONS.forEach((iconName) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "tag-icon-option";

    button.dataset.icon = iconName;

    if (iconName === selectedIcon) {
      button.classList.add("selected");
    }

    button.appendChild(createIcon(iconName));

    button.title = iconName;

    button.addEventListener("click", () => {
      container
        .querySelectorAll(".tag-icon-option")
        .forEach((item) => item.classList.remove("selected"));

      button.classList.add("selected");
    });

    container.appendChild(button);
  });

  refreshIcons();
}

/* ==========================================================
   EDIT TAGS MODAL
========================================================== */

function openEditTagsModal() {
  const modal = createModal({
    title: "Edit Tags",
    subtitle: "Rename, change icons or delete your tags.",
    className: "edit-tags-modal",
  });

  modal.body.innerHTML = `

        <div class="tag-edit-toolbar">

            <div class="tag-edit-search">

                <i data-lucide="search"></i>

                <input
                    id="editTagsSearch"
                    type="text"
                    placeholder="Search tags..."
                />

            </div>

        </div>


        <div
            class="tag-edit-list"
            id="tagEditList"
        ></div>

    `;

  modal.footer.innerHTML = `
    <button
        type="button"
        class="tag-secondary-button"
        id="closeEditTags"
    >
        Done
    </button>
`;

  renderEditTagList();

  document
    .getElementById("closeEditTags")
    .addEventListener("click", closeModal);

  document
    .getElementById("editTagsSearch")
    .addEventListener("input", renderEditTagList);
}

/* ==========================================================
   EDIT TAG LIST
========================================================== */

function renderEditTagList() {
  const list = document.getElementById("tagEditList");

  if (!list) return;

  const searchInput = document.getElementById("editTagsSearch");

  const search = searchInput ? searchInput.value.trim().toLowerCase() : "";

  list.innerHTML = "";

  tags
    .filter((tag) => tag.name.toLowerCase().includes(search))
    .forEach((tag) => {
      const row = document.createElement("div");

      row.className = "tag-edit-row";

      row.dataset.tagId = tag.id;

      row.innerHTML = `

                <div class="tag-edit-icon">
                    <i data-lucide="${escapeHTML(tag.icon)}"></i>
                </div>

                <div class="tag-edit-name">
                    ${escapeHTML(tag.name)}
                </div>

                <button
                    type="button"
                    class="tag-row-action tag-row-edit"
                    title="Edit tag"
                >
                    <i data-lucide="pencil"></i>
                </button>

                <button
                    type="button"
                    class="tag-row-action tag-row-delete"
                    title="Delete tag"
                >
                    <i data-lucide="trash-2"></i>
                </button>
            `;

      row.querySelector(".tag-row-edit").addEventListener("click", () => {
        openEditTagModal(tag.id);
      });

      row.querySelector(".tag-row-delete").addEventListener("click", () => {
        deleteTag(tag.id);
      });

      list.appendChild(row);
    });

  refreshIcons();
}

/* ==========================================================
   EDIT SINGLE TAG
========================================================== */

function openEditTagModal(tagId) {
  const tag = tags.find((item) => item.id === tagId);

  if (!tag) return;

  if (tag.id === "all") {
    alert("ALL is a system tag and cannot be edited.");

    return;
  }

  const modal = createModal({
    title: "Edit Tag",
    subtitle: "Change the tag name or icon.",
  });

  modal.body.innerHTML = `

        <form
            class="tag-form"
            id="editTagForm"
        >

            <label class="tag-form-label">
                TAG NAME
            </label>

            <input
                id="editTagName"
                class="tag-form-input"
                type="text"
                maxlength="40"
                value="${escapeHTML(tag.name)}"
                required
            />


            <label class="tag-form-label tag-icon-label">
                ICON
            </label>

            <div
                class="tag-icon-picker"
                id="editTagIconPicker"
            ></div>
        </form>
    `;

  modal.footer.innerHTML = `
    <button
        type="button"
        class="tag-secondary-button"
        id="cancelEditTag"
    >
        Cancel
    </button>

    <button
        type="submit"
        form="editTagForm"
        class="tag-primary-button"
    >
        Save Changes
    </button>
`;

  renderIconPicker(document.getElementById("editTagIconPicker"), tag.icon);

  document.getElementById("cancelEditTag").addEventListener("click", () => {
    openEditTagsModal();
  });

  document.getElementById("editTagForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const newName = document.getElementById("editTagName").value.trim();

    const newIcon =
      document.querySelector("#editTagIconPicker .tag-icon-option.selected")
        ?.dataset.icon || tag.icon;

    if (!newName) return;

    const duplicate = tags.some(
      (item) =>
        item.id !== tag.id && item.name.toLowerCase() === newName.toLowerCase(),
    );

    if (duplicate) {
      alert("A tag with this name already exists.");

      return;
    }

    tag.name = newName;

    tag.icon = newIcon;

    saveTags();

    renderTags();

    openEditTagsModal();
  });
}

/* ==========================================================
   DELETE TAG
========================================================== */

function deleteTag(tagId) {
  if (tagId === "all") {
    alert("ALL is a system tag and cannot be deleted.");

    return;
  }

  const tag = tags.find((item) => item.id === tagId);

  if (!tag) return;

  const confirmed = confirm(
    `Delete "${tag.name}"?\n\nThis will remove the tag from MoonBox.`,
  );

  if (!confirmed) return;

  tags = tags.filter((item) => item.id !== tagId);

  selectedTagIds.delete(tagId);

  saveTags();

  renderTags();

  renderEditTagList();

  document.dispatchEvent(
    new CustomEvent("moonbox:tagDeleted", {
      detail: {
        tagId,
      },
    }),
  );
}

/* ==========================================================
   CUSTOM ORDER MODAL
========================================================== */

function openCustomOrderModal() {
  const modal = createModal({
    title: "Custom Order",
    subtitle: "Drag tags to arrange your preferred order.",
    className: "custom-order-modal",
  });

  modal.body.innerHTML = `

        <div
            class="tag-order-list"
            id="tagOrderList"
        ></div>



    `;

  modal.footer.innerHTML = `
    <button
        type="button"
        class="tag-secondary-button"
        id="cancelTagOrder"
    >
        Cancel
    </button>

    <button
        type="button"
        class="tag-primary-button"
        id="saveTagOrder"
    >
        Save Order
    </button>
`;

  renderOrderList();

  document
    .getElementById("cancelTagOrder")
    .addEventListener("click", closeModal);

  document
    .getElementById("saveTagOrder")
    .addEventListener("click", saveCustomOrder);
}

/* ==========================================================
   RENDER ORDER LIST
========================================================== */

function renderOrderList() {
  const list = document.getElementById("tagOrderList");

  if (!list) return;

  list.innerHTML = "";

  tags.forEach((tag) => {
    const row = document.createElement("div");

    row.className = "tag-order-row";

    row.dataset.tagId = tag.id;

    row.innerHTML = `

            <button
                type="button"
                class="tag-drag-handle"
                aria-label="Drag ${escapeHTML(tag.name)}"
            >
                <i data-lucide="grip-vertical"></i>
            </button>

            <div class="tag-order-icon">
                <i data-lucide="${escapeHTML(tag.icon)}"></i>
            </div>

            <span class="tag-order-name">
                ${escapeHTML(tag.name)}
            </span>
        `;

    list.appendChild(row);
  });

  refreshIcons();

  setupPointerDragging();
}

/* ==========================================================
   POINTER DRAGGING
   Works better on touch devices than native draggable.
========================================================== */

function setupPointerDragging() {
  const list = document.getElementById("tagOrderList");

  if (!list) return;

  const rows = [...list.querySelectorAll(".tag-order-row")];

  let activeRow = null;

  let startY = 0;

  let dragging = false;

  rows.forEach((row) => {
    const handle = row.querySelector(".tag-drag-handle");

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      activeRow = row;

      startY = event.clientY;

      dragging = false;

      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!activeRow) return;

      const distance = Math.abs(event.clientY - startY);

      if (!dragging && distance < 6) {
        return;
      }

      dragging = true;

      activeRow.classList.add("dragging");

      const siblings = [
        ...list.querySelectorAll(".tag-order-row:not(.dragging)"),
      ];

      const nextRow = siblings.find((sibling) => {
        const rect = sibling.getBoundingClientRect();

        return event.clientY < rect.top + rect.height / 2;
      });

      if (nextRow) {
        list.insertBefore(activeRow, nextRow);
      } else {
        list.appendChild(activeRow);
      }
    });

    handle.addEventListener("pointerup", (event) => {
      if (!activeRow) return;

      activeRow.classList.remove("dragging");

      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }

      activeRow = null;

      dragging = false;
    });

    handle.addEventListener("pointercancel", () => {
      if (!activeRow) return;

      activeRow.classList.remove("dragging");

      activeRow = null;

      dragging = false;
    });
  });
}

/* ==========================================================
   SAVE CUSTOM ORDER
========================================================== */

function saveCustomOrder() {
  const list = document.getElementById("tagOrderList");

  if (!list) return;

  const orderedIds = [...list.querySelectorAll(".tag-order-row")].map(
    (row) => row.dataset.tagId,
  );

  const tagMap = new Map(tags.map((tag) => [tag.id, tag]));

  tags = orderedIds.map((id) => tagMap.get(id)).filter(Boolean);

  saveTags();

  setCustomOrder();

  closeModal();

  renderTags();
}

/* ==========================================================
   KEYBOARD ESCAPE
========================================================== */

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modalRoot && modalRoot.children.length) {
    closeModal();
  }
});

/* ==========================================================
   PUBLIC EVENTS
   Useful later for Library / Player.
========================================================== */

document.addEventListener("moonbox:requestTags", (event) => {
  if (event.detail && typeof event.detail.setTags === "function") {
    event.detail.setTags([...tags]);
  }
});

document.addEventListener("moonbox:removeTag", (event) => {
  const tagId = event.detail?.tagId;

  if (!tagId) return;

  /* Actual selection state lives here */

  selectedTagIds.delete(tagId);

  /* Update Tag UI */

  renderTags();

  /* Tell Library */

  document.dispatchEvent(
    new CustomEvent("moonbox:tagsChanged", {
      detail: {
        selectedTagIds: [...selectedTagIds],
      },
    }),
  );
});

/* ==========================================================
   FOLDER → TAG CONNECTION
========================================================== */

document.addEventListener("moonbox:foldersReady", (event) => {
  const folders = event.detail?.folders;

  if (!folders) return;

  syncFolderTags(folders);
});

/* ==========================================================
   INITIALIZE
========================================================== */

setupManageMenu();

renderTags();

refreshIcons();
