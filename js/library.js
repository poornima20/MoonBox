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

  const libraryFooter = document.getElementById("libraryFooter");

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

  let playingSongId = null;
  let playerIsPlaying = false;

  /* ======================================================
   GET ALL MASTER SONGS
   All Files is the master library
====================================================== */

  function getAllSongs() {
    if (!Array.isArray(folders)) {
      return [];
    }

    const allFilesFolder = folders.find((folder) => folder.tagId === "all");

    if (!allFilesFolder) {
      return [];
    }

    return allFilesFolder.songs || [];
  }

  /* ======================================================
   UPDATE LIBRARY FOOTER
====================================================== */

  function updateLibraryFooter(songCount) {
    if (!libraryFooter) return;

    const songText = songCount === 1 ? "Song" : "Songs";

    libraryFooter.innerHTML = `
    <span>${songCount} ${songText}</span>
  `;
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
    const isPlaying = playerIsPlaying && playingSongId === song.id;

    return `

    <div class="library-song">

      <button
        class="song-action ${isPlaying ? "playing" : ""}"
        data-song-id="${song.id}"
      >

        <i data-lucide="${isPlaying ? "pause" : "play"}"></i>

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

      /* ====================================================
   TAG FILTER
==================================================== */

      if (selectedTagIds.size === 0) {
        return matchesSearch;
      }

      /* ====================================================
   ALL IS A SPECIAL VIRTUAL TAG
==================================================== */

      const hasAll = selectedTagIds.has("all");

      const actualTags = [...selectedTagIds].filter((tagId) => tagId !== "all");

      /* ====================================================
   ONLY ALL
==================================================== */

      if (actualTags.length === 0) {
        return matchesSearch;
      }

      /* ====================================================
   UNION
   ALL + anything = ALL SONGS
==================================================== */

      if (filterMode === "union") {
        if (hasAll) {
          return matchesSearch;
        }

        return (
          matchesSearch && actualTags.some((tagId) => song.tags.includes(tagId))
        );
      }

      /* ====================================================
   INTERSECTION
   ALL + tags = those tags
==================================================== */

      if (filterMode === "intersection") {
        return (
          matchesSearch &&
          actualTags.every((tagId) => song.tags.includes(tagId))
        );
      }

      return matchesSearch;
    });

    updateLibraryFooter(filtered.length);
    /* ====================================================
   SEND CURRENT LIBRARY QUEUE TO PLAYER
==================================================== */

    document.dispatchEvent(
      new CustomEvent("moonbox:libraryQueueChanged", {
        detail: {
          songs: filtered,
        },
      }),
    );

    /* ====================================================
     RENDER
  ==================================================== */

    filtered.forEach((song, index) => {
      songList.insertAdjacentHTML("beforeend", songHTML(song, index));
    });

    /* ====================================================
   PLAY / PAUSE BUTTONS
==================================================== */

    songList.querySelectorAll(".song-action").forEach((button, index) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();

        if (editMode) return;

        /* -----------------------------------------------
       Get the song from the CURRENT rendered list
    ------------------------------------------------ */

        const clickedSong = filtered[index];

        if (!clickedSong) return;

        /* ==================================================
       PAUSE CURRENT SONG
    ================================================== */

        if (playerIsPlaying && playingSongId === clickedSong.id) {
          document.dispatchEvent(new CustomEvent("moonbox:pausePlayer"));

          return;
        }

        /* ==================================================
       PLAY SONG
    ================================================== */

        document.dispatchEvent(
          new CustomEvent("moonbox:playFromLibrary", {
            detail: {
              songs: filtered,
              index: index,
            },
          }),
        );

        /* ==================================================
       OPEN PLAYER
    ================================================== */

        const playerButton = document.querySelector(
          '.nav-button[data-screen="2"]',
        );

        if (playerButton) {
          playerButton.click();
        }
      });
    });

    lucide.createIcons();
  }

  document.addEventListener("moonbox:playFromLibrary", (event) => {
    const queue = event.detail.songs || [];

    const index = event.detail.index ?? 0;

    if (queue.length === 0) {
      return;
    }

    songs = queue;

    currentSong = index;

    loadSong(currentSong);

    playSong();
  });

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
   PLAYER PLAYBACK STATE
====================================================== */

  document.addEventListener("moonbox:playbackStateChanged", (event) => {
    playingSongId = event.detail.songId || null;

    playerIsPlaying = event.detail.playing === true;

    renderSongs();
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
