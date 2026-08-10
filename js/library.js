/* ==========================================================
   MOON BOX
   library.js
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ======================================================
       ELEMENTS
    ====================================================== */

  const songList = document.getElementById("librarySongList");

  const selectedTags = document.getElementById("librarySelectedTags");

  const searchInput = document.getElementById("librarySearch");

  const editButton = document.getElementById("libraryEditButton");

  const editStatus = document.getElementById("libraryEditStatus");

  const filterButton = document.getElementById("libraryFilterButton");

  const filterMenu = document.getElementById("libraryFilterMenu");

  const filterLabel = document.getElementById("libraryFilterLabel");

  const filterOptions = document.querySelectorAll(".library-filter-option");

  let filterIcon = document.getElementById("libraryFilterIcon");

  /* ======================================================
       STATE
    ====================================================== */

  let editMode = false;

  let searchText = "";

  let filterMode = "union";

  let playingSong = -1;

  let selectedTagIds = new Set();

  /* ======================================================
   GET ALL SONGS FROM FOLDERS
====================================================== */

  function getAllSongs() {
    const allSongs = [];

    if (!Array.isArray(folders)) {
      return allSongs;
    }

    folders.forEach((folder) => {
      if (!Array.isArray(folder.songs)) return;

      folder.songs.forEach((song) => {
        // Avoid duplicate songs by ID
        const alreadyExists = allSongs.some(
          (existingSong) => existingSong.id === song.id,
        );

        if (!alreadyExists) {
          allSongs.push(song);
        }
      });
    });

    return allSongs;
  }

  /* ======================================================
   RENDER SELECTED TAGS
====================================================== */

  function renderTags() {
    selectedTags.innerHTML = "";

    /* ------------------------------------------------------
     Get tag definitions from tag.js
  ------------------------------------------------------ */

    let availableTags = [];

    document.dispatchEvent(
      new CustomEvent("moonbox:requestTags", {
        detail: {
          setTags(value) {
            availableTags = value;
          },
        },
      }),
    );

    /* ------------------------------------------------------
     Create lookup map
  ------------------------------------------------------ */

    const tagMap = new Map(availableTags.map((tag) => [tag.id, tag]));

    /* ------------------------------------------------------
     Render selected tags
  ------------------------------------------------------ */

    selectedTagIds.forEach((tagId) => {
      const tag = tagMap.get(tagId);

      if (!tag) return;

      const chip = document.createElement("button");

      chip.className = "library-selected-tag";

      chip.dataset.tagId = tag.id;

      chip.innerHTML = `
      <i data-lucide="${tag.icon}"></i>

      <span>${tag.name}</span>

      <i
        data-lucide="x"
        class="tag-remove"
      ></i>
    `;

      selectedTags.appendChild(chip);
    });

    /* ------------------------------------------------------
     ADD TAG BUTTON
  ------------------------------------------------------ */

    const addButton = document.createElement("button");

    addButton.className = "library-add-tag";

    addButton.innerHTML = `
    <i data-lucide="plus"></i>
    <span>Add Tag</span>
  `;

    addButton.addEventListener("click", () => {
      document.querySelector('.nav-button[data-screen="0"]')?.click();
    });

    selectedTags.appendChild(addButton);

    lucide.createIcons();
  }
  /* ======================================================
   REMOVE TAG FROM LIBRARY
   Tell tag.js to deselect it
====================================================== */

  selectedTags.addEventListener("click", (e) => {
    const remove = e.target.closest(".tag-remove");

    if (!remove) return;

    e.stopPropagation();

    const chip = remove.closest(".library-selected-tag");

    if (!chip) return;

    const tagId = chip.dataset.tagId;

    if (!tagId) return;

    /* Tell tag.js */
    document.dispatchEvent(
      new CustomEvent("moonbox:removeTag", {
        detail: {
          tagId: tagId,
        },
      }),
    );
  });

  /* ======================================================
SONG TEMPLATE
====================================================== */

  function songHTML(song, index) {
    return `

    <div class="library-song">

      <button
        class="song-action ${playingSong === index ? "playing" : ""}"
      >

        <i data-lucide="${
          editMode ? "trash-2" : playingSong === index ? "pause" : "play"
        }"></i>

      </button>


      <div class="song-info">

        <h3>
          ${song.name}
        </h3>

        <span>
          Unknown Artist
        </span>

      </div>


      <div class="song-right">

        ${
          editMode
            ? `

              <div class="song-drag">

                <i data-lucide="grip"></i>

              </div>

            `
            : `

              <span class="song-duration">
                --:--
              </span>

            `
        }

      </div>

    </div>

  `;
  }
  /* ======================================================
RENDER SONGS
====================================================== */

  function renderSongs() {
    songList.innerHTML = "";

    const allSongs = getAllSongs();

    /* ====================================================
     SEARCH + TAG FILTER
  ==================================================== */

    const filtered = allSongs.filter((song) => {
      /* -----------------------------------------------
       SEARCH
    ----------------------------------------------- */

      const matchesSearch = song.name.toLowerCase().includes(searchText);

      /* ====================================================
   TAG FILTER
==================================================== */

      if (selectedTagIds.size === 0) {
        return matchesSearch;
      }

      /* ----------------------------------------------------
   ALL is a special virtual tag

   It does NOT participate in the actual
   Union / Intersection comparison.
---------------------------------------------------- */

      const actualTags = [...selectedTagIds].filter((tagId) => tagId !== "all");

      /* ----------------------------------------------------
   Only ALL selected
---------------------------------------------------- */

      if (actualTags.length === 0) {
        return matchesSearch;
      }

      /* ----------------------------------------------------
   UNION
   Match ANY selected real tag
---------------------------------------------------- */

      if (filterMode === "union") {
        const matchesTags = actualTags.some((tagId) =>
          song.tags.includes(tagId),
        );

        return matchesSearch && matchesTags;
      }

      /* ----------------------------------------------------
   INTERSECTION
   Match ALL selected real tags
---------------------------------------------------- */

      if (filterMode === "intersection") {
        const matchesTags = actualTags.every((tagId) =>
          song.tags.includes(tagId),
        );

        return matchesSearch && matchesTags;
      }

      return matchesSearch;
    });

    /* ====================================================
     RENDER
  ==================================================== */

    filtered.forEach((song, index) => {
      songList.insertAdjacentHTML("beforeend", songHTML(song, index));
    });

    /* ====================================================
     PLAY BUTTONS
  ==================================================== */

    songList.querySelectorAll(".song-action").forEach((button, index) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();

        if (editMode) return;

        if (playingSong === index) {
          playingSong = -1;
        } else {
          playingSong = index;
        }

        renderSongs();
      });
    });

    lucide.createIcons();
  }

  /* ======================================================
       SEARCH
    ====================================================== */

  searchInput.addEventListener("input", (e) => {
    searchText = e.target.value.toLowerCase();

    renderSongs();
  });

  /* ======================================================
       EDIT MODE
    ====================================================== */

  editButton.addEventListener("click", () => {
    editMode = !editMode;

    editButton.classList.toggle("active", editMode);

    editStatus.classList.toggle("show", editMode);

    renderSongs();
  });

  /* ======================================================
   FILTER MENU
====================================================== */

  filterButton.addEventListener("click", (e) => {
    e.stopPropagation();

    filterMenu.classList.toggle("show");
  });

  filterOptions.forEach((option) => {
    option.addEventListener("click", () => {
      filterMode = option.dataset.mode;

      if (filterMode === "union") {
        filterLabel.textContent = "Union";

        filterButton.querySelector("svg").outerHTML =
          '<i data-lucide="squares-unite"></i>';
      } else {
        filterLabel.textContent = "Intersection";

        filterButton.querySelector("svg").outerHTML =
          '<i data-lucide="squares-intersect"></i>';
      }

      lucide.createIcons();

      filterMenu.classList.remove("show");

      lucide.createIcons();

      filterMenu.classList.remove("show");

      renderSongs();
    });
  });

  document.addEventListener("click", (e) => {
    if (!filterMenu.contains(e.target) && !filterButton.contains(e.target)) {
      filterMenu.classList.remove("show");
    }
  });

  /* ======================================================
       INITIALIZE
    ====================================================== */

  document.addEventListener("moonbox:tagsChanged", (event) => {
    selectedTagIds = new Set(event.detail.selectedTagIds || []);

    renderTags();

    renderSongs();
  });

  function getAvailableTags() {
    let availableTags = [];

    document.dispatchEvent(
      new CustomEvent("moonbox:requestTags", {
        detail: {
          setTags(tags) {
            availableTags = tags;
          },
        },
      }),
    );

    return availableTags;
  }

  lucide.createIcons();
});
