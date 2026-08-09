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
    songs: ["Golden Hour.flac", "Sailing.flac", "Vienna.mp3", "Africa.flac"],
  },
  {
    name: "Drive Mix",
    songs: ["Golden Hour.flac", "Sailing.flac"],
  },
  {
    name: "Rainy Day",
    songs: ["The Night We Met.flac", "Until I Found You.flac"],
  },
  {
    name: "Classical",
    songs: ["Moonlight Sonata.flac"],
  },
];

let currentFolder = 0;

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
                    ${song}
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
