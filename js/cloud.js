/* ==========================================================
   MOONBOX CLOUD
   Firebase / Firestore data layer

   IMPORTANT:
   This file does NOT automatically upload anything.

   Other MoonBox files will call these functions when we
   are ready to sync local data with the cloud.
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

/*
    Other MoonBox files can listen for:

        moonbox:cloudReady

    or:

        moonbox:cloudSignedOut
*/

onAuthStateChanged(auth, (user) => {
  cloudUser = user || null;

  if (user) {
    console.log("MoonBox Cloud: signed in", user.uid);

    document.dispatchEvent(
      new CustomEvent("moonbox:cloudReady", {
        detail: {
          user: user,
        },
      }),
    );
  } else {
    console.log("MoonBox Cloud: signed out");

    document.dispatchEvent(new CustomEvent("moonbox:cloudSignedOut"));
  }
});

/* ==========================================================
   GET CURRENT CLOUD USER
========================================================== */

/*
    Returns the currently authenticated Firebase user.

    Returns:
        Firebase User
        or null
*/

function getCloudUser() {
  return cloudUser;
}

/* ==========================================================
   REQUIRE LOGIN
========================================================== */

/*
    Used before performing cloud operations.

    Example:

        requireCloudUser();

*/

function requireCloudUser() {
  if (!cloudUser) {
    throw new Error("MoonBox Cloud: user is not signed in.");
  }

  return cloudUser;
}

/* ==========================================================
   USER PATH
========================================================== */

/*
    Every user's data lives inside their own UID.

        users/{uid}

    This prevents one user from seeing another user's
    MoonBox data.
*/

function getUserRef() {
  const user = requireCloudUser();

  return doc(db, "users", user.uid);
}

/* ==========================================================
   SONG COLLECTION
========================================================== */

/*
    Path:

        users/{uid}/songs
*/

function getSongsCollection() {
  const user = requireCloudUser();

  return collection(db, "users", user.uid, "songs");
}

/* ==========================================================
   TAG COLLECTION
========================================================== */

/*
    Path:

        users/{uid}/tags
*/

function getTagsCollection() {
  const user = requireCloudUser();

  return collection(db, "users", user.uid, "tags");
}

/* ==========================================================
   CREATE CLOUD SONG ID
========================================================== */

/*
    IMPORTANT:

    This is NOT the final local-song identity system yet.

    For now we use the existing local song ID.

    Later we will add a permanent MoonBox songId so that:

        same song
        different device
        replaced local file
        changed SHA

    can still resolve to the same cloud song.

    We are deliberately keeping that integration out of
    this first cloud.js stage.
*/

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
   CREATE CLOUD TAG ID
========================================================== */

/*
    Your existing system already stores tags as IDs:

        song.tags = ["all", "anime"]

    We keep that structure.

    The tag itself lives separately in:

        users/{uid}/tags/{tagId}
*/

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

/*
    Converts your local song object into a Firestore-safe
    object.

    We NEVER put the actual File object into Firestore.

    song.file stays local.

    Later:
        Firebase Storage
            ↓
        actual audio / artwork files
*/

function createCloudSongData(song) {
  if (!song) {
    throw new Error("MoonBox Cloud: song is required.");
  }

  const cloudSongId = getCloudSongId(song);

  return {
    /* ----------------------------------------------
       Identity
    ---------------------------------------------- */

    songId: cloudSongId,

    localSongId: String(song.id || ""),

    /* ----------------------------------------------
       Song information
    ---------------------------------------------- */

    title: song.title || "",

    originalTitle: song.originalTitle || song.title || "",

    artist: song.artist || "",

    /* ----------------------------------------------
       Folder
    ---------------------------------------------- */

    folderId: song.folderId || null,

    folderName: song.folderName || "",

    /* ----------------------------------------------
       Duration
    ---------------------------------------------- */

    duration: Number(song.duration) || 0,

    /* ----------------------------------------------
       Tags
    ---------------------------------------------- */

    tags: Array.isArray(song.tags) ? song.tags.map(String) : [],

    /* ----------------------------------------------
       Local file information

       These are metadata only.

       The actual audio file remains local.
    ---------------------------------------------- */

    fileName: song.name || "",

    fileSize: Number(song.size) || 0,

    lastModified: Number(song.lastModified) || 0,

    /* ----------------------------------------------
       Album artwork

       Nothing uploaded yet.

       Later this can contain a Firebase Storage
       reference or URL.
    ---------------------------------------------- */

    artwork: song.cover || null,

    /* ----------------------------------------------
       Cloud metadata
    ---------------------------------------------- */

    updatedAt: serverTimestamp(),
  };
}

/* ==========================================================
   SAVE SONG
========================================================== */

/*
    Creates or replaces:

        users/{uid}/songs/{songId}
*/

async function saveCloudSong(song) {
  const user = requireCloudUser();

  const cloudSongId = getCloudSongId(song);

  const songRef = doc(db, "users", user.uid, "songs", cloudSongId);

  const data = createCloudSongData(song);

  await setDoc(songRef, data, {
    merge: true,
  });

  console.log("MoonBox Cloud: song saved", cloudSongId);

  return {
    id: cloudSongId,

    ...data,
  };
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

/*
    Used when the user changes:

        title
        artist
        folder
        tags
        artwork
        etc.

    It does NOT replace the entire document.
*/

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

  console.log("MoonBox Cloud: song updated", songId);
}

/* ==========================================================
   DELETE SONG
========================================================== */

