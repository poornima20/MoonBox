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

let tagOrderMode = "tags";

let editingTagId = null;

let draggedTagId = null;

/* ==========================================================
   TAG GROUPS
========================================================== */

/*
   Groups are only an organizational layer for tags.

   Tags remain the main data structure.

   Each tag can contain:
      groupId
      groupName
      groupOrder
      order
*/

const DEFAULT_GROUP = {
  id: "default",
  name: "Default",
  order: 0,
  system: true,
};

let tagGroups = loadTagGroups();

/*
   Cloud tag membership

   Key:
      tagId

   Value:
      Set of cloud song IDs belonging to that tag
*/
let cloudTagSongIds = new Map();

/* ==========================================================
   ELEMENTS
========================================================== */

const grid = document.getElementById("tagGrid");

const menu = document.getElementById("tagMenu");

const manageButton = document.getElementById("tagManageButton");

const searchInput = document.getElementById("tagSearch");

const selectionFooter = document.getElementById("tagSelectionFooter");

const selectedTagCount = document.getElementById("selectedTagCount");

const selectedSongCount = document.getElementById("selectedSongCount");

const viewLibraryButton = document.getElementById("tagViewLibrary");

const clearSelectionButton = document.getElementById("tagClearSelection");

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
   LOAD TAG GROUPS
========================================================== */

function loadTagGroups() {
  try {
    const saved = localStorage.getItem("moonboxTagGroups");

    let groups = [];

    if (saved) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        groups = parsed;
      }
    }

    /*
       Always make sure Default exists.
    */

    const defaultExists = groups.some((group) => group.id === DEFAULT_GROUP.id);

    if (!defaultExists) {
      groups.unshift({ ...DEFAULT_GROUP });
    }

    return groups.sort((a, b) => {
      return (a.order ?? 0) - (b.order ?? 0);
    });
  } catch (error) {
    console.warn("MoonBox: Could not load tag groups.", error);

    return [{ ...DEFAULT_GROUP }];
  }
}

/* ==========================================================
   SAVE TAG GROUPS
========================================================== */

function saveTagGroups() {
  try {
    localStorage.setItem("moonboxTagGroups", JSON.stringify(tagGroups));
  } catch (error) {
    console.warn("MoonBox: Could not save tag groups.", error);
  }
}

/* ==========================================================
   CREATE GROUP ID
========================================================== */

function createGroupId(name) {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "group";

  let id = base;

  let number = 2;

  while (tagGroups.some((group) => group.id === id)) {
    id = `${base}-${number}`;

    number++;
  }

  return id;
}

/* ==========================================================
   NORMALIZE TAG GROUP DATA
========================================================== */

function normalizeTagGroups() {
  if (!Array.isArray(tagGroups)) {
    tagGroups = [];
  }

  ensureDefaultGroup();

  /*
     Every tag without a group
     automatically belongs to Default.
  */

  tags.forEach((tag, index) => {
    if (!tag.groupId) {
      tag.groupId = "default";
    }

    const group = getTagGroup(tag);

    if (!group) {
      tag.groupId = "default";
    }

    if (!tag.groupName) {
      tag.groupName = getTagGroup(tag).name;
    }

    if (typeof tag.order !== "number") {
      tag.order = index;
    }
  });

  /*
     Rebuild group ordering safely.
  */

  tagGroups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  saveTagGroups();
  saveTags();
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
  }
}

/* ==========================================================
   REMOVE DELETED FOLDER TAGS
   Folder-generated tags must disappear when their
   corresponding folder is deleted.
========================================================== */

