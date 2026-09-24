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
  arrayUnion,
  arrayRemove,
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

    await syncCloudTagsToLocal();

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
   TAG GROUP STATE DOCUMENT
========================================================== */

function getTagGroupsRef() {
  const user = requireCloudUser();

  return doc(db, "users", user.uid, "tags", "_groups");
}

/* ==========================================================
   SAVE TAG GROUP STATE
========================================================== */

async function saveCloudTagGroups(groups, tags = []) {
  const user = requireCloudUser();

  const groupsRef = getTagGroupsRef();

  const tagStates = {};

  tags.forEach((tag) => {
    if (!tag?.id) return;

    tagStates[String(tag.id)] = {
      groupId: tag.groupId || "default",
      groupName: tag.groupName || "Default",
      groupOrder: Number(tag.groupOrder ?? 0),
      order: Number(tag.order ?? 0),
    };
  });

  await setDoc(
    groupsRef,
    {
      groups: groups.map((group) => ({
        id: String(group.id),
        name: group.name || "Default",
        order: Number(group.order ?? 0),
        system: !!group.system,
      })),

      tagStates,

      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  console.log("MoonBox Cloud: tag group state saved");

  return true;
}

/* ==========================================================
   LOAD TAG GROUP STATE
========================================================== */

async function getCloudTagGroups() {
  const groupsRef = getTagGroupsRef();

  const snapshot = await getDoc(groupsRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    ...snapshot.data(),
  };
}

/* ==========================================================
   CLOUD SONG ID
========================================================== */

function normalizeSongFilename(fileName) {
  if (!fileName) {
    throw new Error("MoonBox Cloud: song filename is required.");
  }

  return String(fileName)
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCloudSongId(song) {
  if (!song) {
    throw new Error("MoonBox Cloud: song is required.");
  }

  if (!song.name) {
    throw new Error("MoonBox Cloud: song has no filename.");
  }

  return normalizeSongFilename(song.name);
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
    songId: getCloudSongId(song),

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

async function getCloudSong(song) {
  const user = requireCloudUser();

  const cloudSongId = getCloudSongId(song);

  const songRef = doc(db, "users", user.uid, "songs", cloudSongId);

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

async function addSongToCloudTag(tagId, song) {
  const user = requireCloudUser();

  const cloudSongId = getCloudSongId(song);

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  await setDoc(
    tagRef,
    {
      songIds: arrayUnion(cloudSongId),
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  console.log("MoonBox Cloud: song added to tag", cloudSongId, tagId);
}

async function removeSongFromCloudTag(tagId, song) {
  const user = requireCloudUser();

  const cloudSongId = getCloudSongId(song);

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  await setDoc(
    tagRef,
    {
      songIds: arrayRemove(cloudSongId),
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  console.log("MoonBox Cloud: song removed from tag", cloudSongId, tagId);
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
    /* _groups is metadata, not a tag */
    if (document.id === "_groups") {
      return;
    }

    tags.push({
      id: document.id,
      ...document.data(),
    });
  });

  return tags;
}

/* ==========================================================
   SYNC CLOUD TAGS → LOCAL TAGS
========================================================== */

async function syncCloudTagsToLocal() {
  if (!cloudReady || !cloudUser) {
    return;
  }

  try {
    /*
       Load both:

       1. Cloud tag definitions
       2. Cloud group state
    */

    const [cloudTags, cloudGroupState] = await Promise.all([
      getAllCloudTags(),
      getCloudTagGroups(),
    ]);

    console.log(
      "MoonBox Cloud: loaded",
      cloudTags.length,
      "tags from Firestore",
    );

    console.log("MoonBox Cloud: group state loaded", cloudGroupState);

    /*
       Send tag definitions
    */

    document.dispatchEvent(
      new CustomEvent("moonbox:cloudTagsReady", {
        detail: {
          tags: cloudTags,
        },
      }),
    );

    /*
       Send group state
    */

    document.dispatchEvent(
      new CustomEvent("moonbox:cloudTagGroupsReady", {
        detail: {
          groups: cloudGroupState?.groups || [],
          tagStates: cloudGroupState?.tagStates || {},
        },
      }),
    );
  } catch (error) {
    console.error("MoonBox Cloud: failed to load tags and groups", error);
  }
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
   APPLY CLOUD SONG DATA TO LOCAL SONG
========================================================== */

function applyCloudSongDataToLocalSong(song, cloudSong) {
  if (!song || !cloudSong) {
    return song;
  }

  /*
     IMPORTANT:
     Never replace local file information.

     Keep:
       file
       name
       size
       lastModified
       id
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

  /*
     THIS IS THE IMPORTANT PART.

     Firestore:
         artwork

     Local song:
         cover
  */

  if (cloudSong.artwork !== undefined) {
    song.cover = cloudSong.artwork;
  }

  if (cloudSong.lyrics !== undefined) {
    song.lyrics = cloudSong.lyrics;
  }

  if (cloudSong.notes !== undefined) {
    song.notes = cloudSong.notes;
  }

  return song;
}

/* ==========================================================
   TAGS CHANGED
========================================================== */

document.addEventListener("moonbox:songTagsChanged", async (event) => {
  const song = event.detail?.song;
  const tagId = event.detail?.tagId;
  const added = event.detail?.added;

  if (!cloudReady || !song || !tagId || tagId === "all") {
    return;
  }

  try {
    if (added) {
      await addSongToCloudTag(tagId, song);
    } else {
      await removeSongFromCloudTag(tagId, song);
    }

    console.log(
      "MoonBox Cloud: tag membership synced",
      String(tagId),
      getCloudSongId(song),
      added ? "ADD" : "REMOVE",git 
    );
  } catch (error) {
    console.error(
      "MoonBox Cloud: tag membership sync failed",
      String(tagId),
      getCloudSongId(song),
      error,
    );
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

/* ==========================================================
   AUTOMATIC CLOUD LOOKUP
========================================================== */
async function applyCloudMetadataToSong(song) {
  if (!cloudReady || !song?.name) {
    return song;
  }

  try {
    const cloudSong = await getCloudSong(song);

    if (!cloudSong) {
      return song;
    }

    applyCloudSongDataToLocalSong(song, cloudSong);

    console.log(
      "MoonBox Cloud: metadata loaded from Firestore",
      song.name,
      "→",
      cloudSong.id,
    );

    return song;
  } catch (error) {
    console.error(
      "MoonBox Cloud: cloud metadata lookup failed",
      song?.name,
      error,
    );

    return song;
  }
}

/* ==========================================================
   PLAYER SONG SELECTION
========================================================== */

document.addEventListener("moonbox:playFromLibrary", async (event) => {
  if (!cloudUser) {
    return;
  }

  const queue = event.detail?.songs;

  const index = event.detail?.index ?? 0;

  if (!Array.isArray(queue)) {
    return;
  }

  const song = queue[index];

  if (!song) {
    return;
  }

  /*
     Load existing Firebase metadata.

     IMPORTANT:
     This modifies the SAME song object that was sent
     from Library to Player.
  */

  await applyCloudMetadataToSong(song);

  /*
     Tell Player that Firebase metadata has arrived.

     Player can now refresh the UI.
  */

  document.dispatchEvent(
    new CustomEvent("moonbox:cloudSongMetadataReady", {
      detail: {
        songId: song.id || null,
        song: song,
      },
    }),
  );
});

/* ==========================================================
   Tag Creation / Update / Deletion
========================================================== */
document.addEventListener("moonbox:tagCreated", async (event) => {
  if (!cloudUser || !cloudReady) return;

  const tag = event.detail?.tag;
  if (!tag?.id) return;

  try {
    await saveCloudTag(tag);
    console.log("MoonBox Cloud: tag created", tag.id);
  } catch (error) {
    console.error("MoonBox Cloud: failed to save tag", error);
  }
});

document.addEventListener("moonbox:tagUpdated", async (event) => {
  if (!cloudUser || !cloudReady) return;

  const tag = event.detail?.tag;
  if (!tag?.id) return;

  try {
    await updateCloudTag(tag.id, tag);
    console.log("MoonBox Cloud: tag updated", tag.id);
  } catch (error) {
    console.error("MoonBox Cloud: failed to update tag", error);
  }
});

document.addEventListener("moonbox:tagDeleted", async (event) => {
  if (!cloudUser || !cloudReady) return;

  const tagId = event.detail?.tagId;
  if (!tagId) return;

  try {
    await deleteCloudTag(tagId);
    console.log("MoonBox Cloud: tag deleted", tagId);
  } catch (error) {
    console.error("MoonBox Cloud: failed to delete tag", error);
  }
});

/* ==========================================================
   TAG GROUP STATE CHANGED
========================================================== */

document.addEventListener("moonbox:tagGroupsChanged", async (event) => {
  if (!cloudUser || !cloudReady) {
    return;
  }

  const groups = event.detail?.groups;
  const tags = event.detail?.tags;

  if (!Array.isArray(groups)) {
    return;
  }

  try {
    await saveCloudTagGroups(groups, Array.isArray(tags) ? tags : []);

    console.log("MoonBox Cloud: tag group state synced");
  } catch (error) {
    console.error("MoonBox Cloud: failed to save tag group state", error);
  }
});

async function addSongToCloudTag(tagId, song) {
  const user = requireCloudUser();
  const cloudSongId = getCloudSongId(song);

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  await setDoc(
    tagRef,
    {
      songIds: arrayUnion(cloudSongId),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  console.log("MoonBox Cloud: song added to tag", cloudSongId, tagId);
}

async function removeSongFromCloudTag(tagId, song) {
  const user = requireCloudUser();
  const cloudSongId = getCloudSongId(song);

  const tagRef = doc(db, "users", user.uid, "tags", String(tagId));

  await setDoc(
    tagRef,
    {
      songIds: arrayRemove(cloudSongId),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  console.log("MoonBox Cloud: song removed from tag", cloudSongId, tagId);
}

/* ==========================================================
   EXPORT API
========================================================== */

export {
  getCloudUser,
  requireCloudUser,
  getCloudUserProfile,
  updateCloudUserProfile,
  saveCloudSong,
  saveCloudSongWithHash,
  getCloudSong,
  saveCloudTag,
  getCloudTag,
  getAllCloudTags,
  updateCloudTag,
  deleteCloudTag,
  saveCloudTagGroups,
  getCloudTagGroups,
  calculateFileHash,
  createCloudSongWithHash,
  findCloudSongByHash,
};

/* ==========================================================
   READY
========================================================== */

console.log("MoonBox Cloud: cloud.js ready.");
