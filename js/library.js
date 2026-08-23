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

  const libraryFooter = document.getElementById("libraryFooter");
  const librarySongCount = document.getElementById("librarySongCount");

  const libraryTotalDuration = document.getElementById("libraryTotalDuration");

  const librarySortButton = document.getElementById("librarySortButton");

  const librarySortLabel = document.getElementById("librarySortLabel");

  const librarySortMenu = document.getElementById("librarySortMenu");

  const librarySortOptions = document.querySelectorAll(".library-sort-option");

  const filterButton = document.getElementById("libraryFilterButton");

  const filterMenu = document.getElementById("libraryFilterMenu");

  const filterLabel = document.getElementById("libraryFilterLabel");

  const filterOptions = document.querySelectorAll(".library-filter-option");

  let filterIcon = document.getElementById("libraryFilterIcon");

  /* ======================================================
       STATE
    ====================================================== */

  let searchText = "";

  let filterMode = "union";
  let sortMode = "alphabetical";

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

  function formatTotalDuration(songs) {
    let totalSeconds = 0;

    songs.forEach((song) => {
      const duration = Number(song.duration);

      if (Number.isFinite(duration) && duration > 0) {
        totalSeconds += duration;
      }
    });

    if (totalSeconds <= 0) {
      return "0m";
    }

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }

  function updateLibraryStats(songs) {
    if (!librarySongCount || !libraryTotalDuration) {
      return;
    }

    const count = songs.length;

    librarySongCount.textContent = `${count} ${count === 1 ? "Song" : "Songs"}`;

    libraryTotalDuration.textContent = formatTotalDuration(songs);
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
    SONG Duration
    ====================================================== */

  function formatSongDuration(seconds) {
    const value = Number(seconds);

    if (!Number.isFinite(value) || value <= 0) {
      return "--:--";
    }

    const totalSeconds = Math.floor(value);

    const minutes = Math.floor(totalSeconds / 60);

    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

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

       <span class="song-duration">
        ${formatSongDuration(song.duration)}
      </span>

      </div>

    </div>

  `;
  }

  /* ======================================================
Sort the Songs
====================================================== */
  function sortSongs(songs) {
    const sorted = [...songs];

    if (sortMode === "alphabetical") {
      sorted.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );
    }

    return sorted;
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

    const sortedSongs = sortSongs(filtered);

    updateLibraryStats(sortedSongs);
    /* ====================================================
   SEND CURRENT LIBRARY QUEUE TO PLAYER
==================================================== */

    document.dispatchEvent(
      new CustomEvent("moonbox:libraryQueueChanged", {
        detail: {
          songs: sortedSongs,
        },
      }),
    );

    /* ====================================================
     RENDER
  ==================================================== */

    sortedSongs.forEach((song, index) => {
      songList.insertAdjacentHTML("beforeend", songHTML(song, index));
    });

    /* ====================================================
   PLAY / PAUSE BUTTONS
==================================================== */

    songList.querySelectorAll(".song-action").forEach((button, index) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();

        /* -----------------------------------------------
       Get the song from the CURRENT rendered list
    ------------------------------------------------ */

        const clickedSong = sortedSongs[index];

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
              songs: sortedSongs,
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

  /* ======================================================
       SEARCH
    ====================================================== */

  searchInput.addEventListener("input", (e) => {
    searchText = e.target.value.toLowerCase();

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
   SORT MENU
====================================================== */

  if (librarySortButton) {
    librarySortButton.addEventListener("click", (e) => {
      e.stopPropagation();

      librarySortMenu?.classList.toggle("show");
    });
  }

  librarySortOptions.forEach((option) => {
    option.addEventListener("click", () => {
      if (option.disabled) {
        return;
      }

      sortMode = option.dataset.sort;

      librarySortLabel.textContent = option.querySelector("span").textContent;

      librarySortOptions.forEach((item) => {
        item.classList.remove("active");
      });

      option.classList.add("active");

      librarySortMenu.classList.remove("show");

      renderSongs();
    });
  });

  document.addEventListener("click", (e) => {
    if (
      !librarySortMenu.contains(e.target) &&
      !librarySortButton.contains(e.target)
    ) {
      librarySortMenu.classList.remove("show");
    }
  });

  songList.querySelectorAll(".song-action").forEach((button, index) => {
    button.addEventListener("click", (e) => {
      e.stopPropagation();

      const clickedSong = sortedSongs[index];

      if (!clickedSong) {
        return;
      }

      /* Pause current song */
      if (playerIsPlaying && playingSongId === clickedSong.id) {
        document.dispatchEvent(new CustomEvent("moonbox:pausePlayer"));

        return;
      }

      /* Send queue to Player */
      document.dispatchEvent(
        new CustomEvent("moonbox:playFromLibrary", {
          detail: {
            songs: sortedSongs,
            index: index,
          },
        }),
      );

      /* Open Player */
      const playerButton = document.querySelector(
        '.nav-button[data-screen="2"]',
      );

      if (playerButton) {
        playerButton.click();
      }
    });
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