function syncDeletedFolderTags(folders) {
  if (!Array.isArray(folders)) return;

  /* Get IDs of folders that still exist */

  const existingFolderTagIds = new Set(
    folders
      .filter((folder) => folder && folder.tagId !== "all")
      .map((folder) => folder.tagId),
  );

  let changed = false;

  /* Remove only tags that were generated by folders */

  tags = tags.filter((tag) => {
    /* ALL is always protected */

    if (tag.id === "all") {
      return true;
    }

    /* Normal user-created tag */
    if (!tag.folderTag) {
      return true;
    }

    /* Keep folder tag if its folder still exists */

    if (existingFolderTagIds.has(tag.id)) {
      return true;
    }

    /* Folder was deleted */

    selectedTagIds.delete(tag.id);

    changed = true;

    return false;
  });

  if (changed) {
    saveTags();
  }

  return changed;
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

  const songCount = getTagSongCount(tag.id);

  button.innerHTML = `
    <div class="tag-circle">
      <i data-lucide="${escapeHTML(tag.icon)}"></i>
    </div>

    <span class="tag-name">
      ${escapeHTML(tag.name)}
    </span>

    <small class="tag-song-count">
      ${songCount} ${songCount === 1 ? "song" : "songs"}
    </small>
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
  updateSelectionFooter(); /* Update bottom footer */

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
   CLOUD GROUP STATE → LOCAL
========================================================== */

document.addEventListener("moonbox:cloudTagGroupsReady", (event) => {
  const cloudGroups = event.detail?.groups;
  const tagStates = event.detail?.tagStates;

  if (!Array.isArray(cloudGroups)) {
    return;
  }

  /*
       Always keep Default.
    */

  const defaultGroup = {
    ...DEFAULT_GROUP,
  };

  /*
       Load cloud groups.
    */

  tagGroups = cloudGroups.map((group) => ({
    id: String(group.id),
    name: group.name || "Default",
    order: Number(group.order ?? 0),
    system: !!group.system,
  }));

  /*
       Make sure Default exists.
    */

  if (!tagGroups.some((group) => group.id === "default")) {
    tagGroups.unshift(defaultGroup);
  }

  ensureDefaultGroup();

  /*
       Apply saved group membership/order
       to local tags.
    */

  tags.forEach((tag) => {
    const state = tagStates?.[String(tag.id)];

    if (!state) {
      return;
    }

    tag.groupId = state.groupId || "default";

    tag.groupName =
      state.groupName ||
      tagGroups.find((group) => group.id === tag.groupId)?.name ||
      "Default";

    tag.groupOrder = Number(state.groupOrder ?? 0);

    tag.order = Number(state.order ?? 0);
  });

  /*
       Normalize anything missing.
    */

  normalizeTagGroups();

  /*
       Save the restored state locally.
    */

  saveTagGroups();
  saveTags();

  /*
       Refresh the UI.
    */

  renderTags();
  updateSelectionFooter();

  console.log("MoonBox: cloud group state restored", tagGroups, tags);
});

/* ==========================================================
   TAG SELECTION FOOTER
========================================================== */

let currentFolders = [];

/* ==========================================================
   GET ALL MOONBOX SONGS
   Master song collection comes from folders.js
========================================================== */

function getAllMoonBoxSongs() {
  /*
     The "all" folder is the master collection.
     currentFolders is populated by moonbox:foldersReady.
  */

  if (!Array.isArray(currentFolders)) {
    return [];
  }

  const allFilesFolder = currentFolders.find(
    (folder) => folder.tagId === "all",
  );

  if (!allFilesFolder) {
    return [];
  }

  return Array.isArray(allFilesFolder.songs) ? allFilesFolder.songs : [];
}

/* ==========================================================
   CLOUD SONG ID
   Must match cloud.js
========================================================== */

function getLocalCloudSongId(song) {
  if (!song?.name) {
    return null;
  }

  return String(song.name)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getTagSongCount(tagId) {
  const allSongs = getAllMoonBoxSongs();

  /* -----------------------------------------------
     ALL is always local
  ------------------------------------------------ */

  if (tagId === "all") {
    return allSongs.length;
  }

  /* -----------------------------------------------
     Cloud tag

     Use Firebase tag.songIds.

     This means the count works even when the
     local song.tags array has not been updated yet.
  ------------------------------------------------ */

  if (cloudTagSongIds.has(tagId)) {
    return cloudTagSongIds.get(tagId).size;
  }

  /* -----------------------------------------------
     Folder/local tag

     Folder tags remain completely local.
  ------------------------------------------------ */

  return allSongs.filter((song) => {
    const songTags = Array.isArray(song.tags) ? song.tags : [];

    return songTags.includes(tagId);
  }).length;
}

/* ==========================================================
   COUNT SONGS FOR SELECTED TAGS
========================================================== */

function getSelectedSongCount() {
  const allSongs = getAllMoonBoxSongs();

  /* Nothing selected */
  if (selectedTagIds.size === 0) {
    return 0;
  }

  /* -----------------------------------------------
     ALL = every local song
  ------------------------------------------------ */

  if (selectedTagIds.has("all")) {
    return allSongs.length;
  }

  const selected = [...selectedTagIds];

  /* -----------------------------------------------
     UNION
     
     Song needs ANY selected tag.
     
     Cloud tags are matched using the same
     cloud song ID used by cloud.js.
  ------------------------------------------------ */

  const matchingSongs = allSongs.filter((song) => {
    const localTags = Array.isArray(song.tags) ? song.tags : [];

    const cloudSongId = getLocalCloudSongId(song);

    return selected.some((tagId) => {
      /* Cloud tag */
      if (cloudTagSongIds.has(tagId)) {
        return cloudSongId && cloudTagSongIds.get(tagId).has(cloudSongId);
      }

      /* Local/folder tag */
      return localTags.includes(tagId);
    });
  });

  return matchingSongs.length;
}

/* ==========================================================
   NAVIGATION GUARD
   Prevent Library / Player when there is nothing to show
========================================================== */

function checkMoonBoxNavigation() {
  /*
     No tags selected
  */
  if (selectedTagIds.size === 0) {
    showMoonBoxNavigationPopup(
      "No tags selected",
      "Select at least one tag to continue.",
      "Select Tags",
    );

    return false;
  }

  /*
     Tags selected but no matching songs
  */
  const songCount = getSelectedSongCount();

  if (songCount === 0) {
    showMoonBoxNavigationPopup(
      "No songs found",
      "Add songs to a folder that match your selected tags to continue.",
      "Open Folders",
    );

    return false;
  }

  /*
     Everything is ready
  */
  return true;
}

/* ==========================================================
   NAVIGATION POPUP
========================================================== */

function showMoonBoxNavigationPopup(title, message, actionText) {
  const existingPopup = document.getElementById("moonboxNavigationPopup");

  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");

  popup.id = "moonboxNavigationPopup";

  popup.innerHTML = `
    <div class="moonbox-navigation-overlay">

      <div class="moonbox-navigation-popup">

        <div class="moonbox-popup-logo">
          <img
            src="assets/moonboxlogo.png"
            alt="MoonBox"
          />
        </div>

        <div class="moonbox-popup-content">

          <h2>${escapeHTML(title)}</h2>

          <p>${escapeHTML(message)}</p>

        </div>

        <div class="moonbox-popup-actions">

          <button
            type="button"
            class="moonbox-popup-secondary"
            id="moonboxPopupCancel"
          >
            Cancel
          </button>

          <button
            type="button"
            class="moonbox-popup-primary"
            id="moonboxPopupAction"
          >
            ${escapeHTML(actionText)}
          </button>

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(popup);

  refreshIcons();

  const overlay = popup.querySelector(".moonbox-navigation-overlay");

  const cancelButton = document.getElementById("moonboxPopupCancel");

  const actionButton = document.getElementById("moonboxPopupAction");

  function closePopup() {
    popup.remove();
  }

  cancelButton.addEventListener("click", closePopup);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closePopup();
    }
  });

  actionButton.addEventListener("click", () => {
    /*
       No tags selected:
       simply close and let user select tags.
    */
    if (selectedTagIds.size === 0) {
      closePopup();
      return;
    }

    /*
       Songs missing:
       open the Folder manager.
    */
    const folderButton = document.getElementById("openFolders");

    closePopup();

    if (folderButton) {
      folderButton.click();
    }
  });
}

