/* ==========================================================
   MOONBOX CLOUD
   Firebase / Firestore data layer

   Automatic cloud synchronization.

   IMPORTANT:
   - Audio files remain local.
   - Firestore stores music metadata.
   - Songs are stored per Firebase user.
   - No changes are required in library.js or player.js.
========================================================== */

/* ==========================================================
   FIREBASE
========================================================== */

import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ==========================================================
   CLOUD STATE
========================================================== */

let cloudUser = null;

let cloudReady = false;

/*
   Prevent duplicate sync operations.

   Key:
       local song ID

   Value:
       last known local state signature
*/

const syncCache = new Map();

/*
   Prevent multiple simultaneous saves
   for the same song.
*/

const syncInProgress = new Map();

/* ==========================================================
   FIREBASE AUTH STATE
========================================================== */

onAuthStateChanged(auth, async (user) => {
  cloudUser = user || null;

  cloudReady = !!user;

  if (user) {
    console.log("MoonBox Cloud: signed in", user.uid);

    /*
       Tell the rest of MoonBox that cloud is ready.
    */

    document.dispatchEvent(
      new CustomEvent("moonbox:cloudReady", {
        detail: {
          user,
        },
      }),
    );

    /*
       Give Library time to initialize,
       then request a cloud synchronization.

       library.js already broadcasts its current
       queue whenever it renders.
    */

    setTimeout(() => {
      document.dispatchEvent(new CustomEvent("moonbox:requestCloudSync"));
    }, 500);
  } else {
    console.log("MoonBox Cloud: signed out");

    syncCache.clear();

    document.dispatchEvent(new CustomEvent("moonbox:cloudSignedOut"));
  }
});

/* ==========================================================
   GET CURRENT CLOUD USER
========================================================== */

function getCloudUser() {
  return cloudUser;
}

/* ==========================================================
   REQUIRE LOGIN
========================================================== */

function requireCloudUser() {
  if (!cloudUser) {
    throw new Error("MoonBox Cloud: user is not signed in.");
  }

  return cloudUser;
}

/* ==========================================================
   USER PATH
========================================================== */

function getUserRef() {
  const user = requireCloudUser();

  return doc(db, "users", user.uid);
}

/* ==========================================================
   SONG COLLECTION
========================================================== */

function getSongsCollection() {
  const user = requireCloudUser();

  return collection(db, "users", user.uid, "songs");
}

/* ==========================================================
   TAG COLLECTION
========================================================== */

function getTagsCollection() {
  const user = requireCloudUser();

  return collection(db, "users", user.uid, "tags");
}

/* ==========================================================
   CLOUD SONG ID
========================================================== */

function getCloudSongId(song) {
  if (!song) {
    throw new Error("MoonBox Cloud: song is required.");
  }

  if (!song.id) {
    throw new Error("MoonBox Cloud: song has no local ID.");
  }

  return String(song.id);
}

/* ==========================================================
   CLOUD TAG ID
========================================================== */

