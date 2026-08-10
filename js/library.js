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
       SAMPLE SONGS
    ====================================================== */

  const songs = [
    {
      title: "Midnight Drive",
      artist: "The Weeknd",
      duration: "3:42",
      tags: ["all", "night"],
    },

    {
      title: "Golden Hour",
      artist: "JVKE",
      duration: "3:18",
      tags: ["all", "night"],
    },

    {
      title: "Rainy Days",
      artist: "Joji",
      duration: "2:54",
      tags: ["all", "rain"],
    },

    {
      title: "Focus Mode",
      artist: "Lofi Hip Hop",
      duration: "2:31",
      tags: ["all", "lofi"],
    },

    {
      title: "Late Night Piano",
      artist: "Yiruma",
      duration: "4:05",
      tags: ["all", "night", "lofi"],
    },

    {
      title: "Stargazing",
      artist: "Kygo",
      duration: "3:56",
      tags: ["all", "night"],
    },
  ];

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

  document.addEventListener("moonbox:tagsChanged", (event) => {
    selectedTagIds = event.detail.selectedTagIds || [];

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