/* ==========================================================
   CLEAR TAG SELECTION
========================================================== */

if (clearSelectionButton) {
  clearSelectionButton.addEventListener("click", () => {
    /* Uncheck every tag */
    selectedTagIds.clear();

    /* Update tag circles */
    renderTags();

    /* Update footer counts */
    updateSelectionFooter();

    /* Tell Library / Player */
    document.dispatchEvent(
      new CustomEvent("moonbox:tagsChanged", {
        detail: {
          selectedTagIds: [],
        },
      }),
    );
  });
}

/* ==========================================================
   UPDATE FOOTER
========================================================== */

function updateSelectionFooter() {
  if (!selectedTagCount || !selectedSongCount) {
    return;
  }

  const tagCount = selectedTagIds.size;
  const songCount = getSelectedSongCount();

  /* ---------- Tag text ---------- */

  selectedTagCount.textContent = `${tagCount} ${tagCount === 1 ? "tag" : "tags"} selected`;

  /* ---------- Song text ---------- */

  selectedSongCount.textContent = `${songCount} ${songCount === 1 ? "song" : "songs"} match your selection`;

  /* ---------- Clear selection ---------- */

  if (clearSelectionButton) {
    clearSelectionButton.style.display = tagCount > 0 ? "inline-flex" : "none";
  }
}

/* ==========================================================
   RENDER TAGS
========================================================== */

