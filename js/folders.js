/* ==========================================================
   FOLDER MANAGER
   Local music importing
========================================================== */

/* ==========================================================
   DOM
========================================================== */

const overlay = document.getElementById("folderOverlay");

const openBtn = document.getElementById("openFolders");
const closeBtn = document.getElementById("closeFolders");

const folderTree = document.getElementById("folderTree");
const folderTitle = document.getElementById("folderTitle");
const songList = document.getElementById("folderSongList");

const folderBack = document.getElementById("folderBack");
const folderBody = document.querySelector(".folder-body");

const addFolderButton = document.getElementById("addFolderButton");
const addFilesButton = document.getElementById("addFilesButton");

const folderPicker = document.getElementById("folderPicker");
const filePicker = document.getElementById("filePicker");

const folderSongCount = document.getElementById("folderSongCount");

/* ==========================================================
   MASTER DATA
   Each song exists ONLY ONCE
========================================================== */

const songs = [];

/*
    Example song:

    {
        id: "...",
        name: "Sailing.flac",
        title: "Sailing",
        artist: "Christopher Cross",
        duration: 258,
        file: File,
        folderName: "Christopher Cross",
        tags: ["all", "Christopher Cross"]
    }
*/

/* ==========================================================
   FOLDER DATA
========================================================== */

/*
    "All Files" is always present.

    Other folders are created dynamically when the user
    imports a folder or individual files.
*/

const folders = [
  {
    name: "All Files",
    tagId: "all",
    songs: songs,
  },
];

let currentFolder = 0;

/* ==========================================================
   SUPPORTED AUDIO TYPES
========================================================== */

const AUDIO_EXTENSIONS = [
  "mp3",
  "flac",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "opus",
  "webm",
];

function isAudioFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();

  return AUDIO_EXTENSIONS.includes(extension);
}

/* ==========================================================
   CREATE UNIQUE ID
========================================================== */

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

/* ==========================================================
   REMOVE FILE EXTENSION
========================================================== */

function getTitleFromFileName(fileName) {
  return fileName.replace(/\.[^/.]+$/, "");
}

/* ==========================================================
   FORMAT DURATION
========================================================== */

function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) {
    return "--:--";
  }

  const totalSeconds = Math.floor(seconds);

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/* ==========================================================
   GET AUDIO DURATION
========================================================== */

/*
    The browser loads the local audio file temporarily
    and reads its duration.

    We do NOT upload the audio anywhere.
*/

function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");

    const objectUrl = URL.createObjectURL(file);

    audio.preload = "metadata";
    audio.src = objectUrl;

    audio.addEventListener("loadedmetadata", () => {
      const duration = audio.duration;

      URL.revokeObjectURL(objectUrl);

      resolve(duration);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(objectUrl);

      resolve(0);
    });
  });
}

/* ==========================================================
   FIND / CREATE FOLDER
========================================================== */

function getOrCreateFolder(folderName) {
  const normalizedName = folderName.trim();

  if (!normalizedName) {
    return folders[0];
  }

  let folder = folders.find(
    (item) => item.name.toLowerCase() === normalizedName.toLowerCase(),
  );

  if (folder) {
    return folder;
  }

  const tagId = createFolderTagId(normalizedName);

  folder = {
    name: normalizedName,
    tagId: tagId,
    songs: [],
  };

  folders.push(folder);

  return folder;
}

/* ==========================================================
   CREATE TAG ID
========================================================== */