async function deleteCloudSong(songId) {
  const user = requireCloudUser();

  const songRef = doc(db, "users", user.uid, "songs", String(songId));

  await deleteDoc(songRef);

  console.log("MoonBox Cloud: song deleted", songId);
}

/* ==========================================================
   TAG → CLOUD DATA
========================================================== */

function createCloudTagData(tag) {
  const tagId = getCloudTagId(tag);

  return {
    tagId: tagId,

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
   SAVE USER CLOUD PROFILE
========================================================== */

/*
    This is separate from login.js.

    login.js creates the initial user profile.

    cloud.js can later update cloud-related account data.
*/

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
   CALCULATE FILE SHA-256
========================================================== */

/*
    IMPORTANT:

    This DOES NOT upload the file.

    It only calculates a fingerprint of the local file.

    This will become important later for:

        Device A
             ↓
        local song
             ↓
        SHA-256
             ↓
        cloud song

        Device B
             ↓
        different local file object
             ↓
        SHA-256
             ↓
        identify matching song


    We are storing the SHA separately from the main
    metadata for now.
*/

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
   ADD FILE HASH TO SONG
========================================================== */

/*
    This creates a cloud-ready copy of the song.

    It does NOT modify the original local song object.
*/

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

  const songRef = doc(db, "users", user.uid, "songs", cloudSongId);

  const data = await createCloudSongWithHash(song);

  data.updatedAt = serverTimestamp();

  await setDoc(songRef, data, {
    merge: true,
  });

  console.log("MoonBox Cloud: song + SHA saved", cloudSongId);

  return {
    id: cloudSongId,

    ...data,
  };
}

/* ==========================================================
   FIND CLOUD SONG BY FILE HASH
========================================================== */

/*
    Later this lets another device say:

        "I found this local file."

    and ask:

        "Does MoonBox know this file?"

    Example:

        findCloudSongByHash("abc123...")

*/

async function findCloudSongByHash(fileHash) {
  if (!fileHash) {
    return null;
  }

  const songs = await getAllCloudSongs();

  const match = songs.find((song) => song.fileHash === fileHash);

  return match || null;
}

/* ==========================================================
   FIND CLOUD SONG BY ORIGINAL FILENAME
========================================================== */

/*
    SHA is the strongest match.

    Filename is useful as a secondary fallback.

    This is especially useful when:

        same song
        same filename
        new file
        different SHA

    We can then detect:

        "This may be a replacement file."

*/

async function findCloudSongsByFilename(fileName) {
  if (!fileName) {
    return [];
  }

  const songs = await getAllCloudSongs();

  return songs.filter((song) => song.fileName === fileName);
}

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
   CLOUD TEST
   ----------------------------------------------------------
   This section is ONLY for testing the first song upload.

   IMPORTANT:
   It does NOT automatically upload songs.

   We wait for MoonBox to provide a song through its existing
   events, then expose a manual test function in the browser
   console.
========================================================== */

let testSong = null;

/* ==========================================================
   RECEIVE SONG FROM LIBRARY
========================================================== */

document.addEventListener("moonbox:libraryQueueChanged", (event) => {
  const songs = event.detail?.songs || [];

  if (songs.length === 0) {
    return;
  }

  /*
      Keep the first available song for testing.

      Nothing is uploaded here.
    */

  testSong = songs[0];

  console.log("MoonBox Cloud: test song ready", testSong);
});

/* ==========================================================
   RECEIVE PLAYED SONG
========================================================== */

document.addEventListener("moonbox:playFromLibrary", (event) => {
  const songs = event.detail?.songs || [];

  const index = event.detail?.index ?? 0;

  if (!songs[index]) {
    return;
  }

  /*
      This is the exact song the user selected.
    */

  testSong = songs[index];

  console.log("MoonBox Cloud: selected test song", testSong);
});

/* ==========================================================
   TEST SAVE ONE SONG
========================================================== */

async function testSaveOneSong() {
  if (!testSong) {
    console.warn("MoonBox Cloud: no test song available.");

    console.warn("Open Library and click/play a song first.");

    return;
  }

  if (!cloudUser) {
    console.warn("MoonBox Cloud: user is not signed in.");

    return;
  }

  try {
    console.log("MoonBox Cloud: saving test song...", testSong);

    const savedSong = await saveCloudSongWithHash(testSong);

    console.log("MoonBox Cloud: TEST SUCCESS", savedSong);

    return savedSong;
  } catch (error) {
    console.error("MoonBox Cloud: TEST FAILED", error);

    throw error;
  }
}

/* ==========================================================
   TEST READ ALL SONGS
========================================================== */

async function testReadCloudSongs() {
  try {
    const songs = await getAllCloudSongs();

    console.log("MoonBox Cloud: songs in Firestore", songs);

    return songs;
  } catch (error) {
    console.error("MoonBox Cloud: failed to read songs", error);

    throw error;
  }
}

/* ==========================================================
   EXPOSE TEST FUNCTIONS
========================================================== */

/*
  These are temporary browser-console helpers.

  We will remove this section later.
*/

window.moonboxCloudTestSaveOneSong = testSaveOneSong;

window.moonboxCloudTestReadSongs = testReadCloudSongs;

window.moonboxCloudTestGetCurrentSong = () => testSong;

/* ==========================================================
   CLOUD.JS READY
========================================================== */

console.log("MoonBox Cloud: cloud.js ready.");
moonboxCloudTestSaveOneSong();