function getCloudTagId(tag) {
  if (!tag) {
    throw new Error("MoonBox Cloud: tag is required.");
  }

  if (typeof tag === "string") {
    return tag;
  }

  if (tag.id) {
    return String(tag.id);
  }

  if (tag.tagId) {
    return String(tag.tagId);
  }

  if (tag.name) {
    return String(tag.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  throw new Error("MoonBox Cloud: unable to determine tag ID.");
}

/* ==========================================================
   SONG → CLOUD DATA
========================================================== */

function createCloudSongData(song) {
  if (!song) {
    throw new Error("MoonBox Cloud: song is required.");
  }

  const cloudSongId = getCloudSongId(song);

  return {
    songId: cloudSongId,

    localSongId: String(song.id || ""),

    title: song.title || "",

    originalTitle: song.originalTitle || song.title || "",

    artist: song.artist || "",

    album: song.album || "",

    year: song.year || "",

    genre: song.genre || "",

    bitrate: song.bitrate || "",

    format: song.format || "",

    folderId: song.folderId || null,

    folderName: song.folderName || "",

    folderTagId: song.folderTagId || null,

    duration: Number(song.duration) || 0,

    tags: Array.isArray(song.tags) ? song.tags.map(String) : [],

    fileName: song.name || "",

    fileSize: Number(song.size) || 0,

    lastModified: Number(song.lastModified) || 0,

    artwork: song.cover || null,

    lyrics: typeof song.lyrics === "string" ? song.lyrics : "",

    notes: typeof song.notes === "string" ? song.notes : "",

    updatedAt: serverTimestamp(),
  };
}

/* ==========================================================
   CREATE LOCAL SONG SIGNATURE
========================================================== */

/*
   Used only to prevent unnecessary Firestore writes.

   We are NOT using SHA yet.
*/

function createSongSignature(song) {
  if (!song) {
    return "";
  }

  return JSON.stringify({
    id: song.id || "",

    title: song.title || "",

    originalTitle: song.originalTitle || "",

    artist: song.artist || "",

    album: song.album || "",

    year: song.year || "",

    genre: song.genre || "",

    bitrate: song.bitrate || "",

    format: song.format || "",

    folderId: song.folderId || null,

    folderName: song.folderName || "",

    folderTagId: song.folderTagId || null,

    duration: Number(song.duration) || 0,

    tags: Array.isArray(song.tags) ? [...song.tags].map(String).sort() : [],

    fileName: song.name || "",

    fileSize: Number(song.size) || 0,

    lastModified: Number(song.lastModified) || 0,

    cover: song.cover || null,

    lyrics: typeof song.lyrics === "string" ? song.lyrics : "",

    notes: typeof song.notes === "string" ? song.notes : "",
  });
}

/* ==========================================================
   SAVE SONG TO FIRESTORE
========================================================== */

async function saveCloudSong(song) {
  const user = requireCloudUser();

  const cloudSongId = getCloudSongId(song);

  const signature = createSongSignature(song);

  /*
     Don't write the same unchanged song repeatedly.
  */

  if (syncCache.get(cloudSongId) === signature) {
    return;
  }

  /*
     If another save for this song is already running,
     wait for it.
  */

  if (syncInProgress.has(cloudSongId)) {
    return syncInProgress.get(cloudSongId);
  }

  const operation = (async () => {
    try {
      const songRef = doc(db, "users", user.uid, "songs", cloudSongId);

      const data = createCloudSongData(song);

      await setDoc(songRef, data, {
        merge: true,
      });

      syncCache.set(cloudSongId, signature);

      console.log("MoonBox Cloud: song synced", cloudSongId);

      return {
        id: cloudSongId,
        ...data,
      };
    } catch (error) {
      console.error("MoonBox Cloud: song sync failed", cloudSongId, error);

      throw error;
    } finally {
      syncInProgress.delete(cloudSongId);
    }
  })();

  syncInProgress.set(cloudSongId, operation);

  return operation;
}

/* ==========================================================
   GET ONE SONG
========================================================== */

async function getCloudSong(songId) {
  const user = requireCloudUser();

  const songRef = doc(db, "users", user.uid, "songs", String(songId));

  const snapshot = await getDoc(songRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/* ==========================================================
   GET ALL CLOUD SONGS
========================================================== */

async function getAllCloudSongs() {
  const songsRef = getSongsCollection();

  const songsQuery = query(songsRef, orderBy("title"));

  const snapshot = await getDocs(songsQuery);

  const songs = [];

  snapshot.forEach((document) => {
    songs.push({
      id: document.id,
      ...document.data(),
    });
  });

  return songs;
}

/* ==========================================================
   UPDATE SONG
========================================================== */

async function updateCloudSong(songId, changes) {
  const user = requireCloudUser();

  if (!songId) {
    throw new Error("MoonBox Cloud: song ID is required.");
  }

  const songRef = doc(db, "users", user.uid, "songs", String(songId));

  await updateDoc(songRef, {
    ...changes,
    updatedAt: serverTimestamp(),
  });

  /*
     Clear cache because metadata changed.
  */

  syncCache.delete(String(songId));

  console.log("MoonBox Cloud: song updated", songId);
}

/* ==========================================================
   DELETE SONG
========================================================== */

async function deleteCloudSong(songId) {
  const user = requireCloudUser();

  const songRef = doc(db, "users", user.uid, "songs", String(songId));

  await deleteDoc(songRef);

  syncCache.delete(String(songId));

  console.log("MoonBox Cloud: song deleted", songId);
}

/* ==========================================================
   TAG → CLOUD DATA
========================================================== */

function createCloudTagData(tag) {
  const tagId = getCloudTagId(tag);

  return {
    tagId,

    name: typeof tag === "string" ? tag : tag.name || "",

    icon: typeof tag === "object" ? tag.icon || null : null,

    createdAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  };
}

/* ==========================================================
   SAVE TAG
========================================================== */

async function saveCloudTag(tag) {
  const user = requireCloudUser();

  const tagId = getCloudTagId(tag);

  const tagRef = doc(db, "users", user.uid, "tags", tagId);

  const data = createCloudTagData(tag);

  await setDoc(tagRef, data, {
    merge: true,
  });

  console.log("MoonBox Cloud: tag saved", tagId);

  return {
    id: tagId,
    ...data,
  };
}

/* ==========================================================
   GET ONE TAG
========================================================== */

async function getCloudTag(tagId) {
  const user = requireCloudUser();

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  const snapshot = await getDoc(tagRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/* ==========================================================
   GET ALL TAGS
========================================================== */

async function getAllCloudTags() {
  const tagsRef = getTagsCollection();

  const snapshot = await getDocs(tagsRef);

  const tags = [];

  snapshot.forEach((document) => {
    tags.push({
      id: document.id,
      ...document.data(),
    });
  });

  return tags;
}

/* ==========================================================
   UPDATE TAG
========================================================== */

async function updateCloudTag(tagId, changes) {
  const user = requireCloudUser();

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  await updateDoc(tagRef, {
    ...changes,
    updatedAt: serverTimestamp(),
  });

  console.log("MoonBox Cloud: tag updated", tagId);
}

/* ==========================================================
   DELETE TAG
========================================================== */

async function deleteCloudTag(tagId) {
  const user = requireCloudUser();

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  await deleteDoc(tagRef);

  console.log("MoonBox Cloud: tag deleted", tagId);
}

/* ==========================================================
   USER PROFILE
========================================================== */

async function getCloudUserProfile() {
  const user = requireCloudUser();

  const userRef = getUserRef();

  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/* ==========================================================
   UPDATE USER PROFILE
========================================================== */

async function updateCloudUserProfile(changes) {
  const user = requireCloudUser();

  const userRef = getUserRef();

  await updateDoc(userRef, {
    ...changes,
    updatedAt: serverTimestamp(),
  });

  console.log("MoonBox Cloud: profile updated");
}

/* ==========================================================
   SHA-256
========================================================== */

async function calculateFileHash(file) {
  if (!file) {
    return null;
  }

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("MoonBox Cloud: Web Crypto API is unavailable.");
  }

  const buffer = await file.arrayBuffer();

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/* ==========================================================
   CREATE CLOUD SONG WITH HASH
========================================================== */

async function createCloudSongWithHash(song) {
  const data = createCloudSongData(song);

  if (song.file) {
    data.fileHash = await calculateFileHash(song.file);
  } else {
    data.fileHash = null;
  }

  return data;
}

/* ==========================================================
   SAVE SONG WITH HASH
========================================================== */

async function saveCloudSongWithHash(song) {
  const user = requireCloudUser();

  const cloudSongId = getCloudSongId(song);

  const signature = createSongSignature(song);

  if (syncCache.get(cloudSongId) === signature) {
    return;
  }

  if (syncInProgress.has(cloudSongId)) {
    return syncInProgress.get(cloudSongId);
  }

  const operation = (async () => {
    try {
      const songRef = doc(db, "users", user.uid, "songs", cloudSongId);

      const data = await createCloudSongWithHash(song);

      data.updatedAt = serverTimestamp();

      await setDoc(songRef, data, {
        merge: true,
      });

      syncCache.set(cloudSongId, signature);

      console.log("MoonBox Cloud: song + hash synced", cloudSongId);

      return {
        id: cloudSongId,
        ...data,
      };
    } finally {
      syncInProgress.delete(cloudSongId);
    }
  })();

  syncInProgress.set(cloudSongId, operation);

  return operation;
}

/* ==========================================================
   FIND CLOUD SONG BY HASH
========================================================== */

async function findCloudSongByHash(fileHash) {
  if (!fileHash) {
    return null;
  }

  const songs = await getAllCloudSongs();

  return songs.find((song) => song.fileHash === fileHash) || null;
}

/* ==========================================================
   FIND CLOUD SONGS BY FILENAME
========================================================== */

async function findCloudSongsByFilename(fileName) {
  if (!fileName) {
    return [];
  }

  const songs = await getAllCloudSongs();

  return songs.filter((song) => song.fileName === fileName);
}

/* ==========================================================
   AUTOMATIC SONG SYNC
========================================================== */

/*
   Library.js already emits:

       moonbox:libraryQueueChanged

   whenever its library queue changes.

   We use that event to automatically
   synchronize songs with Firestore.
*/

async function syncLibrarySongs(songs) {
  if (!cloudReady) {
    return;
  }

  if (!Array.isArray(songs)) {
    return;
  }

  if (!songs.length) {
    return;
  }

  console.log("MoonBox Cloud: checking library", songs.length, "songs");

  /*
     Sync in small sequential batches.

     This avoids firing hundreds of Firestore
     writes simultaneously.
  */

  for (const song of songs) {
    try {
      await saveCloudSong(song);
    } catch (error) {
      console.error("MoonBox Cloud: failed to sync song", song?.id, error);
    }
  }

  console.log("MoonBox Cloud: library sync complete");
}

/* ==========================================================
   LIBRARY QUEUE EVENT
========================================================== */

document.addEventListener("moonbox:libraryQueueChanged", (event) => {
  const songs = event.detail?.songs || [];

  syncLibrarySongs(songs);
});

/* ==========================================================
   TITLE CHANGED
========================================================== */

document.addEventListener("moonbox:songTitleChanged", async (event) => {
  if (!cloudReady) {
    return;
  }

  const songId = event.detail?.songId;

  if (!songId) {
    return;
  }

  try {
    await updateCloudSong(songId, {
      title: event.detail?.title || "",

      originalTitle: event.detail?.originalTitle || "",
    });

    console.log("MoonBox Cloud: title synced", songId);
  } catch (error) {
    console.error("MoonBox Cloud: title sync failed", error);
  }
});

/* ==========================================================
   TAGS CHANGED
========================================================== */

document.addEventListener("moonbox:songTagsChanged", async (event) => {
  if (!cloudReady) {
    return;
  }

  const songId = event.detail?.songId;

  if (!songId) {
    return;
  }

  const tags = Array.isArray(event.detail?.tags)
    ? event.detail.tags.map(String)
    : [];

  try {
    await updateCloudSong(songId, {
      tags,
    });

    console.log("MoonBox Cloud: tags synced", songId);
  } catch (error) {
    console.error("MoonBox Cloud: tags sync failed", error);
  }
});

/* ==========================================================
   FULL METADATA CHANGED
========================================================== */

document.addEventListener("moonbox:songMetadataChanged", async (event) => {
  if (!cloudReady) {
    return;
  }

  const songId = event.detail?.songId;

  const song = event.detail?.song;

  if (!songId || !song) {
    return;
  }

  try {
    await saveCloudSong(song);

    console.log("MoonBox Cloud: metadata synced", songId);
  } catch (error) {
    console.error("MoonBox Cloud: metadata sync failed", error);
  }
});

/* ==========================================================
   COVER CHANGED
========================================================== */

document.addEventListener("moonbox:coverChanged", async (event) => {
  if (!cloudReady) {
    return;
  }

  const songId = event.detail?.songId;

  if (!songId) {
    return;
  }

  try {
    await updateCloudSong(songId, {
      artwork: event.detail?.cover || null,
    });

    console.log("MoonBox Cloud: artwork synced", songId);
  } catch (error) {
    console.error("MoonBox Cloud: artwork sync failed", error);
  }
});

/* ==========================================================
   AUTOMATIC CLOUD LOOKUP
========================================================== */

/*
   When Library sends a song, check whether
   Firestore already has metadata for that ID.

   If it exists, update the local object with
   the cloud metadata.

   IMPORTANT:

   This is deliberately conservative.

   Cloud metadata is only applied when a cloud
   document exists.

   We do NOT create a new local song here.
*/

async function applyCloudMetadataToSong(song) {
  if (!cloudReady || !song?.id) {
    return song;
  }

  try {
    
    let cloudSong = await getCloudSong(song.id);

    if (!cloudSong && song.name) {
      const matches = await findCloudSongsByFilename(song.name);

      if (matches.length === 1) {
        cloudSong = matches[0];

        console.log("MoonBox Cloud: matched song by filename", song.name);
      }
    }

    /*
       Apply cloud metadata to the
       existing local song object.

       DO NOT replace:
           file
           name
           size
           lastModified

       Those belong to the local file.
    */

    if (cloudSong.title !== undefined) {
      song.title = cloudSong.title;
    }

    if (cloudSong.originalTitle !== undefined) {
      song.originalTitle = cloudSong.originalTitle;
    }

    if (cloudSong.artist !== undefined) {
      song.artist = cloudSong.artist;
    }

    if (cloudSong.album !== undefined) {
      song.album = cloudSong.album;
    }

    if (cloudSong.year !== undefined) {
      song.year = cloudSong.year;
    }

    if (cloudSong.genre !== undefined) {
      song.genre = cloudSong.genre;
    }

    if (cloudSong.bitrate !== undefined) {
      song.bitrate = cloudSong.bitrate;
    }

    if (cloudSong.format !== undefined) {
      song.format = cloudSong.format;
    }

    if (cloudSong.folderId !== undefined) {
      song.folderId = cloudSong.folderId;
    }

    if (cloudSong.folderName !== undefined) {
      song.folderName = cloudSong.folderName;
    }

    if (cloudSong.folderTagId !== undefined) {
      song.folderTagId = cloudSong.folderTagId;
    }

    if (Array.isArray(cloudSong.tags)) {
      song.tags = [...cloudSong.tags];
    }

    if (cloudSong.duration !== undefined) {
      song.duration = Number(cloudSong.duration) || song.duration || 0;
    }

    if (cloudSong.artwork !== undefined) {
      song.cover = cloudSong.artwork;
    }

    if (cloudSong.lyrics !== undefined) {
      song.lyrics = cloudSong.lyrics;
    }

    if (cloudSong.notes !== undefined) {
      song.notes = cloudSong.notes;
    }

    /*
       Cache the resulting state.
    */

    syncCache.set(String(song.id), createSongSignature(song));

    console.log("MoonBox Cloud: metadata loaded from Firestore", song.id);

    return song;
  } catch (error) {
    console.error(
      "MoonBox Cloud: cloud metadata lookup failed",
      song?.id,
      error,
    );

    return song;
  }
}

/* ==========================================================
   CLOUD SYNC REQUEST
========================================================== */

/*
   Other MoonBox components can dispatch:

       moonbox:requestCloudSync

   The next libraryQueueChanged event will
   perform normal synchronization.

   This event is intentionally lightweight.
*/

document.addEventListener("moonbox:requestCloudSync", () => {
  console.log("MoonBox Cloud: cloud sync requested");
});

/* ==========================================================
   PLAYER SONG SELECTION
========================================================== */

/*
   When a song is selected in Player:

       1. Check Firestore
       2. If found, apply metadata
       3. If not found, save local metadata
*/

document.addEventListener("moonbox:playFromLibrary", async (event) => {
  if (!cloudReady) {
    return;
  }

  const songs = event.detail?.songs || [];

  const index = event.detail?.index ?? 0;

  const song = songs[index];

  if (!song) {
    return;
  }

  await applyCloudMetadataToSong(song);
});

/* ==========================================================
   EXPORT API
========================================================== */

export {
  /* Authentication */

  getCloudUser,
  requireCloudUser,

  /* User */
  getCloudUserProfile,
  updateCloudUserProfile,

  /* Songs */
  saveCloudSong,
  saveCloudSongWithHash,
  getCloudSong,
  getAllCloudSongs,
  updateCloudSong,
  deleteCloudSong,

  /* Tags */
  saveCloudTag,
  getCloudTag,
  getAllCloudTags,
  updateCloudTag,
  deleteCloudTag,

  /* File identity */
  calculateFileHash,
  createCloudSongWithHash,
  findCloudSongByHash,
  findCloudSongsByFilename,
};

/* ==========================================================
   READY
========================================================== */

console.log("MoonBox Cloud: cloud.js ready.");
