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

  const vinyl = document.querySelector(".vinyl");
  const album = document.querySelector(".player-album");

  const lyricsView = document.getElementById("lyricsView");
  const lyricsEditor = document.getElementById("lyricsEditor");

  const vinylCover = document.getElementById("playerVinylCover");

  const changeCoverButton = document.getElementById("playerChangeCover");

  const coverInput = document.getElementById("playerCoverInput");

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

  let currentSong = 0;

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
   GET MASTER TAG LIST FROM TAG.JS
========================================================== */

  /* ==========================================================
   TEMPORARY PLAYER TAGS
   For UI testing only
========================================================== */

  function requestPlayerTags() {
    availablePlayerTags = [
      {
        id: "chill",
        name: "Chill",
        icon: "moon",
      },
      {
        id: "rain",
        name: "Rain",
        icon: "cloud-rain",
      },
      {
        id: "night",
        name: "Night",
        icon: "moon-star",
      },
      {
        id: "lofi",
        name: "Lofi",
        icon: "audio-waveform",
      },
      {
        id: "drive",
        name: "Drive",
        icon: "car-front",
      },
      {
        id: "study",
        name: "Study",
        icon: "book-open",
      },
      {
        id: "jazz",
        name: "Jazz",
        icon: "music-4",
      },
      {
        id: "focus",
        name: "Focus",
        icon: "target",
      },
      {
        id: "sleep",
        name: "Sleep",
        icon: "bed",
      },
      {
        id: "coding",
        name: "Coding",
        icon: "code-2",
      },
      {
        id: "nature",
        name: "Nature",
        icon: "leaf",
      },
      {
        id: "travel",
        name: "Travel",
        icon: "plane",
      },
      {
        id: "happy",
        name: "Happy",
        icon: "smile",
      },
      {
        id: "relax",
        name: "Relax",
        icon: "flower-2",
      },
      {
        id: "piano",
        name: "Piano",
        icon: "piano",
      },
    ];

    return availablePlayerTags;
  }

  /* ==========================================================
   OPEN PLAYER TAG PICKER
========================================================== */

  if (addPlayerTag) {
    addPlayerTag.addEventListener("click", () => {
      /* Clear search first */
      if (playerTagSearch) {
        playerTagSearch.value = "";
      }

      /* Get latest master tags */
      requestPlayerTags();

      /* Render available tags */
      renderPlayerTagPicker();

      /* Show popup */
      playerTagPicker?.classList.add("open");

      /* Refresh Lucide icons */
      lucide.createIcons();
    });
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

      button.innerHTML = `
      <i data-lucide="${tag.icon}"></i>

      <span>${tag.name}</span>

      <i
        data-lucide="x"
        class="remove-player-tag"
      ></i>
    `;

      playerSelectedTags.appendChild(button);
    });

    lucide.createIcons();
  }

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

    if (!Array.isArray(song.tags)) {
      song.tags = [];
    }

    const index = song.tags.indexOf(tagId);

    if (index === -1) {
      song.tags.push(tagId);
    } else {
      song.tags.splice(index, 1);
    }

    renderPlayerTagPicker();

    renderPlayerTags();

    /* Tell Library to refresh */

    document.dispatchEvent(
      new CustomEvent("moonbox:songTagsChanged", {
        detail: {
          songId: song.id,
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
    songs = event.detail.songs || [];

    /*
      Keep current song if it still exists.
      Otherwise reset safely.
    */

    if (currentSong >= songs.length) {
      currentSong = 0;
    }
  });

  /* ==========================================================
   PLAY SONG FROM LIBRARY
========================================================== */

  document.addEventListener("moonbox:playFromLibrary", (event) => {
    const queue = event.detail.songs || [];
    const index = event.detail.index ?? 0;

    if (queue.length === 0) {
      return;
    }

    /* Replace Player queue */
    songs = queue;

    /* Select the clicked Library song */
    currentSong = index;

    /* Load it */
    loadSong(currentSong);

    /* Start playback */
    playSong();
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

  function loadSong(index) {
    const song = songs[index];

    if (!song) {
      return;
    }

    /* -----------------------------------------------
     Stop current audio
  ------------------------------------------------ */

    audio.pause();

    /* -----------------------------------------------
     Release previous object URL
  ------------------------------------------------ */

    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }

    /* -----------------------------------------------
     Local file must exist
  ------------------------------------------------ */

    if (song.file instanceof File) {
      currentObjectUrl = URL.createObjectURL(song.file);

      audio.src = currentObjectUrl;
    } else {
      console.warn("MoonBox Player: No local audio File found for song:", song);

      audio.removeAttribute("src");
    }

    /* -----------------------------------------------
     Metadata
  ------------------------------------------------ */

    const songTitle = song.title || song.name || "Unknown Song";

    const songArtist = song.artist || "Unknown Artist";

    const songDuration = Number.isFinite(song.duration) ? song.duration : 0;

    const songCover = song.cover || "assets/moon.png";

    /* -----------------------------------------------
     Update Player UI
  ------------------------------------------------ */

    title.textContent = songTitle;

    artist.textContent = songArtist;

    cover.src = songCover;

    if (vinylCover) {
      vinylCover.src = songCover;
    }

    totalTime.textContent = format(songDuration);

    progress.max = songDuration;

    progress.value = 0;

    progress.style.setProperty("--progress", "0%");

    elapsed = 0;

    currentTime.textContent = "0:00";

    /* -----------------------------------------------
     Reset player state
  ------------------------------------------------ */

    playing = false;

    playButton.classList.remove("playing");

    playButton.innerHTML = `<i data-lucide="play"></i>`;

    vinyl.classList.remove("playing");

    album.classList.remove("playing");

    clearInterval(timer);

    requestPlayerTags();

    renderPlayerTags();

    lucide.createIcons();
  }

  /* ==========================================================
   CHANGE ALBUM COVER
========================================================== */

  if (changeCoverButton && coverInput) {
    changeCoverButton.addEventListener("click", () => {
      coverInput.click();
    });

    coverInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        const newCover = e.target.result;

        /* -----------------------------------------------
         Update album artwork
      ------------------------------------------------ */

        cover.src = newCover;

        /* -----------------------------------------------
         Update vinyl artwork
      ------------------------------------------------ */

        if (vinylCover) {
          vinylCover.src = newCover;
        }

        /* -----------------------------------------------
         Update current song data
      ------------------------------------------------ */

        const song = songs[currentSong];

        if (song) {
          song.cover = newCover;
        }

        /* -----------------------------------------------
         Tell the rest of MoonBox
      ------------------------------------------------ */

        document.dispatchEvent(
          new CustomEvent("moonbox:coverChanged", {
            detail: {
              songId: song?.id || null,
              cover: newCover,
            },
          }),
        );
      };

      reader.readAsDataURL(file);

      /* Allow selecting the same image again */
      coverInput.value = "";
    });
  }

  /* ==========================================================
   PLAY
========================================================== */

  async function playSong() {
    const song = songs[currentSong];

    if (!song) {
      return;
    }

    if (!(song.file instanceof File)) {
      console.warn("MoonBox Player: This song has no local File object.", song);

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

  cover.addEventListener("click", () => {
    if (playing) {
      pauseSong();
    } else {
      playSong();
    }
  });

  playButton.addEventListener("click", () => {
    if (playing) {
      pauseSong();
    } else {
      playSong();
    }
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
  lyricsView.addEventListener("click", () => {
    lyricsEditor.value = lyricsView.textContent;

    lyricsView.classList.add("hide");

    lyricsEditor.classList.add("active");

    lyricsEditor.focus();
  });

  lyricsEditor.addEventListener("blur", () => {
    lyricsView.textContent = lyricsEditor.value;

    lyricsEditor.classList.remove("active");

    lyricsView.classList.remove("hide");
  });

  /* ==========================================================
   Details
========================================================== */

  const detailItems = document.querySelectorAll(".detail-item");

  detailItems.forEach((item) => {
    const display = item.querySelector(".detail-display");

    const input = item.querySelector(".detail-input");

    item.addEventListener("click", () => {
      item.classList.add("editing");

      input.focus();

      input.setSelectionRange(input.value.length, input.value.length);
    });

    function save() {
      display.textContent = input.value.trim();

      item.classList.remove("editing");
    }

    input.addEventListener("blur", save);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
    });
  });

  /* ==========================================================
   INITIALIZE
========================================================== */

  loadSong(currentSong);

  lucide.createIcons();
});
