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
   PLAYER NAVIGATION PERMISSION

   Player becomes available after a song has been
   played from the Library.
====================================================== */

  let playerAllowed = false;

  const playerNavigationButton = document.querySelector(
    '.nav-button[data-screen="2"]',
  );

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

    <div class="library-song" draggable="true" data-song-id="${song.id}">

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
            ${escapeHtml(song.folderName || "Unknown Artist")}
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
 TAG DEFINITIONS

 Includes cloud tag songIds already loaded by tag.js.
==================================================== */

    const availableTags = getAvailableTags();

    const tagMap = new Map(availableTags.map((tag) => [String(tag.id), tag]));

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
          matchesSearch &&
          actualTags.some((tagId) => songHasTag(song, tagId, tagMap))
        );
      }

      /* ====================================================
   INTERSECTION
   ALL + tags = those tags
==================================================== */

      if (filterMode === "intersection") {
        return (
          matchesSearch &&
          actualTags.every((tagId) => songHasTag(song, tagId, tagMap))
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

    /* ==================================================
   PLAY / PAUSE BUTTONS
================================================== */

    songList.querySelectorAll(".song-action").forEach((button, index) => {
      button.addEventListener("click", (e) => {
        e.stopPropagation();

        const clickedSong = sortedSongs[index];

        if (!clickedSong) {
          return;
        }

        /* ==================================================
       PAUSE CURRENT SONG
    ================================================== */

        if (playerIsPlaying && playingSongId === clickedSong.id) {
          document.dispatchEvent(new CustomEvent("moonbox:pausePlayer"));

          return;
        }

        /* ==================================================
       PLAYER IS NOW ALLOWED
       
       Once a song has been played from Library,
       the Player navigation button remains available.
    ================================================== */

        playerAllowed = true;

        /* ==================================================
       SEND SONG TO PLAYER
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

  /* ==========================================================
   MOONBOX LIBRARY ↔ TAG DRAG/DROP
========================================================== */

  document.addEventListener("dragstart", (event) => {
    const songElement = event.target.closest(".library-song");

    if (!songElement) {
      return;
    }

    const songId = songElement.dataset.songId;

    if (!songId) {
      return;
    }

    const song = getAllSongs().find(
      (item) => String(item.id) === String(songId),
    );

    if (!song) {
      return;
    }

    const dragData = {
      type: "song",
      songId: String(song.id),
      songName: String(song.name || "Song"),
    };

    event.dataTransfer.effectAllowed = "copy";

    event.dataTransfer.setData("application/json", JSON.stringify(dragData));

    songElement.classList.add("moonbox-dragging");

    document.dispatchEvent(
      new CustomEvent("moonbox:dragStart", {
        detail: dragData,
      }),
    );
  });

  document.addEventListener("dragend", (event) => {
    const songElement = event.target.closest(".library-song");

    if (songElement) {
      songElement.classList.remove("moonbox-dragging");
    }

    document.dispatchEvent(new CustomEvent("moonbox:dragEnd"));
  });

  /* ==========================================================
   DROP TAG ON SONG
========================================================== */

  document.addEventListener("dragover", (event) => {
    const songElement = event.target.closest(".library-song");

    if (!songElement) {
      return;
    }

    const rawData = event.dataTransfer.types.includes("application/json");

    if (!rawData) {
      return;
    }

    event.preventDefault();

    songElement.classList.add("moonbox-drop-target");

    event.dataTransfer.dropEffect = "copy";
  });

  document.addEventListener("dragleave", (event) => {
    const songElement = event.target.closest(".library-song");

    if (!songElement) {
      return;
    }

    if (event.relatedTarget && songElement.contains(event.relatedTarget)) {
      return;
    }

    songElement.classList.remove("moonbox-drop-target");
  });

  document.addEventListener("drop", (event) => {
    const songElement = event.target.closest(".library-song");

    if (!songElement) {
      return;
    }

    event.preventDefault();

    songElement.classList.remove("moonbox-drop-target");

    const raw = event.dataTransfer.getData("application/json");

    if (!raw) {
      return;
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (data.type !== "tag") {
      return;
    }

    const songId = songElement.dataset.songId;

    if (!songId || !data.tagId) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent("moonbox:assignTagToSong", {
        detail: {
          songId: String(songId),
          tagId: String(data.tagId),
          tagName: String(data.tagName || ""),
        },
      }),
    );
  });

  /* ==========================================================
   ASSIGN TAG TO SONG
========================================================== */

  document.addEventListener("moonbox:assignTagToSong", (event) => {
    const songId = event.detail?.songId;
    const tagId = event.detail?.tagId;
    const tagName = event.detail?.tagName || "";

    if (!songId || !tagId) {
      return;
    }

    /* ALL is a virtual system tag */
    if (tagId === "all") {
      return;
    }

    const songs = getAllSongs();

    const song = songs.find((item) => String(item.id) === String(songId));

    if (!song) {
      return;
    }

    if (!Array.isArray(song.tags)) {
      song.tags = [];
    }

    /* Already assigned */
    if (song.tags.includes(tagId)) {
      showMoonBoxDragMessage(
        `Song "${song.name}" already has tag "${tagName}"`,
      );

      return;
    }

    /* Add tag */
    song.tags.push(tagId);

    /* Tell the rest of MoonBox */
    document.dispatchEvent(
      new CustomEvent("moonbox:songTagsChanged", {
        detail: {
          song,
          tagId,
          added: true,
        },
      }),
    );

    /* Refresh Library */
    renderSongs();

    showMoonBoxDragMessage(`Tag "${tagName}" added to "${song.name}"`);
  });

  function showMoonBoxDragMessage(message) {
    const existing = document.getElementById("moonboxDragMessage");

    if (existing) {
      existing.remove();
    }

    const messageElement = document.createElement("div");

    messageElement.id = "moonboxDragMessage";

    messageElement.textContent = message;

    document.body.appendChild(messageElement);

    requestAnimationFrame(() => {
      messageElement.classList.add("show");
    });

    setTimeout(() => {
      messageElement.classList.remove("show");

      setTimeout(() => {
        messageElement.remove();
      }, 200);
    }, 1800);
  }

  /* ======================================================
   BLOCK PLAYER UNTIL A LIBRARY SONG HAS BEEN PLAYED
====================================================== */

  if (playerNavigationButton) {
    playerNavigationButton.addEventListener(
      "click",
      (event) => {
        if (!playerAllowed) {
          event.preventDefault();
          event.stopImmediatePropagation();

          return;
        }
      },
      true,
    );
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
            availableTags = Array.isArray(tags) ? tags : [];
          },
        },
      }),
    );

    return availableTags;
  }

  /* ======================================================
   CHECK SONG MEMBERSHIP IN A TAG

   Local/folder tags:
      song.tags

   Cloud/user tags:
      tag.songIds

   No Firebase read happens here.
====================================================== */

  function songHasTag(song, tagId, tagMap) {
    if (!song) {
      return false;
    }

    const tag = tagMap.get(tagId);

    /* ----------------------------------------------------
     Cloud tag
  ---------------------------------------------------- */

    if (tag && Array.isArray(tag.songIds)) {
      const cloudSongId = String(
        String(song.name || "")
          .normalize("NFKC")
          .trim()
          .toLowerCase()
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      );

      return tag.songIds.map(String).includes(cloudSongId);
    }

    /* ----------------------------------------------------
     Local/folder tag
  ---------------------------------------------------- */

    const songTags = Array.isArray(song.tags) ? song.tags : [];

    return songTags.includes(tagId);
  }
  lucide.createIcons();
});
