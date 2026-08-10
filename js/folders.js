/* ==========================================================
   FOLDER MANAGER (UI ONLY)
========================================================== */

const overlay = document.getElementById("folderOverlay");
const openBtn = document.getElementById("openFolders");
const closeBtn = document.getElementById("closeFolders");

const folderTree = document.getElementById("folderTree");
const folderTitle = document.getElementById("folderTitle");
const songList = document.getElementById("folderSongList");

const folderBack = document.getElementById("folderBack");
const folderBody = document.querySelector(".folder-body");

/* ==========================================================
   DUMMY DATA
========================================================== */

const folders = [
  {
    name: "All Files",

    songs: [
      {
        id: "golden-hour",
        name: "Golden Hour.flac",
        tags: ["all"],
      },

      {
        id: "sailing",
        name: "Sailing.flac",
        tags: ["all"],
      },

      {
        id: "vienna",
        name: "Vienna.mp3",
        tags: ["all"],
      },

      {
        id: "africa",
        name: "Africa.flac",
        tags: ["all"],
      },
    ],
  },

  {
    name: "Drive Mix",

    songs: [
      {
        id: "golden-hour",
        name: "Golden Hour.flac",
        tags: ["all", "drive"],
      },

      {
        id: "sailing",
        name: "Sailing.flac",
        tags: ["all", "drive"],
      },
    ],
  },

  {
    name: "Rainy Day",

    songs: [
      {
        id: "night-we-met",
        name: "The Night We Met.flac",
        tags: ["all", "rain"],
      },

      {
        id: "until-found-you",
        name: "Until I Found You.flac",
        tags: ["all", "rain"],
      },
    ],
  },
];

let currentFolder = 0;




/* ==========================================================
   creating song folder
========================================================== */


function createSong(name, extraTags = []) {

  return {
    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,

    name,

    tags: [
      "all",
      ...extraTags.filter(
        tag => tag !== "all"
      )
    ]
  };
}

/* ==========================================================
   POPUP
========================================================== */

openBtn.addEventListener("click", () => {
  overlay.classList.add("show");

  renderFolders();

  if (window.innerWidth <= 720) {
    folderBody.classList.remove("mobile-content");

    folderBody.classList.add("mobile-folders");
  }
});

closeBtn.addEventListener("click", () => {
  overlay.classList.remove("show");
});

overlay.onclick = (e) => {
  if (e.target === overlay) {
    overlay.classList.remove("show");
  }
};

/* ==========================================================
   FOLDERS
========================================================== */

function renderFolders() {
  folderTree.innerHTML = "";

  folders.forEach((folder, index) => {
    const item = document.createElement("div");

    item.className = "folder-item";

    if (index === currentFolder) {
      item.classList.add("active");
    }

    item.innerHTML = `
            <div class="folder-left">

                <i data-lucide="folder"></i>

                <span class="folder-name">${folder.name}</span>

            </div>

            <span class="folder-count">
                ${folder.songs.length}
            </span>
        `;

    item.onclick = () => {
      currentFolder = index;

      renderFolders();

      // Mobile only:
      // switch from folder list to folder content
      if (window.innerWidth <= 720) {
        folderBody.classList.remove("mobile-folders");
        folderBody.classList.add("mobile-content");
      }
    };

    folderBack.addEventListener("click", () => {
      if (window.innerWidth <= 720) {
        folderBody.classList.remove("mobile-content");

        folderBody.classList.add("mobile-folders");
      }
    });

    folderTree.appendChild(item);
  });

  renderSongs();

  lucide.createIcons();
}

/* ==========================================================
   SONGS
========================================================== */

function renderSongs() {
  const folder = folders[currentFolder];

  folderTitle.textContent = folder.name;

  document.getElementById("folderSongCount").textContent =
    `${folder.songs.length} Songs`;
  songList.innerHTML = "";

  folder.songs.forEach((song) => {
    const row = document.createElement("div");

    row.className = "folder-song";

    row.innerHTML = `

            <div class="song-icon">
                <i data-lucide="music-2"></i>
            </div>

            <div class="song-details">

                <div class="song-title">
                    ${song.name}
                </div>

                <div class="song-subtitle">
                    Unknown Artist
                </div>

            </div>

            <div class="song-duration">
                --:--
            </div>

            <button class="song-delete">

                <i data-lucide="trash-2"></i>

            </button>

        `;

    songList.appendChild(row);
  });

  lucide.createIcons();
}

renderFolders();
