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
const syncFolderButton = document.getElementById("syncFolderButton");
const removeFolderButton = document.getElementById("removeFolderButton");

/* ==========================================================
   MOONBOX LOCAL DATABASE
========================================================== */

const DB_NAME = "moonbox";
const DB_VERSION = 1;

let db;

function openMoonboxDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains("folders")) {
        database.createObjectStore("folders", {
          keyPath: "id",
        });
      }

      if (!database.objectStoreNames.contains("songs")) {
        const songStore = database.createObjectStore("songs", {
          keyPath: "id",
        });

        songStore.createIndex("folderId", "folderId", {
          unique: false,
        });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/* ==========================================================
   DATABASE HELPERS
========================================================== */

function saveFolder(folder) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readwrite");

    transaction.objectStore("folders").put(folder);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function saveSong(song) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("songs", "readwrite");

    transaction.objectStore("songs").put(song);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function getAllFolders() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readonly");

    const request = transaction.objectStore("folders").getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

function getAllSongs() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("songs", "readonly");

    const request = transaction.objectStore("songs").getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

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
    id: createId(),
    name: normalizedName,
    tagId: tagId,
    songs: [],
    handle: null,
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

function isDuplicateFile(file, folder) {
  return songs.some((song) => {
    return (
      song.folderId === folder.id &&
      song.name === file.name &&
      song.size === file.size &&
      song.lastModified === file.lastModified
    );
  });
}

/* ==========================================================
   IMPORT the Directory
========================================================== */
async function importDirectory(directoryHandle) {
  const folderName = directoryHandle.name;

  let folder = folders.find(
    (item) => item.name.toLowerCase() === folderName.toLowerCase(),
  );

  if (!folder) {
    folder = {
      id: createId(),
      name: folderName,
      tagId: createFolderTagId(folderName),
      songs: [],
      handle: directoryHandle,
    };

    folders.push(folder);
  } else {
    folder.handle = directoryHandle;
  }

  await saveFolder({
    id: folder.id,
    name: folder.name,
    tagId: folder.tagId,
    handle: folder.handle,
  });

  for await (const [name, entry] of directoryHandle.entries()) {
    if (entry.kind !== "file") {
      continue;
    }

    const file = await entry.getFile();

    if (!isAudioFile(file)) {
      continue;
    }

    await importSong(file, folder);
  }

  currentFolder = folders.indexOf(folder);

  renderFolders();
  notifyFolderDataChanged();
}

/* ==========================================================
   IMPORT ONE FILE
========================================================== */

async function importSong(file, folder) {
  if (!isAudioFile(file)) {
    return null;
  }

  if (isDuplicateFile(file, folder)) {
    return null;
  }

  const duration = await getAudioDuration(file);

  const song = {
    id: createId(),

    file: file,

    name: file.name,

    title: getTitleFromFileName(file.name),

    duration: duration,

    artist: folder.name,

    folderId: folder.id,

    folderName: folder.name,

    folderTagId: folder.tagId,

    size: file.size,

    lastModified: file.lastModified,

    tags: ["all", folder.tagId],
  };

  /* Add to memory */

  songs.push(song);

  /* Add to folder */

  folder.songs.push(song);

  /* Save to IndexedDB */

  await saveSong(song);

  /* Rebuild folder views */

  rebuildFolderSongs();

  return song;
}

/* ==========================================================
  Sync folder with delete 
========================================================== */

async function syncFolder(folder) {
  if (!folder || !folder.handle) {
    alert("This folder cannot be synced.");
    return;
  }

  try {
    const permission = await folder.handle.requestPermission({
      mode: "read",
    });

    if (permission !== "granted") {
      alert(`MoonBox needs permission to access "${folder.name}".`);

      return;
    }

    let added = 0;

    for await (const [name, entry] of folder.handle.entries()) {
      if (entry.kind !== "file") {
        continue;
      }

      const file = await entry.getFile();

      if (!isAudioFile(file)) {
        continue;
      }

      const alreadyExists = isDuplicateFile(file, folder);

      if (alreadyExists) {
        continue;
      }

      await importSong(file, folder);

      added++;
    }

    await saveFolder({
      id: folder.id,
      name: folder.name,
      tagId: folder.tagId,
      handle: folder.handle,
    });

    renderFolders();
    notifyFolderDataChanged();

    alert(
      added === 0
        ? `"${folder.name}" is already up to date.`
        : `Added ${added} new song${added === 1 ? "" : "s"} from "${folder.name}".`,
    );
  } catch (error) {
    console.error("Folder sync failed:", error);

    alert(`MoonBox couldn't sync "${folder.name}".`);
  }
}

syncFolderButton.addEventListener("click", async () => {
  const folder = folders[currentFolder];

  if (!folder) {
    return;
  }

  if (folder.id === "all") {
    return;
  }

  if (!folder.handle) {
    alert(`"${folder.name}" does not have a folder to sync.`);

    return;
  }

  await syncFolder(folder);
});

async function removeFolder(folder) {
  if (!folder || folder.id === "all") {
    return;
  }

  const confirmed = confirm(
    `Remove "${folder.name}" from MoonBox?\n\n` +
      `This will remove the folder and its songs from MoonBox, ` +
      `but will NOT delete your music files from your computer.`,
  );

  if (!confirmed) {
    return;
  }

  // Get all songs belonging to this folder
  const folderSongs = songs.filter((song) => song.folderId === folder.id);

  // Remove songs from IndexedDB
  for (const song of folderSongs) {
    await deleteSongFromDB(song.id);
  }

  // Remove folder from IndexedDB
  await deleteFolderFromDB(folder.id);

  // Remove folder from memory
  const folderIndex = folders.findIndex((item) => item.id === folder.id);

  if (folderIndex !== -1) {
    folders.splice(folderIndex, 1);
  }

  // Remove its songs from master songs[]
  for (let i = songs.length - 1; i >= 0; i--) {
    if (songs[i].folderId === folder.id) {
      songs.splice(i, 1);
    }
  }

  // IMPORTANT:
  // Rebuild All Files and every remaining folder
  rebuildFolderSongs();

  // Go back to All Files
  currentFolder = 0;

  renderFolders();

  notifyFolderDataChanged();
}

removeFolderButton.addEventListener("click", async () => {
  const folder = folders[currentFolder];

  if (!folder) {
    return;
  }

  if (folder.id === "all") {
    return;
  }

  await removeFolder(folder);
});

function deleteSongFromDB(songId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("songs", "readwrite");

    transaction.objectStore("songs").delete(songId);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function deleteFolderFromDB(folderId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folders", "readwrite");

    transaction.objectStore("folders").delete(folderId);

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

/* ==========================================================
   FOLDER PICKER
========================================================== */

addFolderButton.addEventListener("click", async () => {
  try {
    const directoryHandle = await window.showDirectoryPicker({
      mode: "read",
    });

    await importDirectory(directoryHandle);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error("Folder selection failed:", error);
  }
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

  const folder = getOrCreateFolder("MoonBox");

  await saveFolder({
    id: folder.id,
    name: folder.name,
    tagId: folder.tagId,
    handle: null,
  });

  for (const file of files) {
    await importSong(file, folder);
  }

  currentFolder = folders.indexOf(folder);

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

  const isRealFolder = folder.id !== "all" && !!folder.handle;

  syncFolderButton.style.display = isRealFolder ? "flex" : "none";

  removeFolderButton.style.display = folder.id !== "all" ? "flex" : "none";

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

async function deleteSong(songId) {
  const songIndex = songs.findIndex((song) => song.id === songId);

  if (songIndex === -1) {
    return;
  }

  // Remove from IndexedDB first
  await deleteSongFromDB(songId);

  // Remove from master songs array
  songs.splice(songIndex, 1);

  // Rebuild every folder's song list from the master songs array
  folders.forEach((folder) => {
    if (folder.id === "all") {
      // All Files always contains every song
      folder.songs = [...songs];
    } else {
      // Real folder only contains its own songs
      folder.songs = songs.filter((song) => song.folderId === folder.id);
    }
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
   RENDER MoonBox
========================================================== */

async function initializeMoonBox() {
  try {
    await openMoonboxDB();

    const savedFolders = await getAllFolders();
    const savedSongs = await getAllSongs();

    folders.length = 0;
    songs.length = 0;

    folders.push({
      id: "all",
      name: "All Files",
      tagId: "all",
      songs: [],
      handle: null,
    });

    for (const savedFolder of savedFolders) {
      folders.push({
        ...savedFolder,
        songs: [],
      });
    }

    for (const song of savedSongs) {
      songs.push(song);

      const folder = folders.find((folder) => folder.id === song.folderId);

      if (folder) {
        folder.songs.push(song);
      }

      // Rebuild folder views from songs[]
      rebuildFolderSongs();
    }

    renderFolders();

    notifyFolderDataChanged();
  } catch (error) {
    console.error("Failed to initialize MoonBox:", error);
  }
}

function rebuildFolderSongs() {
  folders.forEach((folder) => {
    if (folder.id === "all") {
      folder.songs = [...songs];
    } else {
      folder.songs = songs.filter((song) => song.folderId === folder.id);
    }
  });
}

/* ==========================================================
   INITIAL RENDER
========================================================== */

renderFolders();
notifyFolderDataChanged();
initializeMoonBox();