function createFolderTagId(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ==========================================================
   CREATE SONG
========================================================== */

function createSong(file, folderName, duration) {
  return {
    id: createId(),

    /* Local file */
    file: file,
    name: file.name,

    /* Basic information */
    title: getTitleFromFileName(file.name),
    duration: duration,

    /*
            For now artist = folder name
            exactly as requested.
        */
    artist: folderName,

    /* Folder relationship */
    folderName: folderName,

    /*
            Every song MUST have "all".
            Every song also gets its folder tag.
        */
    tags: ["all", createFolderTagId(folderName)],
  };
}

/* ==========================================================
   CHECK FOR DUPLICATE FILE
========================================================== */

/*
    Prevent importing the exact same local file twice
    during the current session.

    Later, when we build the database, this will be replaced
    with a more reliable file identity/hash system.
*/

function isDuplicateFile(file) {
  return songs.some((song) => {
    return (
      song.name === file.name &&
      song.file.size === file.size &&
      song.file.lastModified === file.lastModified
    );
  });
}

/* ==========================================================
   IMPORT ONE FILE
========================================================== */

async function importSong(file, folderName) {
  if (!isAudioFile(file)) {
    return null;
  }

  if (isDuplicateFile(file)) {
    return null;
  }

  const duration = await getAudioDuration(file);

  const song = createSong(file, folderName, duration);

  /*
        Add to master song collection.
    */
  songs.push(song);

  /*
        Add to its actual folder.
    */
  const folder = getOrCreateFolder(folderName);

  folder.songs.push(song);

  return song;
}

/* ==========================================================
   ADD FOLDER
========================================================== */

addFolderButton.addEventListener("click", () => {
  folderPicker.value = "";
  folderPicker.click();
});

/* ==========================================================
   FOLDER PICKER
========================================================== */

folderPicker.addEventListener("change", async () => {
  const files = Array.from(folderPicker.files);

  if (!files.length) {
    return;
  }

  /*
        webkitRelativePath looks like:

        Christopher Cross/Sailing.flac

        We take the first folder as the selected folder.
    */

  const firstPath = files[0].webkitRelativePath || "";

  const pathParts = firstPath.split("/").filter(Boolean);

  const folderName = pathParts.length > 1 ? pathParts[0] : "MoonBox";

  /*
        Only audio files.
    */
  const audioFiles = files.filter(isAudioFile);

  if (!audioFiles.length) {
    alert("No supported music files were found in this folder.");
    return;
  }

  /*
        Import one by one.
    */
  for (const file of audioFiles) {
    await importSong(file, folderName);
  }

  /*
        Select the imported folder.
    */
  const folderIndex = folders.findIndex(
    (folder) => folder.name.toLowerCase() === folderName.toLowerCase(),
  );

  if (folderIndex !== -1) {
    currentFolder = folderIndex;
  }

  renderFolders();

  notifyFolderDataChanged();
});

/* ==========================================================
   ADD FILES
========================================================== */

addFilesButton.addEventListener("click", () => {
  filePicker.value = "";
  filePicker.click();
});

/* ==========================================================
   FILE PICKER
========================================================== */

filePicker.addEventListener("change", async () => {
  const files = Array.from(filePicker.files);

  if (!files.length) {
    return;
  }

  /*
        Individual files always go into MoonBox.
    */

  const folderName = "MoonBox";

  for (const file of files) {
    await importSong(file, folderName);
  }

  /*
        Select MoonBox.
    */

  const folderIndex = folders.findIndex(
    (folder) => folder.name.toLowerCase() === "moonbox",
  );

  if (folderIndex !== -1) {
    currentFolder = folderIndex;
  }

  renderFolders();

  notifyFolderDataChanged();
});

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

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) {
    overlay.classList.remove("show");
  }
});

/* ==========================================================
   MOBILE BACK
========================================================== */

folderBack.addEventListener("click", () => {
  if (window.innerWidth <= 720) {
    folderBody.classList.remove("mobile-content");
    folderBody.classList.add("mobile-folders");
  }
});

/* ==========================================================
   RENDER FOLDERS
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

                <span class="folder-name">
                    ${escapeHtml(folder.name)}
                </span>

            </div>

            <span class="folder-count">
                ${folder.songs.length}
            </span>
        `;

    item.addEventListener("click", () => {
      currentFolder = index;

      renderFolders();

      if (window.innerWidth <= 720) {
        folderBody.classList.remove("mobile-folders");
        folderBody.classList.add("mobile-content");
      }
    });

    folderTree.appendChild(item);
  });

  renderSongs();

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ==========================================================
   RENDER SONGS
========================================================== */

function renderSongs() {
  const folder = folders[currentFolder];

  if (!folder) {
    return;
  }

  folderTitle.textContent = folder.name;

  folderSongCount.textContent = `${folder.songs.length} Songs`;

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
                    ${escapeHtml(song.title)}
                </div>

                <div class="song-subtitle">
                    ${escapeHtml(song.artist)}
                </div>

            </div>

            <div class="song-duration">
                ${formatDuration(song.duration)}
            </div>

            <button
                class="song-delete"
                type="button"
                data-song-id="${song.id}"
            >
                <i data-lucide="trash-2"></i>
            </button>
        `;

    songList.appendChild(row);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ==========================================================
   DELETE SONG
========================================================== */

songList.addEventListener("click", (e) => {
  const deleteButton = e.target.closest(".song-delete");

  if (!deleteButton) {
    return;
  }

  const songId = deleteButton.dataset.songId;

  deleteSong(songId);
});

function deleteSong(songId) {
  const songIndex = songs.findIndex((song) => song.id === songId);

  if (songIndex === -1) {
    return;
  }

  /*
        Remove from master songs.
    */
  songs.splice(songIndex, 1);

  /*
        Remove from every folder.
    */
  folders.forEach((folder) => {
    folder.songs = folder.songs.filter((song) => song.id !== songId);
  });

  renderFolders();

  notifyFolderDataChanged();
}

/* ==========================================================
   HTML SAFETY
========================================================== */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==========================================================
   FOLDER → TAG → LIBRARY CONNECTION
========================================================== */

function notifyFolderDataChanged() {
  document.dispatchEvent(
    new CustomEvent("moonbox:foldersReady", {
      detail: {
        folders: folders,
        songs: songs,
      },
    }),
  );
}

function getFileFormat(file) {
  const extension = file.name.split(".").pop().toUpperCase();

  return extension || "Unknown";
}

function getEstimatedBitrate(file, duration) {
  if (!duration || duration <= 0) {
    return "Unknown";
  }

  const bits = file.size * 8;

  const kbps = bits / duration / 1000;

  return `${Math.round(kbps)} kbps`;
}

/* ==========================================================
   INITIAL RENDER
========================================================== */

renderFolders();
notifyFolderDataChanged();
