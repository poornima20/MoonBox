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

  /* ======================================================
       SAMPLE TAGS
    ====================================================== */

  const activeTags = [
    {
      name: "Night",
      icon: "moon",
    },

    {
      name: "Rain",
      icon: "cloud-rain",
    },

    {
      name: "Lofi",
      icon: "audio-waveform",
    },
  ];

  /* ======================================================
       SAMPLE SONGS
    ====================================================== */

  const songs = [
    {
      title: "Midnight Drive",

      artist: "The Weeknd",

      duration: "3:42",

      tags: ["Night"],
    },

    {
      title: "Golden Hour",

      artist: "JVKE",

      duration: "3:18",

      tags: ["Night"],
    },

    {
      title: "Rainy Days",

      artist: "Joji",

      duration: "2:54",

      tags: ["Rain"],
    },

    {
      title: "Focus Mode",

      artist: "Lofi Hip Hop",

      duration: "2:31",

      tags: ["Lofi"],
    },

    {
      title: "Late Night Piano",

      artist: "Yiruma",

      duration: "4:05",

      tags: ["Night", "Lofi"],
    },

    {
      title: "Stargazing",

      artist: "Kygo",

      duration: "3:56",

      tags: ["Night"],
    },
  ];

  /* ======================================================
       RENDER SELECTED TAGS
    ====================================================== */
  function renderTags() {
    selectedTags.innerHTML = "";

    activeTags.forEach((tag) => {
      const chip = document.createElement("button");

      chip.className = "library-selected-tag";

      chip.innerHTML = `
            <i data-lucide="${tag.icon}"></i>

            <span>${tag.name}</span>

            <i data-lucide="x" class="tag-remove"></i>
        `;

      selectedTags.appendChild(chip);
    });

    /* ---------- ADD TAG BUTTON ---------- */

    const addButton = document.createElement("button");

    addButton.className = "library-add-tag";

    addButton.innerHTML = `
        <i data-lucide="plus"></i>
        <span>Add Tag</span>
    `;

    addButton.addEventListener("click", () => {
      document.querySelector('.nav-button[data-screen="0"]').click();
    });

    selectedTags.appendChild(addButton);

    lucide.createIcons();
  }

  selectedTags.addEventListener("click", (e) => {
    const remove = e.target.closest(".tag-remove");

    if (!remove) return;

    e.stopPropagation();

    remove.closest(".library-selected-tag").remove();
  });
  /* ======================================================
       SONG TEMPLATE
    ====================================================== */

  function songHTML(song, index) {
    return `

    <div class="library-song">

        <button class="song-action ${playingSong === index ? "playing" : ""}">

            <i data-lucide="${
              editMode ? "trash-2" : playingSong === index ? "pause" : "play"
            }"></i>

        </button>

        <div class="song-info">

            <h3>${song.title}</h3>

            <span>${song.artist}</span>

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
                        ${song.duration}
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

    const filtered = songs.filter((song) => {
      return (
        song.title.toLowerCase().includes(searchText) ||
        song.artist.toLowerCase().includes(searchText)
      );
    });

    filtered.forEach((song, index) => {
      songList.insertAdjacentHTML(
        "beforeend",

        songHTML(song, index),
      );
    });
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

      // Later:
      // renderSongs();
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

  renderTags();

  renderSongs();

  lucide.createIcons();
});
