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

  let playerTags = [
    {
      name: "Night",
      icon: "moon-star",
    },

    {
      name: "Rain",
      icon: "cloud-rain",
    },

    {
      name: "Lofi",
      icon: "audio-waveform",
    },
  ];

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
    const m = Math.floor(seconds / 60);

    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, "0")}`;
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

  function loadSong(index) {
    const song = songs[index];

    if (!song) return;

    /* -----------------------------------------------
     Temporary dummy metadata
  ------------------------------------------------ */

    const songTitle = song.title || song.name || "Unknown Song";

    const songArtist = song.artist || "Unknown Artist";

    const songDuration = song.duration || 180;

    const songCover = song.cover || "assets/moon.png";

    /* -----------------------------------------------
     Update Player
  ------------------------------------------------ */

    title.textContent = songTitle;

    artist.textContent = songArtist;

    cover.src = songCover;

    totalTime.textContent = format(songDuration);

    progress.max = songDuration;

    progress.style.setProperty("--progress", "0%");

    elapsed = 0;

    updateProgress();
  }

  /* ==========================================================
   PLAY
========================================================== */

  function playSong() {
    playing = true;

    playButton.classList.add("playing");

    playButton.innerHTML = `<i data-lucide="pause"></i>`;

    vinyl.classList.add("playing");
    album.classList.add("playing");

    lucide.createIcons();

    const song = songs[currentSong];

    document.dispatchEvent(
      new CustomEvent("moonbox:playbackStateChanged", {
        detail: {
          songId: song?.id || null,
          playing: true,
        },
      }),
    );

    clearInterval(timer);

    timer = setInterval(() => {
      elapsed++;

      updateProgress();

      const duration = songs[currentSong]?.duration || 180;

      if (elapsed >= duration) {
        clearInterval(timer);

        if (repeatMode === 2) {
          // Repeat current song
          elapsed = 0;
          playSong();
        } else {
          autoNext();
        }
      }
    }, 1000);
  }

  /* ==========================================================
   PAUSE
========================================================== */

  function pauseSong() {
    playing = false;

    playButton.classList.remove("playing");

    playButton.innerHTML = `<i data-lucide="play"></i>`;

    vinyl.classList.remove("playing");

    album.classList.remove("playing");

    lucide.createIcons();

    clearInterval(timer);

    /* ======================================================
     TELL LIBRARY
  =============
  ========================================= */

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
   BUTTONS
========================================================== */

  function next() {
    clearInterval(timer);

    currentSong++;

    if (currentSong >= songs.length) currentSong = 0;

    loadSong(currentSong);

    playSong();
  }

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

  function previous() {
    clearInterval(timer);

    currentSong--;

    if (currentSong < 0) currentSong = songs.length - 1;

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

      const libraryButton = document.querySelector(
        '.nav-button[data-screen="1"]',
      );

      if (libraryButton) {
        libraryButton.click();
      }
    });
  }

  /* ==========================================================
   PROGRESS
========================================================== */

  progress.addEventListener("input", () => {
    elapsed = Number(progress.value);

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
   Tags
========================================================== */

  document.getElementById("addPlayerTag").addEventListener("click", () => {
    const dummy = [
      {
        name: "Drive",
        icon: "car-front",
      },

      {
        name: "Study",
        icon: "book-open",
      },

      {
        name: "Jazz",
        icon: "music-4",
      },
    ];

    const available = dummy.filter(
      (tag) => !playerTags.some((t) => t.name === tag.name),
    );

    if (available.length === 0) return;

    playerTags.push(available[0]);

    renderPlayerTags();
  });

  document.addEventListener("click", (e) => {
    const remove = e.target.closest(".remove-player-tag");

    if (!remove) return;

    playerTags.splice(remove.dataset.index, 1);

    renderPlayerTags();
  });

  function renderPlayerTags() {
    const container = document.getElementById("playerSelectedTags");

    container.innerHTML = "";

    playerTags.forEach((tag, index) => {
      const button = document.createElement("button");

      button.className = "player-selected-tag";

      button.innerHTML = `

            <i data-lucide="${tag.icon}"></i>

            <span>${tag.name}</span>

            <i
                class="remove-player-tag"
                data-index="${index}"
                data-lucide="x"
            ></i>

        `;

      container.appendChild(button);
    });

    lucide.createIcons();
  }

  /* ==========================================================
   INITIALIZE
========================================================== */

  loadSong(currentSong);
  renderPlayerTags();

  lucide.createIcons();
});
