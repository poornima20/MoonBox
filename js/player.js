/* ==========================================================
   MOON BOX
   player.js
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================
   ELEMENTS
========================================================== */

  const tabs = document.querySelectorAll(".player-side-button");
  const panels = document.querySelectorAll(".player-tab");

  const playButton = document.getElementById("playPause");
  const nextButton = document.getElementById("nextSong");
  const previousButton = document.getElementById("previousSong");

  const shuffleButton = document.querySelectorAll(".player-toggle")[0];
  const repeatButton = document.querySelectorAll(".player-toggle")[1];

  const progress = document.getElementById("progressBar");

  const currentTime = document.getElementById("currentTime");
  const totalTime = document.getElementById("totalTime");

  const title = document.getElementById("playerTitle");
  const artist = document.getElementById("playerArtist");
  const cover = document.getElementById("playerCover");

  const titleEditor = document.getElementById("playerTitleEditor");
  const editTitleButton = document.getElementById("editPlayerTitle");
  const titleInput = document.getElementById("playerTitleInput");
  const restoreTitleButton = document.getElementById("restorePlayerTitle");

  const vinyl = document.querySelector(".vinyl");
  const album = document.querySelector(".player-album");

  const lyricsView = document.getElementById("lyricsView");
  const lyricsEditor = document.getElementById("lyricsEditor");

  const vinylCover = document.getElementById("playerVinylCover");

  const notesEditor = document.getElementById("journalText");

  const uploadLyricsButton = document.getElementById("uploadLyrics");

  const lyricsFile = document.getElementById("lyricsFile");

  /* ==========================================================
   AUDIO ENGINE
========================================================== */

  const audio = new Audio();

  audio.preload = "metadata";

  let currentObjectUrl = null;

  /* ==========================================================
   LIBRARY PLAYBACK QUEUE
========================================================== */

  let songs = [];

  songs.forEach((song) => {
    const img = new Image();

    img.src = song.cover;
  });

  /* ==========================================================
   STATE
========================================================== */

  let currentSong = -1;
  let hasActiveSong = false;
  let playing = false;

  // 0 = Off
  // 1 = Repeat Library
  // 2 = Repeat Song
  let repeatMode = 0;

  let shuffle = false;

  let timer = null;

  let elapsed = 0;

  /* ==========================================================
   PLAYER TAG SYSTEM
========================================================== */

  let availablePlayerTags = [];

  const addPlayerTag = document.getElementById("addPlayerTag");

  const playerSelectedTags = document.getElementById("playerSelectedTags");

  const playerTagPicker = document.getElementById("playerTagPicker");

  const playerTagPickerList = document.getElementById("playerTagPickerList");

  const playerTagSearch = document.getElementById("playerTagSearch");

  const closePlayerTagPicker = document.getElementById("closePlayerTagPicker");

  const donePlayerTagPicker = document.getElementById("donePlayerTagPicker");

  const playerTagSelectionCount = document.getElementById(
    "playerTagSelectionCount",
  );

  /* ==========================================================
   ALBUM ART HELPERS
========================================================== */

  function getSongCover(song) {
    if (!song) {
      return "assets/moon.png";
    }

    /*
    Support the possible artwork field names.

    MoonBox's preferred field is:
        song.cover
  */

    return (
      song.cover ||
      song.albumArt ||
      song.albumArtUrl ||
      song.coverUrl ||
      "assets/moon.png"
    );
  }

  function applySongCover(song) {
    const songCover = getSongCover(song);

    if (cover) {
      cover.src = songCover;
    }

    if (vinylCover) {
      vinylCover.src = songCover;
    }

    /*
    If the image cannot be loaded, fall back safely.
  */

    if (cover) {
      cover.onerror = () => {
        cover.onerror = null;
        cover.src = "assets/moon.png";
      };
    }

    if (vinylCover) {
      vinylCover.onerror = () => {
        vinylCover.onerror = null;
        vinylCover.src = "assets/moon.png";
      };
    }
  }

  /* ==========================================================
   REFRESH PLAYER TAG UI WHEN SONG TAGS CHANGE
========================================================== */

  document.addEventListener("moonbox:songTagsChanged", (event) => {
    const changedSong = event.detail?.song;

    const current = songs[currentSong];

    if (!changedSong || !current) {
      return;
    }

    if (String(changedSong.id) !== String(current.id)) {
      return;
    }

    current.tags = Array.isArray(changedSong.tags) ? [...changedSong.tags] : [];

    requestPlayerTags();

    renderPlayerTagPicker();

    renderPlayerTags();
  });

  /* ==========================================================
   GET MASTER TAG LIST FROM TAG.JS
========================================================== */

  function requestPlayerTags() {
    let masterTags = [];

    document.dispatchEvent(
      new CustomEvent("moonbox:requestTags", {
        detail: {
          setTags: (tags) => {
            masterTags = Array.isArray(tags) ? tags : [];
          },
        },
      }),
    );

    availablePlayerTags = masterTags;
    return availablePlayerTags;
  }

  /* ==========================================================
   SEARCH PLAYER TAGS
========================================================== */

  playerTagSearch?.addEventListener("input", () => {
    renderPlayerTagPicker();
  });

  /* ==========================================================
   RENDER PLAYER TAGS
========================================================== */

  function renderPlayerTags() {
    if (!playerSelectedTags) return;

    playerSelectedTags.innerHTML = "";

    /* No song has been selected yet */
    if (!hasActiveSong) {
      return;
    }

    const song = songs[currentSong];

    if (!song) return;

    if (!Array.isArray(song.tags)) {
      song.tags = [];
    }

    const tagMap = new Map(availablePlayerTags.map((tag) => [tag.id, tag]));

    song.tags.forEach((tagId) => {
      const tag = tagMap.get(tagId);

      if (!tag) return;

      const button = document.createElement("button");

      button.className = "player-selected-tag";

      button.dataset.tagId = tag.id;

      /* ========================================================
   CHECK IF TAG IS MANDATORY
======================================================== */

      const isMandatory = tag.id === "all" || tag.id === song.folderTagId;

      /* ========================================================
   TAG CONTENT
======================================================== */

      button.innerHTML = `
  <i data-lucide="${tag.icon}"></i>

  <span>${tag.name}</span>

  ${
    isMandatory
      ? `<i
          data-lucide="lock"
          class="mandatory-player-tag"
        ></i>`
      : `
        <i
          data-lucide="x"
          class="remove-player-tag"
        ></i>
      `
  }
`;

      playerSelectedTags.appendChild(button);
    });

    lucide.createIcons();
  }

  /* ==========================================================
   CLOUD SONG TITLE EDITOR

   Important:
   This changes only MoonBox's displayed/cloud metadata title.

   It NEVER changes:
   - song.file.name
   - the local audio file
   - the directory/file on the user's device
========================================================== */

  function getOriginalSongTitle(song) {
    if (!song) return "Unknown Song";

    return (
      song.originalTitle ||
      song.name ||
      song.file?.name?.replace(/\.[^/.]+$/, "") ||
      song.title ||
      "Unknown Song"
    );
  }

  function updateTitleEditor(song) {
    if (!song) return;

    const currentTitle = song.title || getOriginalSongTitle(song);

    title.textContent = currentTitle;

    if (titleInput) {
      titleInput.value = currentTitle;
    }

    titleEditor?.classList.remove("editing");
  }

  function saveSongTitle() {
    const song = songs[currentSong];

    if (!song) return;

    const value = titleInput.value.trim();

    if (!value) {
      titleInput.value = song.title || getOriginalSongTitle(song);
      titleEditor.classList.remove("editing");
      return;
    }

    /* Store original title ONCE */
    if (!song.originalTitle) {
      song.originalTitle = getOriginalSongTitle(song);
    }

    /* This is the MoonBox/cloud display title */
    song.title = value;

    title.textContent = value;

    titleEditor.classList.remove("editing");

    /* Tell Library / Cloud layer */
    document.dispatchEvent(
      new CustomEvent("moonbox:songMetadataChanged", {
        detail: {
          songId: song.id || null,
          song: song,
        },
      }),
    );
  }

  editTitleButton?.addEventListener("click", () => {
    const song = songs[currentSong];

    if (!song) return;

    if (!song.originalTitle) {
      song.originalTitle = getOriginalSongTitle(song);
    }

    titleInput.value = song.title || song.originalTitle;

    titleEditor.classList.add("editing");

    titleInput.focus();

    titleInput.select();
  });

  titleInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      saveSongTitle();
    }

    if (event.key === "Escape") {
      const song = songs[currentSong];

      if (song) {
        titleInput.value = song.title || getOriginalSongTitle(song);
      }

      titleEditor.classList.remove("editing");
    }
  });

  titleInput?.addEventListener("blur", () => {
    saveSongTitle();
  });

  restoreTitleButton?.addEventListener("click", (event) => {
    event.preventDefault();

    const song = songs[currentSong];

    if (!song) return;

    const originalTitle = getOriginalSongTitle(song);

    song.title = originalTitle;

    title.textContent = originalTitle;

    titleInput.value = originalTitle;

    titleEditor.classList.remove("editing");

    document.dispatchEvent(
      new CustomEvent("moonbox:songMetadataChanged", {
        detail: {
          songId: song.id || null,
          song: song,
        },
      }),
    );
  });

  /* ==========================================================
   RENDER TAG PICKER
========================================================== */

  function renderPlayerTagPicker() {
    if (!playerTagPickerList) return;

    const song = songs[currentSong];

    if (!song) return;

    if (!Array.isArray(song.tags)) {
      song.tags = [];
    }

    const search = playerTagSearch.value.trim().toLowerCase();

    playerTagPickerList.innerHTML = "";

    availablePlayerTags
      .filter((tag) => tag.id !== "all")
      .filter((tag) => tag.name.toLowerCase().includes(search))
      .forEach((tag) => {
        const selected = song.tags.includes(tag.id);

        const button = document.createElement("button");

        button.type = "button";

        button.className = "player-tag-picker-option";

        if (selected) {
          button.classList.add("selected");
        }

        button.dataset.tagId = tag.id;

        button.innerHTML = `
        <i data-lucide="${tag.icon}"></i>

        <span>${tag.name}</span>

        <span class="player-tag-check">
          ${selected ? "✓" : ""}
        </span>
      `;

        button.addEventListener("click", () => {
          togglePlayerSongTag(tag.id);
        });

        playerTagPickerList.appendChild(button);
      });

    updatePlayerTagSelectionCount();

    lucide.createIcons();
  }

  /* ==========================================================
   TOGGLE TAG FOR CURRENT SONG
========================================================== */

  function togglePlayerSongTag(tagId) {
    const song = songs[currentSong];

    if (!song) return;

    /* ========================================================
     ALL TAG IS MANDATORY
  ======================================================== */

    if (tagId === "all") {
      return;
    }

    /* ========================================================
     FOLDER TAG IS MANDATORY
  ======================================================== */

    if (tagId === song.folderTagId) {
      return;
    }

    /* ========================================================
     MAKE SURE TAG ARRAY EXISTS
  ======================================================== */

    if (!Array.isArray(song.tags)) {
      song.tags = [];
    }

    /* ========================================================
     TOGGLE TAG
  ======================================================== */

    const index = song.tags.indexOf(tagId);

    let added;

    if (index === -1) {
      /*
       Tag was not present.
       Add it.
    */

      song.tags.push(tagId);

      added = true;
    } else {
      /*
       Tag was already present.
       Remove it.
    */

      song.tags.splice(index, 1);

      added = false;
    }

    /* ========================================================
     UPDATE PLAYER UI
  ======================================================== */

    renderPlayerTagPicker();

    renderPlayerTags();

    /* ========================================================
     TELL CLOUD
  ======================================================== */

    document.dispatchEvent(
      new CustomEvent("moonbox:songTagsChanged", {
        detail: {
          songId: song.id || null,

          song: song,

          tagId: tagId,

          added: added,

          tags: [...song.tags],
        },
      }),
    );
  }

  /* ==========================================================
   UPDATE TAG SELECTION COUNT
========================================================== */

  function updatePlayerTagSelectionCount() {
    const song = songs[currentSong];

    if (!playerTagSelectionCount) return;

    if (!song || !Array.isArray(song.tags)) {
      playerTagSelectionCount.textContent = "0 selected";
      return;
    }

    const count = song.tags.length;

    playerTagSelectionCount.textContent = `${count} selected`;
  }

  /* ==========================================================
   REMOVE TAG FROM PLAYER
========================================================== */

  playerSelectedTags?.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-player-tag");

    if (!removeButton) return;

    const chip = removeButton.closest(".player-selected-tag");

    if (!chip) return;

    const tagId = chip.dataset.tagId;

    togglePlayerSongTag(tagId);
  });

  /* ==========================================================
   CLOSE TAG PICKER
========================================================== */

  closePlayerTagPicker?.addEventListener("click", () => {
    playerTagPicker.classList.remove("open");
  });

  donePlayerTagPicker?.addEventListener("click", () => {
    playerTagPicker.classList.remove("open");
  });

  playerTagPicker?.addEventListener("click", (event) => {
    if (event.target === playerTagPicker) {
      playerTagPicker.classList.remove("open");
    }
  });

  /* ==========================================================
   RECEIVE LIBRARY QUEUE
========================================================== */
  document.addEventListener("moonbox:libraryQueueChanged", (event) => {
    songs = Array.isArray(event.detail.songs) ? event.detail.songs : [];

    /*
    Normalize artwork fields so Player always knows
    where the album art is.
  */

    songs.forEach((song) => {
      if (!song) return;

      if (!song.cover) {
        song.cover = song.albumArt || song.albumArtUrl || song.coverUrl || "";
      }
    });

    /*
    Keep current song if it still exists.
  */

    if (currentSong >= songs.length) {
      currentSong = 0;
    }
  });

  /* ==========================================================
   CLOUD METADATA RESTORED
========================================================== */

  document.addEventListener("moonbox:cloudSongMetadataReady", (event) => {
    const cloudSong = event.detail?.song;

    if (!cloudSong) {
      return;
    }

    const current = songs[currentSong];

    if (!current) {
      return;
    }

    /*
      Make sure Firebase metadata belongs to
      the song currently displayed in Player.
    */

    if (String(cloudSong.id) !== String(current.id)) {
      return;
    }

    /*
      Firebase metadata has already been merged
      into the SAME song object.

      Refresh Player UI.
    */

    updateTitleEditor(current);

    artist.textContent = current.artist || "MoonBox";

    applySongCover(current);

    loadSongDetails(current);

    loadLyrics(current);

    loadNotes(current);

    requestPlayerTags();

    renderPlayerTags();

    renderPlayerTagPicker();

    lucide.createIcons();

    console.log("MoonBox Player: Firebase metadata restored", {
      song: current.name,
      cover: current.cover,
      tags: current.tags,
    });
  });
  /* ==========================================================
   PLAY SONG FROM LIBRARY
========================================================== */

  document.addEventListener("moonbox:playFromLibrary", (event) => {
    const queue = Array.isArray(event.detail.songs) ? event.detail.songs : [];

    const index = event.detail.index ?? 0;

    if (queue.length === 0) {
      return;
    }

    songs = queue;

    songs.forEach((song) => {
      if (!song) return;

      if (!song.cover) {
        song.cover = song.albumArt || song.albumArtUrl || song.coverUrl || "";
      }
    });

    currentSong = index;
    hasActiveSong = true;

    loadSong(currentSong);

    playSong();
  });

  /* ==========================================================
   PAUSE PLAYER FROM LIBRARY
========================================================== */

  document.addEventListener("moonbox:pausePlayer", () => {
    if (!playing) {
      return;
    }

    pauseSong();
  });

  /* ==========================================================
   FORMAT TIME
========================================================== */

  function format(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "0:00";
    }

    const totalSeconds = Math.floor(seconds);

    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  /* ==========================================================
   LOAD SONG
========================================================== */
  function updateProgress() {
    const song = songs[currentSong];

    if (!song) return;

    const duration = song.duration || 180;

    const percent = (elapsed / duration) * 100;

    progress.value = elapsed;

    progress.style.setProperty("--progress", `${percent}%`);

    currentTime.textContent = format(elapsed);
  }

  /* ==========================================================
   LOAD SONG
========================================================== */
  function loadSongDetails(song) {
    if (!song) return;

    const currentYear = new Date().getFullYear();

    const details = {
      Album: song.album || "",

      Artist: song.artist || "Unknown Artist",

      Year: song.year || currentYear,

      Genre: song.genre || "Pop",

      Bitrate: song.bitrate || "Unknown",

      Format: song.format || "Unknown",
    };

    document.querySelectorAll(".detail-item").forEach((item) => {
      const label = item.querySelector("span")?.textContent.trim();

      if (!label) return;

      const value = details[label];

      if (value === undefined) return;

      const display = item.querySelector(".detail-display");

      const input = item.querySelector(".detail-input");

      if (display) {
        display.textContent = value;
      }

      if (input) {
        input.value = value;
      }
    });
  }

  function loadSong(index) {
    /* 1. Get song */
    const song = songs[index];

    if (!song) {
      return;
    }

    /* 2. Stop previous audio */
    audio.pause();

    /* 3. Release previous URL */
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    /* 4. Attach local file */
    if (song.file instanceof Blob) {
      currentObjectUrl = URL.createObjectURL(song.file);

      audio.src = currentObjectUrl;
    } else {
      console.warn("MoonBox Player: No local audio File found:", song);

      audio.removeAttribute("src");
    }

    /* 5. Basic Player information */
    updateTitleEditor(song);

    artist.textContent = song.artist || "MoonBox";

    applySongCover(song);

    /* 7. Duration */
    const songDuration = Number.isFinite(song.duration) ? song.duration : 0;

    totalTime.textContent = format(songDuration);

    progress.max = songDuration;

    progress.value = 0;

    progress.style.setProperty("--progress", "0%");

    elapsed = 0;

    currentTime.textContent = "0:00";

    /* 8. Reset visual playback state */
    playing = false;

    playButton.classList.remove("playing");

    playButton.innerHTML = `<i data-lucide="play"></i>`;

    vinyl.classList.remove("playing");

    album.classList.remove("playing");

    clearInterval(timer);

    /* 9. Load song-specific data */
    loadSongDetails(song);

    loadLyrics(song);

    loadNotes(song);

    requestPlayerTags();

    renderPlayerTags();

    /* 10. Update Player top */
    updatePlayerTop(song);

    lucide.createIcons();
  }

  /* ==========================================================
   PLAY
========================================================== */

  async function playSong() {
    const song = songs[currentSong];

    if (!song) {
      return;
    }

    if (!(song.file instanceof Blob)) {
      console.warn("MoonBox Player: This song has no local audio data.", song);

      return;
    }

    try {
      await audio.play();

      playing = true;

      playButton.classList.add("playing");

      playButton.innerHTML = `<i data-lucide="pause"></i>`;

      vinyl.classList.add("playing");

      album.classList.add("playing");

      lucide.createIcons();

      document.dispatchEvent(
        new CustomEvent("moonbox:playbackStateChanged", {
          detail: {
            songId: song.id || null,
            playing: true,
          },
        }),
      );
    } catch (error) {
      console.error("MoonBox Player: Could not play audio.", error);

      playing = false;
    }
  }

  /* ==========================================================
   PAUSE
========================================================== */

  function pauseSong() {
    audio.pause();

    playing = false;

    playButton.classList.remove("playing");

    playButton.innerHTML = `<i data-lucide="play"></i>`;

    vinyl.classList.remove("playing");

    album.classList.remove("playing");

    lucide.createIcons();

    const song = songs[currentSong];

    document.dispatchEvent(
      new CustomEvent("moonbox:playbackStateChanged", {
        detail: {
          songId: song?.id || null,
          playing: false,
        },
      }),
    );
  }

  /* ==========================================================
   REAL AUDIO PROGRESS
========================================================== */

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) {
      return;
    }

    elapsed = audio.currentTime;

    const percent = (audio.currentTime / audio.duration) * 100;

    progress.value = audio.currentTime;

    progress.style.setProperty("--progress", `${percent}%`);

    currentTime.textContent = format(audio.currentTime);
  });

  /* ==========================================================
   AUDIO METADATA LOADED
========================================================== */

  audio.addEventListener("loadedmetadata", () => {
    const duration = audio.duration;

    if (!Number.isFinite(duration)) {
      return;
    }

    const song = songs[currentSong];

    if (song) {
      song.duration = duration;
    }

    progress.max = duration;

    totalTime.textContent = format(duration);
  });

  /* ==========================================================
   SONG ENDED
========================================================== */

  audio.addEventListener("ended", () => {
    playing = false;

    clearInterval(timer);

    if (repeatMode === 2) {
      /* Repeat current song */

      audio.currentTime = 0;

      playSong();

      return;
    }

    autoNext();
  });

  /* ==========================================================
   NEXT
========================================================== */

  function next() {
    if (!songs.length) {
      return;
    }

    currentSong++;

    if (currentSong >= songs.length) {
      currentSong = 0;
    }

    loadSong(currentSong);

    playSong();
  }

  /* ==========================================================
   PREVIOUS
========================================================== */

  function previous() {
    if (!songs.length) {
      return;
    }

    currentSong--;

    if (currentSong < 0) {
      currentSong = songs.length - 1;
    }

    loadSong(currentSong);

    playSong();
  }

  /* ==========================================================
   BUTTONS
========================================================== */

  function autoNext() {
    if (shuffle) {
      currentSong = Math.floor(Math.random() * songs.length);
    } else {
      currentSong++;

      // Reached the end of the playlist
      if (currentSong >= songs.length) {
        if (repeatMode === 1) {
          // Repeat the whole playlist
          currentSong = 0;
        } else {
          // Repeat OFF → stop playback
          currentSong = songs.length - 1;

          pauseSong();

          return;
        }
      }
    }

    loadSong(currentSong);

    playSong();
  }

  /* ==========================================================
   CHANGE ALBUM ART FROM ONLINE URL
========================================================== */

  cover.addEventListener("click", () => {
    const song = songs[currentSong];

    if (!song) {
      return;
    }

    const currentCover = song.cover || "";

    const imageUrl = window.prompt("Enter album artwork URL:", currentCover);

    /* User pressed Cancel */
    if (imageUrl === null) {
      return;
    }

    const url = imageUrl.trim();

    /* Empty URL */
    if (!url) {
      return;
    }

    /* Only allow normal web URLs */
    if (!/^https?:\/\//i.test(url)) {
      alert("Please enter a valid image URL starting with http:// or https://");
      return;
    }

    /* Test whether the image actually loads */
    const testImage = new Image();

    testImage.onload = () => {
      /* Update current song */
      song.cover = url;

      /* Update main artwork */
      cover.src = url;

      /* Update vinyl artwork if it still exists */
      if (vinylCover) {
        vinylCover.src = url;
      }

      /* Tell the rest of MoonBox */
      document.dispatchEvent(
        new CustomEvent("moonbox:songMetadataChanged", {
          detail: {
            songId: song.id || null,
            song: song,
          },
        }),
      );
    };

    testImage.onerror = () => {
      alert("MoonBox could not load that image. Please check the URL.");
    };

    testImage.src = url;
  });

  playButton.addEventListener("click", () => {
    if (playing) {
      pauseSong();
    } else {
      playSong();
    }
  });

  /* ==========================================================
   PAUSE PLAYER FROM LIBRARY
========================================================== */

  document.addEventListener("moonbox:pausePlayer", () => {
    if (!playing) {
      return;
    }

    pauseSong();
  });

  nextButton.addEventListener("click", next);

  previousButton.addEventListener("click", previous);

  /* ==========================================================
   GO TO LIBRARY
========================================================== */

  const goToLibrary = document.getElementById("playerGoToLibrary");

  if (goToLibrary) {
    goToLibrary.addEventListener("click", (e) => {
      e.preventDefault();

      /* Turn Visualization OFF first */
      playerScreen.classList.remove("visualization-mode");

      visualizationButton.classList.remove("active");

      visualizationButton.querySelector("span").textContent =
        "Visualization: Off";

      const libraryButton = document.querySelector(
        '.nav-button[data-screen="1"]',
      );

      if (libraryButton) {
        libraryButton.click();
      }
    });
  }

  /* ==========================================================
   VISUALIZATION MODE
========================================================== */

  const playerScreen = document.getElementById("playerScreen");

  const visualizationButton = document.getElementById(
    "playerVisualizationToggle",
  );

  if (visualizationButton) {
    visualizationButton.addEventListener("click", () => {
      const isVisualizationOn =
        playerScreen.classList.toggle("visualization-mode");

      const text = visualizationButton.querySelector("span");
      const icon = visualizationButton.querySelector("svg");

      if (isVisualizationOn) {
        text.textContent = "Visualization: On";

        visualizationButton.classList.add("active");

        if (icon) {
          icon.setAttribute("data-lucide", "audio-waveform");
        }
      } else {
        text.textContent = "Visualization: Off";

        visualizationButton.classList.remove("active");

        if (icon) {
          icon.setAttribute("data-lucide", "audio-waveform");
        }
      }

      lucide.createIcons();
    });
  }

  /* ==========================================================
   SEEK
========================================================== */

  progress.addEventListener("input", () => {
    const value = Number(progress.value);

    if (!Number.isFinite(value)) {
      return;
    }

    audio.currentTime = value;

    elapsed = value;

    updateProgress();
  });

  /* ==========================================================
   SHUFFLE
========================================================== */

  shuffleButton.addEventListener("click", () => {
    shuffle = !shuffle;

    shuffleButton.classList.toggle("active", shuffle);

    shuffleButton.querySelector("span").textContent = shuffle
      ? "Shuffle On"
      : "Shuffle";
  });

  /* ==========================================================
   REPEAT
========================================================== */
  function updateRepeatButton() {
    const text = repeatButton.querySelector("span");

    repeatButton.classList.remove("repeat-library", "repeat-song");

    switch (repeatMode) {
      case 0:
        text.textContent = "Repeat";

        repeatButton.classList.remove("active");

        break;

      case 1:
        text.textContent = "Repeat List";

        repeatButton.classList.add("active");
        repeatButton.classList.add("repeat-library");

        break;

      case 2:
        text.textContent = "Repeat Song";

        repeatButton.classList.add("active");
        repeatButton.classList.add("repeat-song");

        break;
    }
  }

  repeatButton.addEventListener("click", () => {
    repeatMode++;

    if (repeatMode > 2) repeatMode = 0;

    updateRepeatButton();
  });

  /* ==========================================================
   SIDEBAR
========================================================== */

  tabs.forEach((button) => {
    button.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));

      button.classList.add("active");

      const panel = button.dataset.panel;

      panels.forEach((p) => p.classList.remove("active"));

      document.getElementById(panel + "Panel").classList.add("active");
    });
  });

  /* ==========================================================
   LYRICS
========================================================== */

  function loadLyrics(song) {
    const lyrics = typeof song.lyrics === "string" ? song.lyrics : "";

    lyricsView.textContent = lyrics;

    lyricsView.classList.remove("hide");

    lyricsEditor.classList.remove("active");

    lyricsEditor.value = lyrics;
  }

  lyricsView.addEventListener("click", () => {
    const song = songs[currentSong];

    if (!song) return;

    lyricsEditor.value = song.lyrics || "";

    lyricsView.classList.add("hide");

    lyricsEditor.classList.add("active");

    lyricsEditor.focus();
  });

  lyricsEditor.addEventListener("blur", () => {
    const song = songs[currentSong];

    if (!song) return;

    song.lyrics = lyricsEditor.value.trim();

    lyricsView.textContent = song.lyrics;

    lyricsEditor.classList.remove("active");

    lyricsView.classList.remove("hide");

    document.dispatchEvent(
      new CustomEvent("moonbox:songMetadataChanged", {
        detail: {
          songId: song.id || null,
          song: song,
        },
      }),
    );
  });

  lyricsFile?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const song = songs[currentSong];

    if (!song) return;

    try {
      const text = await file.text();

      song.lyrics = text;

      document.dispatchEvent(
        new CustomEvent("moonbox:songMetadataChanged", {
          detail: {
            songId: song.id || null,
            song: song,
          },
        }),
      );

      lyricsView.textContent = text;

      lyricsEditor.value = text;

      lyricsView.classList.remove("hide");

      lyricsEditor.classList.remove("active");
    } catch (error) {
      console.error("MoonBox: Could not read lyrics file.", error);
    }

    lyricsFile.value = "";
  });

  /* ==========================================================
   PlayerTOp Update
========================================================== */

  function updatePlayerTop(song) {
    if (!song) return;

    updateTitleEditor(song);

    artist.textContent = song.artist || "MoonBox";
  }

  function loadNotes(song) {
    if (!notesEditor) return;

    notesEditor.value = song.notes || "";
  }

  /* ==========================================================
   DETAILS
========================================================== */

  const detailItems = document.querySelectorAll(".detail-item");

  detailItems.forEach((item) => {
    const labelElement = item.querySelector("span");

    const display = item.querySelector(".detail-display");

    const input = item.querySelector(".detail-input");

    if (!labelElement || !display || !input) {
      return;
    }

    const field = labelElement.textContent.trim().toLowerCase();

    item.addEventListener("click", () => {
      item.classList.add("editing");

      input.focus();

      input.setSelectionRange(input.value.length, input.value.length);
    });

    function save() {
      const song = songs[currentSong];

      if (!song) {
        return;
      }

      const value = input.value.trim();

      /* -----------------------------------------------
           Update song metadata
        ------------------------------------------------ */

      switch (field) {
        case "album":
          song.album = value;
          break;

        case "artist":
          song.artist = value;
          break;

        case "year":
          song.year = value || new Date().getFullYear();
          break;

        case "genre":
          song.genre = value || "Pop";
          break;

        case "bitrate":
          song.bitrate = value || "Unknown";
          break;

        case "format":
          song.format = value || "Unknown";
          break;
      }

      /* -----------------------------------------------
           Update Details UI
        ------------------------------------------------ */

      display.textContent = value || "—";

      item.classList.remove("editing");

      /* -----------------------------------------------
           Update Player top
        ------------------------------------------------ */

      updatePlayerTop(song);

      /* -----------------------------------------------
           Tell MoonBox
        ------------------------------------------------ */

      document.dispatchEvent(
        new CustomEvent("moonbox:songMetadataChanged", {
          detail: {
            songId: song.id,
            song: song,
          },
        }),
      );
    }

    input.addEventListener("blur", save);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        input.blur();
      }

      if (event.key === "Escape") {
        input.value = display.textContent;

        item.classList.remove("editing");
      }
    });
  });

  /* ==========================================================
   ADD TAG BUTTON
   Always opens the tag picker.
========================================================== */

  if (addPlayerTag) {
    addPlayerTag.addEventListener("click", () => {
      const playerScreen = document.getElementById("playerScreen");

      if (!playerScreen) return;

      if (playerTagSearch) {
        playerTagSearch.value = "";
      }

      requestPlayerTags();
      renderPlayerTagPicker();

      playerTagPicker?.classList.add("open");

      lucide.createIcons();
    });
  }

  /* ==========================================================
   TOGGLE TAG SECTION
========================================================== */

  const togglePlayerTags = document.getElementById("togglePlayerTags");

  if (togglePlayerTags) {
    togglePlayerTags.addEventListener("click", () => {
      const playerScreen = document.getElementById("playerScreen");

      if (!playerScreen) return;

      const isCollapsed = playerScreen.classList.toggle("tags-collapsed");

      /*
       * Opening the Tags section:
       * show the tags already assigned to the song.
       */
      if (!isCollapsed) {
        playerScreen.classList.add("tags-expanded");

        requestPlayerTags();
        renderPlayerTags();
      } else {
        /*
         * Closing the Tags section.
         */
        playerScreen.classList.remove("tags-expanded");
      }

      togglePlayerTags.setAttribute("aria-expanded", String(!isCollapsed));

      togglePlayerTags.setAttribute(
        "aria-label",
        isCollapsed ? "Expand tags" : "Collapse tags",
      );

      togglePlayerTags.setAttribute(
        "title",
        isCollapsed ? "Expand tags" : "Collapse tags",
      );

      lucide.createIcons();
    });
  }

  /* ==========================================================
   INITIALIZE
   Player starts EMPTY.
   No song or song tags are selected until the user
   chooses a song from the Library.
========================================================== */

  hasActiveSong = false;
  currentSong = -1;

  /* Keep Tags section closed */
  if (playerScreen) {
    playerScreen.classList.add("tags-collapsed");
    playerScreen.classList.remove("tags-expanded");
  }

  /* Update toggle state */
  if (togglePlayerTags) {
    togglePlayerTags.setAttribute("aria-expanded", "false");
    togglePlayerTags.setAttribute("aria-label", "Expand tags");
    togglePlayerTags.setAttribute("title", "Expand tags");
  }

  /* Make sure no song tags are displayed */
  if (playerSelectedTags) {
    playerSelectedTags.innerHTML = "";
  }

  /* Initial empty player state */
  if (title) {
    title.textContent = "Your Music";
  }

  if (artist) {
    artist.textContent = "MoonBox";
  }

  if (currentTime) {
    currentTime.textContent = "0:00";
  }

  if (totalTime) {
    totalTime.textContent = "0:00";
  }

  if (progress) {
    progress.value = 0;
    progress.max = 0;
    progress.style.setProperty("--progress", "0%");
  }

  /* Do NOT call loadSong() here */
  lucide.createIcons();
});