function renderTags() {
  if (!grid) return;

  grid.innerHTML = "";

  /* ========================================================
     TAGS — NORMAL
     
     No alphabetical headings.
     No group headings.
     Simply render the tags normally.
  ======================================================== */

  if (tagOrderMode === "tags") {
    const allTag = tags.find((tag) => tag.id === "all");

    const folderTags = tags.filter(
      (tag) => tag.folderTag === true && tag.id !== "all",
    );

    const normalTags = tags.filter(
      (tag) => tag.id !== "all" && tag.folderTag !== true,
    );

    /* ALL first */
    if (allTag) {
      grid.appendChild(createTagElement(allTag));
    }

    /* Folders second */
    folderTags.forEach((tag) => {
      grid.appendChild(createTagElement(tag));
    });

    /* User-created / normal tags last */
    normalTags.forEach((tag) => {
      grid.appendChild(createTagElement(tag));
    });
  } else if (tagOrderMode === "alphabetical") {
    /* ========================================================
     ALPHABETICAL
  ======================================================== */
    const tagsToRender = [...tags].sort((a, b) =>
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
  } else if (tagOrderMode === "custom") {
    /* ========================================================
     CUSTOM ORDER
     
     Group order:
       tagGroups.order

     Tag order:
       tag.order
  ======================================================== */
    normalizeTagGroups();

    const orderedGroups = [...tagGroups].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    orderedGroups.forEach((group) => {
      const groupTags = getTagsForGroup(group.id);

      /* Don't show empty groups */

      if (groupTags.length === 0) {
        return;
      }

      /* Group heading */

      const heading = document.createElement("div");

      heading.className = "tag-group-heading";

      heading.dataset.groupId = group.id;

      heading.textContent = group.name;

      grid.appendChild(heading);

      /* Tags inside group */

      groupTags.forEach((tag) => {
        grid.appendChild(createTagElement(tag));
      });
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
      tagElement.querySelector(".tag-name")?.textContent.toLowerCase() || "";

    tagElement.style.display = name.includes(value) ? "" : "none";
  });

  /* ========================================================
     ALPHABETICAL HEADINGS
  ======================================================== */

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

  /* ========================================================
     CUSTOM GROUP HEADINGS
  ======================================================== */

  if (tagOrderMode === "custom") {
    const groups = grid.querySelectorAll(".tag-group-heading");

    groups.forEach((heading) => {
      let next = heading.nextElementSibling;

      let hasVisibleTag = false;

      while (next && !next.classList.contains("tag-group-heading")) {
        if (next.classList.contains("tag") && next.style.display !== "none") {
          hasVisibleTag = true;
          break;
        }

        next = next.nextElementSibling;
      }

      heading.style.display = hasVisibleTag ? "" : "none";
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
   VIEW LIBRARY
========================================================== */

if (viewLibraryButton) {
  viewLibraryButton.addEventListener("click", () => {
    if (!checkMoonBoxNavigation()) {
      return;
    }

    const libraryButton = document.querySelector(
      '.nav-button[data-screen="1"]',
    );

    if (libraryButton) {
      libraryButton.click();
    }
  });
}

/* ==========================================================
   MANAGE MENU
========================================================== */

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
     1 = Tags
     2 = Custom Order
     3 = Alphabetical
     4 = Edit Tags
  */

  /* ---------- Add Tag ---------- */

  if (buttons[0]) {
    buttons[0].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      openAddTagModal();
    });
  }

  /* ---------- Tags ---------- */

  if (buttons[1]) {
    buttons[1].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      setTagsMode();
    });
  }

  /* ---------- Custom Order ---------- */

  if (buttons[2]) {
    buttons[2].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      openCustomOrderModal();
    });
  }

  /* ---------- Alphabetical ---------- */

  if (buttons[3]) {
    buttons[3].addEventListener("click", (event) => {
      event.stopPropagation();

      closeManageMenu();

      setAlphabeticalOrder();
    });
  }

  /* ---------- Edit Tags ---------- */

  if (buttons[4]) {
    buttons[4].addEventListener("click", (event) => {
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
   TAGS — NORMAL ORDER
========================================================== */

function setTagsMode() {
  tagOrderMode = "tags";

  renderTags();
}

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
      name: name,
      icon: selectedIcon,

      groupId: "default",
      groupName: "Default",
      groupOrder: 0,
      order: tags.length,

      system: false,
    };

    tags.push(newTag);

    saveTags();

    document.dispatchEvent(
      new CustomEvent("moonbox:tagCreated", {
        detail: {
          tag: { ...newTag },
        },
      }),
    );

    setTagsMode();

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

    document.dispatchEvent(
      new CustomEvent("moonbox:tagUpdated", {
        detail: {
          tag: { ...tag },
        },
      }),
    );

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
  normalizeTagGroups();

  const modal = createModal({
    title: "Custom Order",
    subtitle: "Drag groups and tags to arrange your preferred order.",
    className: "custom-order-modal",
  });

  modal.body.innerHTML = `

    <div class="tag-group-toolbar">

      <button
        type="button"
        class="tag-add-group-button"
        id="addTagGroup"
      >
        <i data-lucide="plus"></i>
        <span>Add Group</span>
      </button>

    </div>

    <div
      class="tag-order-groups"
      id="tagOrderGroups"
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

  renderOrderGroups();

  document.getElementById("addTagGroup").addEventListener("click", addTagGroup);

  document
    .getElementById("cancelTagOrder")
    .addEventListener("click", closeModal);

  document
    .getElementById("saveTagOrder")
    .addEventListener("click", saveCustomOrder);
}

/* ==========================================================
   GET GROUP
========================================================== */
function getTagGroup(tag) {
  return (
    tagGroups.find((group) => group.id === (tag.groupId || "default")) ||
    DEFAULT_GROUP
  );
}

function getTagsForGroup(groupId) {
  return tags
    .filter((tag) => (tag.groupId || "default") === groupId)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function ensureDefaultGroup() {
  let defaultGroup = tagGroups.find((group) => group.id === "default");

  if (!defaultGroup) {
    defaultGroup = {
      ...DEFAULT_GROUP,
    };

    tagGroups.unshift(defaultGroup);
  }

  defaultGroup.name = "Default";
  defaultGroup.system = true;
  defaultGroup.order = 0;

  return defaultGroup;
}

/* ==========================================================
   ADD GROUP
========================================================== */

function addTagGroup() {
  const name = window.prompt("Enter group name:");

  if (!name) {
    return;
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    return;
  }

  const duplicate = tagGroups.some(
    (group) => group.name.toLowerCase() === trimmedName.toLowerCase(),
  );

  if (duplicate) {
    alert("A group with this name already exists.");
    return;
  }

  const nextOrder =
    tagGroups.length > 0
      ? Math.max(...tagGroups.map((group) => group.order ?? 0)) + 1
      : 0;

  const newGroup = {
    id: createGroupId(trimmedName),
    name: trimmedName,
    order: nextOrder,
    system: false,
  };

  tagGroups.push(newGroup);

  renderOrderGroups();
}

/* ==========================================================
   RENDER GROUPS
========================================================== */

function renderOrderGroups() {
  const container = document.getElementById("tagOrderGroups");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  /*
     Sort groups by their current order.
  */

  const orderedGroups = [...tagGroups].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  orderedGroups.forEach((group) => {
    const groupElement = createOrderGroup(group);

    container.appendChild(groupElement);
  });

  refreshIcons();

  setupGroupDragging();
  setupTagDragging();
}

/* ==========================================================
   CREATE GROUP
========================================================== */
function createOrderGroup(group) {
  const groupElement = document.createElement("div");

  groupElement.className = "tag-order-group";

  groupElement.dataset.groupId = group.id;

  const groupTags = getTagsForGroup(group.id);

  const editButton = group.system
    ? ""
    : `
      <button
        type="button"
        class="tag-group-edit-button"
        data-group-edit="${escapeHTML(group.id)}"
        aria-label="Edit ${escapeHTML(group.name)}"
      >
        <i data-lucide="pencil"></i>
      </button>
    `;

  groupElement.innerHTML = `

    <div class="tag-order-group-header">

      <button
        type="button"
        class="tag-group-drag-handle"
        aria-label="Drag group"
      >
        <i data-lucide="grip-vertical"></i>
      </button>

      <div class="tag-group-title">
        ${escapeHTML(group.name)}
      </div>

      <span class="tag-group-count">
        ${groupTags.length}
        ${groupTags.length === 1 ? "tag" : "tags"}
      </span>

      <div class="tag-group-actions">
        ${editButton}
      </div>

    </div>

    <div
      class="tag-order-group-tags"
      data-group-id="${escapeHTML(group.id)}"
    ></div>

  `;

  const tagContainer = groupElement.querySelector(".tag-order-group-tags");

  groupTags.forEach((tag) => {
    tagContainer.appendChild(createOrderTag(tag));
  });

  const edit = groupElement.querySelector("[data-group-edit]");

  if (edit) {
    edit.addEventListener("click", () => {
      editTagGroup(group.id);
    });
  }

  return groupElement;
}

function editTagGroup(groupId) {
  const group = tagGroups.find((item) => item.id === groupId);

  if (!group) return;

  /* Default can never be edited */
  if (group.system) {
    return;
  }

  const groupElement = document.querySelector(
    `.tag-order-group[data-group-id="${CSS.escape(groupId)}"]`,
  );

  if (!groupElement) return;

  const title = groupElement.querySelector(".tag-group-title");
  const count = groupElement.querySelector(".tag-group-count");
  const actions = groupElement.querySelector(".tag-group-actions");

  if (!title || !count || !actions) {
    return;
  }

  /*
     Replace title with input
  */

  title.innerHTML = `
    <input
      type="text"
      class="tag-group-name-input"
      value="${escapeHTML(group.name)}"
      maxlength="40"
      autocomplete="off"
    />
  `;

  /*
     Hide count while editing
  */

  count.style.visibility = "hidden";

  /*
     Put both buttons inside the same
     action container.
  */

  actions.innerHTML = `
    <button
      type="button"
      class="tag-group-confirm-button"
      aria-label="Save group name"
      title="Save"
    >
      <i data-lucide="check"></i>
    </button>

    <button
      type="button"
      class="tag-group-delete-button"
      aria-label="Delete group"
      title="Delete group"
    >
      <i data-lucide="trash-2"></i>
    </button>
  `;

  refreshIcons();

  const input = groupElement.querySelector(".tag-group-name-input");

  const confirmButton = groupElement.querySelector(".tag-group-confirm-button");

  const deleteButton = groupElement.querySelector(".tag-group-delete-button");

  input.focus();
  input.select();

  /*
     Confirm rename
  */

  confirmButton.addEventListener("click", () => {
    const newName = input.value.trim();

    if (!newName) {
      input.focus();
      return;
    }

    const duplicate = tagGroups.some(
      (item) =>
        item.id !== group.id &&
        item.name.toLowerCase() === newName.toLowerCase(),
    );

    if (duplicate) {
      alert("A group with this name already exists.");

      input.focus();

      return;
    }

    group.name = newName;

    /*
       Update group name inside
       every tag belonging to it.
    */

    tags.forEach((tag) => {
      if (tag.groupId === group.id) {
        tag.groupName = newName;
      }
    });

    saveTagGroups();
    saveTags();

    renderOrderGroups();
  });

  /*
     Delete group
  */

  deleteButton.addEventListener("click", () => {
    deleteTagGroup(group.id);
  });
}

/* ==========================================================
   CREATE TAG ROW
========================================================== */

function createOrderTag(tag) {
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

  return row;
}

function deleteTagGroup(groupId) {
  const group = tagGroups.find((item) => item.id === groupId);

  if (!group) return;

  /*
     Default can never be deleted.
  */

  if (group.system) {
    return;
  }

  const confirmed = window.confirm(
    `Delete "${group.name}"?\n\nThe tags inside it will be moved to Default.`,
  );

  if (!confirmed) {
    return;
  }

  /*
     Move all tags to Default.
  */

  tags.forEach((tag) => {
    if (tag.groupId === group.id) {
      tag.groupId = "default";
      tag.groupName = "Default";
      tag.groupOrder = 0;
    }
  });

  /*
     Remove group.
  */

  tagGroups = tagGroups.filter((item) => item.id !== group.id);

  ensureDefaultGroup();

  saveTagGroups();
  saveTags();

  renderOrderGroups();
}
/* ==========================================================
   GROUP DRAGGING
========================================================== */

function setupGroupDragging() {
  const container = document.getElementById("tagOrderGroups");

  if (!container) {
    return;
  }

  const groups = [...container.querySelectorAll(".tag-order-group")];

  groups.forEach((group) => {
    const handle = group.querySelector(".tag-group-drag-handle");

    if (!handle) {
      return;
    }

    let activeGroup = null;
    let startY = 0;
    let dragging = false;

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      activeGroup = group;

      startY = event.clientY;

      dragging = false;

      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!activeGroup) {
        return;
      }

      const distance = Math.abs(event.clientY - startY);

      if (!dragging && distance < 6) {
        return;
      }

      dragging = true;

      activeGroup.classList.add("dragging");

      const siblings = [
        ...container.querySelectorAll(".tag-order-group:not(.dragging)"),
      ];

      const nextGroup = siblings.find((sibling) => {
        const rect = sibling.getBoundingClientRect();

        return event.clientY < rect.top + rect.height / 2;
      });

      if (nextGroup) {
        container.insertBefore(activeGroup, nextGroup);
      } else {
        container.appendChild(activeGroup);
      }
    });

    handle.addEventListener("pointerup", (event) => {
      if (!activeGroup) {
        return;
      }

      activeGroup.classList.remove("dragging");

      if (handle.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }

      activeGroup = null;

      dragging = false;
    });

    handle.addEventListener("pointercancel", () => {
      if (!activeGroup) {
        return;
      }

      activeGroup.classList.remove("dragging");

      activeGroup = null;

      dragging = false;
    });
  });
}

/* ==========================================================
   TAG DRAGGING
   Supports:
      - Reordering inside group
      - Moving tag between groups
========================================================== */
function setupTagDragging() {
  const container = document.getElementById("tagOrderGroups");

  if (!container) return;

  const rows = [...container.querySelectorAll(".tag-order-row")];

  rows.forEach((row) => {
    const handle = row.querySelector(".tag-drag-handle");

    if (!handle) return;

    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;

    function getTargetGroup(event) {
      /*
         Temporarily hide the dragged row so
         elementFromPoint can see underneath it.
      */

      const previousPointerEvents = row.style.pointerEvents;

      row.style.pointerEvents = "none";

      const element = document.elementFromPoint(event.clientX, event.clientY);

      row.style.pointerEvents = previousPointerEvents;

      if (!element) {
        return null;
      }

      return element.closest(".tag-order-group");
    }

    function moveRow(event) {
      if (!dragging || event.pointerId !== pointerId) {
        return;
      }

      const targetGroup = getTargetGroup(event);

      if (!targetGroup) {
        return;
      }

      const targetTags = targetGroup.querySelector(".tag-order-group-tags");

      if (!targetTags) {
        return;
      }

      /*
         Remove previous target highlight.
      */

      document
        .querySelectorAll(".tag-order-group.drop-target")
        .forEach((group) => {
          group.classList.remove("drop-target");
        });

      targetGroup.classList.add("drop-target");

      /*
         Find rows in the target group,
         excluding the row currently being dragged.
      */

      const targetRows = [
        ...targetTags.querySelectorAll(".tag-order-row:not(.dragging)"),
      ];

      let inserted = false;

      for (const targetRow of targetRows) {
        const rect = targetRow.getBoundingClientRect();

        const midpoint = rect.top + rect.height / 2;

        if (event.clientY < midpoint) {
          targetTags.insertBefore(row, targetRow);

          inserted = true;

          break;
        }
      }

      /*
         If pointer is below all rows,
         put it at the end.
      */

      if (!inserted) {
        targetTags.appendChild(row);
      }
    }

    function stopDrag(event) {
      if (event.pointerId !== pointerId) {
        return;
      }

      document.removeEventListener("pointermove", moveRow);

      document.removeEventListener("pointerup", stopDrag);

      document.removeEventListener("pointercancel", stopDrag);

      row.classList.remove("dragging");

      document
        .querySelectorAll(".tag-order-group.drop-target")
        .forEach((group) => {
          group.classList.remove("drop-target");
        });

      row.style.pointerEvents = "";

      dragging = false;
      pointerId = null;
    }

    function startDrag(event) {
      event.preventDefault();

      pointerId = event.pointerId;

      startX = event.clientX;
      startY = event.clientY;

      dragging = false;

      /*
         Start listening globally.

         This is what allows the row to travel
         from one group to another reliably.
      */

      document.addEventListener("pointermove", moveRow);

      document.addEventListener("pointerup", stopDrag);

      document.addEventListener("pointercancel", stopDrag);

      /*
         Small movement threshold prevents
         accidental dragging.
      */

      const checkDrag = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }

        const distance = Math.hypot(
          moveEvent.clientX - startX,
          moveEvent.clientY - startY,
        );

        if (distance >= 5) {
          dragging = true;

          row.classList.add("dragging");

          document.removeEventListener("pointermove", checkDrag);
        }
      };

      document.addEventListener("pointermove", checkDrag);
    }

    handle.addEventListener("pointerdown", startDrag);
  });
}

/* ==========================================================
   SAVE CUSTOM ORDER
========================================================== */

function saveCustomOrder() {
  const container = document.getElementById("tagOrderGroups");

  if (!container) {
    return;
  }

  /*
     Read group order from the actual DOM.
  */

  const groupElements = [...container.querySelectorAll(".tag-order-group")];

  groupElements.forEach((groupElement, groupIndex) => {
    const groupId = groupElement.dataset.groupId;

    const group = tagGroups.find((item) => item.id === groupId);

    if (group) {
      group.order = groupIndex;
    }

    /*
         Read tag order inside this group.
      */

    const tagRows = [...groupElement.querySelectorAll(".tag-order-row")];

    tagRows.forEach((row, tagIndex) => {
      const tagId = row.dataset.tagId;

      const tag = tags.find((item) => item.id === tagId);

      if (!tag) {
        return;
      }

      tag.groupId = groupId;

      tag.groupName = group?.name || "Default";

      tag.groupOrder = groupIndex;

      tag.order = tagIndex;
    });
  });

  /*
     Save groups.
  */

  tagGroups = groupElements.map((groupElement, index) => {
    const group = tagGroups.find(
      (item) => item.id === groupElement.dataset.groupId,
    );

    return {
      ...group,
      order: index,
    };
  });

  saveTagGroups();

  saveTags();

  /*
     Keep normal Tag page custom order
     synchronized with the grouped order.
  */

  tags.sort((a, b) => {
    const groupA = tagGroups.find((group) => group.id === a.groupId);

    const groupB = tagGroups.find((group) => group.id === b.groupId);

    const groupOrderA = groupA?.order ?? 0;

    const groupOrderB = groupB?.order ?? 0;

    if (groupOrderA !== groupOrderB) {
      return groupOrderA - groupOrderB;
    }

    return (a.order ?? 0) - (b.order ?? 0);
  });

  saveTags();

  document.dispatchEvent(
    new CustomEvent("moonbox:tagGroupsChanged", {
      detail: {
        groups: tagGroups.map((group) => ({ ...group })),
        tags: tags.map((tag) => ({ ...tag })),
      },
    }),
  );

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

  renderTags(); /* Update Tag UI */
  updateSelectionFooter(); /* Update footer */

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
   PLAYER → TAG PAGE SONG TAG CHANGES
   Keep tag counts synchronized immediately.
========================================================== */

document.addEventListener("moonbox:songTagsChanged", (event) => {
  const song = event.detail?.song;

  if (!song) {
    return;
  }

  /* --------------------------------------------------------
   Synchronize cloud tag membership in memory.

   This keeps the Tag page immediately updated when
   a tag is added/removed from the Player.
-------------------------------------------------------- */

  const cloudSongId = getLocalCloudSongId(song);

  if (cloudSongId) {
    const changedTagId = event.detail?.tagId;
    const added = event.detail?.added;

    if (changedTagId && cloudTagSongIds.has(changedTagId)) {
      const songIds = cloudTagSongIds.get(changedTagId);

      if (added) {
        songIds.add(cloudSongId);
      } else {
        songIds.delete(cloudSongId);
      }
    }
  }

  /* --------------------------------------------------------
     Update the matching local song inside currentFolders
  -------------------------------------------------------- */

  currentFolders.forEach((folder) => {
    if (!Array.isArray(folder.songs)) {
      return;
    }

    const localSong = folder.songs.find(
      (item) => String(item.id) === String(song.id),
    );

    if (!localSong) {
      return;
    }

    /* Keep local tag membership synchronized */
    localSong.tags = Array.isArray(song.tags) ? [...song.tags] : [];

    /* Keep metadata reference values synchronized if needed */
    if (song.title !== undefined) {
      localSong.title = song.title;
    }

    if (song.artist !== undefined) {
      localSong.artist = song.artist;
    }
  });

  /* --------------------------------------------------------
     Refresh tag counts immediately
  -------------------------------------------------------- */

  renderTags();

  updateSelectionFooter();

  refreshIcons();
});

/* ==========================================================
   FOLDER → TAG CONNECTION
========================================================== */

document.addEventListener("moonbox:foldersReady", (event) => {
  const folders = event.detail?.folders;

  if (!Array.isArray(folders)) {
    return;
  }

  /* ========================================================
     STORE CURRENT FOLDERS
  ======================================================== */

  currentFolders = folders;

  /* ========================================================
     CREATE TAGS FOR NEW FOLDERS
  ======================================================== */

  syncFolderTags(folders);

  /* ========================================================
     REMOVE TAGS FOR DELETED FOLDERS
  ======================================================== */

  syncDeletedFolderTags(folders);

  /* ========================================================
     REFRESH TAG UI
  ======================================================== */

  renderTags();

  updateSelectionFooter();

  /* ========================================================
     TELL OTHER PARTS OF MOONBOX THAT TAGS CHANGED
  ======================================================== */

  document.dispatchEvent(
    new CustomEvent("moonbox:tagsChanged", {
      detail: {
        selectedTagIds: [...selectedTagIds],
      },
    }),
  );
});

/* ==========================================================
   CLOUD TAGS → LOCAL STORAGE
========================================================== */

document.addEventListener("moonbox:cloudTagsReady", (event) => {
  const cloudTags = event.detail?.tags;

  if (!Array.isArray(cloudTags)) {
    return;
  }

  /*
     IMPORTANT:

     We must MERGE cloud tags with local folder tags.

     Cloud tags:
       User-created tags

     Local folder tags:
       Automatically created from folders

     ALL:
       Always local/system
  */

  const allTag = tags.find((tag) => tag.id === "all") || {
    id: "all",
    name: "ALL",
    icon: "layers-3",
    system: true,
  };

  /* --------------------------------------------------------
     Keep all existing folder-generated tags
  -------------------------------------------------------- */

  const localFolderTags = tags.filter(
    (tag) => tag && tag.folderTag === true && tag.id !== "all",
  );

  /* --------------------------------------------------------
     Convert Firestore tags into normal MoonBox tags
  -------------------------------------------------------- */

  const normalizedCloudTags = cloudTags
    .filter((tag) => tag && tag.id && tag.id !== "all")
    .map((tag) => ({
      id: String(tag.id),

      name: tag.name || "",

      icon: tag.icon || "moon",

      system: false,

      /*
       Keep Firebase song membership in memory.
       Do NOT put this into localStorage.
    */
      songIds: Array.isArray(tag.songIds) ? tag.songIds.map(String) : [],

      ...(tag.folderTag ? { folderTag: true } : {}),
    }));

  /* --------------------------------------------------------
   Store cloud tag → song IDs in memory

   This does NOT perform another Firebase read.
   The songIds already came with cloudTagsReady.
-------------------------------------------------------- */

  cloudTagSongIds.clear();

  normalizedCloudTags.forEach((tag) => {
    cloudTagSongIds.set(
      String(tag.id),
      new Set(Array.isArray(tag.songIds) ? tag.songIds.map(String) : []),
    );
  });

  /* --------------------------------------------------------
     Merge everything by ID

     Cloud tag wins if the same ID exists.
     Folder tags are preserved if they only exist locally.
  -------------------------------------------------------- */

  const mergedTags = new Map();

  /* ALL first */
  mergedTags.set(allTag.id, allTag);

  /* Local folder tags */
  localFolderTags.forEach((tag) => {
    mergedTags.set(String(tag.id), tag);
  });

  /* Cloud tags */
  normalizedCloudTags.forEach((tag) => {
    mergedTags.set(String(tag.id), tag);
  });

  /* --------------------------------------------------------
     Update local tag state
  -------------------------------------------------------- */

  tags = [...mergedTags.values()];

  /* Save merged result to localStorage */
  saveTags();

  /* Refresh Tag page */
  renderTags();

  updateSelectionFooter();

  /* Tell Player / Library that tag definitions changed */
  document.dispatchEvent(
    new CustomEvent("moonbox:tagsChanged", {
      detail: {
        selectedTagIds: [...selectedTagIds],
      },
    }),
  );

  console.log("MoonBox: cloud + folder tags merged", tags);
});

/* ==========================================================
   INITIALIZE
========================================================== */

normalizeTagGroups();

setupManageMenu();

renderTags();

refreshIcons();
