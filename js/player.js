/* ==========================================================
   MOON BOX
   player.js
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ======================================================
       ELEMENTS
    ====================================================== */

  const cover = document.getElementById("playerCover");

  const title = document.getElementById("playerTitle");

  const artist = document.getElementById("playerArtist");

  const year = document.getElementById("playerYear");

  const genre = document.getElementById("playerGenre");

  const duration = document.getElementById("playerDuration");

  const currentTime = document.getElementById("currentTime");

  const totalTime = document.getElementById("totalTime");

  const progress = document.getElementById("playerProgress");

  const playButton = document.getElementById("playButton");

  const previousButton = document.getElementById("previousButton");

  const nextButton = document.getElementById("nextButton");

  const shuffleButton = document.getElementById("shuffleButton");

  const repeatButton = document.getElementById("repeatButton");

  const notes = document.getElementById("playerNotes");

  /* ======================================================
       SAMPLE PLAYLIST
    ====================================================== */

  const playlist = [
    {
      title: "Midnight Drive",

      artist: "The Weeknd",

      year: "2023",

      genre: "Night",

      duration: 222,

      cover: "assets/default-cover.png",
    },

    {
      title: "Golden Hour",

      artist: "JVKE",

      year: "2022",

      genre: "Pop",

      duration: 198,

      cover: "assets/default-cover.png",
    },

    {
      title: "Rainy Days",

      artist: "Joji",

      year: "2021",

      genre: "Rain",

      duration: 184,

      cover: "assets/default-cover.png",
    },
  ];

  /* ======================================================
       STATE
    ====================================================== */

  let currentSong = 0;

  let playing = false;

  let repeat = false;

  let shuffle = false;

  let elapsed = 0;

  let timer = null;

  /* ======================================================
       FORMAT TIME
    ====================================================== */

  function format(seconds) {
    const m = Math.floor(seconds / 60);

    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, "0")}`;
  }

  /* ======================================================
       LOAD SONG
    ====================================================== */

  function loadSong(index) {
    const song = playlist[index];

    cover.src = song.cover;

    title.textContent = song.title;

    artist.textContent = song.artist;

    year.innerHTML = `<i data-lucide="calendar-days"></i> ${song.year}`;

    genre.innerHTML = `<i data-lucide="music4"></i> ${song.genre}`;

    duration.innerHTML = `<i data-lucide="clock-3"></i> ${format(song.duration)}`;

    totalTime.textContent = format(song.duration);

    currentTime.textContent = "0:00";

    progress.value = 0;

    elapsed = 0;

    loadNotes();

    lucide.createIcons();
  }

  /* ======================================================
       PLAY
    ====================================================== */

  function play() {
    playing = true;

    playButton.innerHTML = `<i data-lucide="pause"></i>`;

    lucide.createIcons();

    clearInterval(timer);

    timer = setInterval(updateProgress, 1000);
  }

  /* ======================================================
       PAUSE
    ====================================================== */

  function pause() {
    playing = false;

    playButton.innerHTML = `<i data-lucide="play"></i>`;

    lucide.createIcons();

    clearInterval(timer);
  }

  /* ======================================================
       UPDATE PROGRESS
    ====================================================== */

  function updateProgress() {
    elapsed++;

    const song = playlist[currentSong];

    if (elapsed >= song.duration) {
      if (repeat) {
        elapsed = 0;
      } else {
        nextSong();

        return;
      }
    }

    currentTime.textContent = format(elapsed);

    progress.value = (elapsed / song.duration) * 100;
  }

  /* ======================================================
       NEXT
    ====================================================== */

  function nextSong() {
    if (shuffle) {
      currentSong = Math.floor(Math.random() * playlist.length);
    } else {
      currentSong++;

      if (currentSong >= playlist.length) {
        currentSong = 0;
      }
    }

    loadSong(currentSong);

    if (playing) play();
  }

  /* ======================================================
       PREVIOUS
    ====================================================== */

  function previousSong() {
    currentSong--;

    if (currentSong < 0) {
      currentSong = playlist.length - 1;
    }

    loadSong(currentSong);

    if (playing) play();
  }

  /* ======================================================
       NOTES
    ====================================================== */

  function noteKey() {
    return "moonbox-note-" + playlist[currentSong].title;
  }

  function loadNotes() {
    notes.value = localStorage.getItem(noteKey()) || "";
  }

  notes.addEventListener("input", () => {
    localStorage.setItem(
      noteKey(),

      notes.value,
    );
  });

  /* ======================================================
       BUTTONS
    ====================================================== */

  playButton.addEventListener("click", () => {
    playing ? pause() : play();
  });

  nextButton.addEventListener("click", nextSong);

  previousButton.addEventListener("click", previousSong);

  shuffleButton.addEventListener("click", () => {
    shuffle = !shuffle;

    shuffleButton.classList.toggle("active", shuffle);
  });

  repeatButton.addEventListener("click", () => {
    repeat = !repeat;

    repeatButton.classList.toggle("active", repeat);
  });

  progress.addEventListener("input", () => {
    const song = playlist[currentSong];

    elapsed = Math.floor((progress.value / 100) * song.duration);

    currentTime.textContent = format(elapsed);
  });

  /* ======================================================
       INIT
    ====================================================== */

  loadSong(currentSong);
});
