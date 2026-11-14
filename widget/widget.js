/* =====================================
   1. DEMO SONG DATA
===================================== */

const demoSongs = [
  {
    title: "Yosemite",
    folder: "English Songs",
    duration: 194,
  },
  {
    title: "Starboy",
    folder: "English Songs",
    duration: 230,
  },
  {
    title: "Love Scenario",
    folder: "Korean Songs",
    duration: 207,
  },
];

/* =====================================
   2. PLAYER STATE
===================================== */

let currentSongIndex = 0;

let currentTime = 22;

let isPlaying = true;

let isShuffle = false;

let repeatMode = 0;

// 0 = Repeat off
// 1 = Repeat queue
// 2 = Repeat one

let playbackInterval = null;

let isDragging = false;

/* =====================================
   3. GET HTML ELEMENTS
===================================== */

const songTitle = document.getElementById("songTitle");

const folderName = document.getElementById("folderName");

const currentTimeDisplay = document.getElementById("currentTime");

const durationDisplay = document.getElementById("duration");

const progressFill = document.getElementById("progressFill");

const progressThumb = document.getElementById("progressThumb");

const outerProgress = document.getElementById("outerProgress");

const playPauseButton = document.getElementById("playPauseButton");

const playPauseIcon = document.getElementById("playPauseIcon");

const shuffleButton = document.getElementById("shuffleButton");

const repeatButton = document.getElementById("repeatButton");

const repeatIcon = document.getElementById("repeatIcon");

/* =====================================
   4. CIRCULAR PROGRESS SETTINGS
===================================== */

const RADIUS = 296;

const CENTER = 300;

const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Configure circular stroke.

progressFill.style.strokeDasharray = CIRCUMFERENCE;

progressFill.style.strokeDashoffset = CIRCUMFERENCE;

/* =====================================
   5. FORMAT TIME
===================================== */

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/* =====================================
   6. UPDATE SONG INFORMATION
===================================== */

function updateSongInformation() {
  const song = demoSongs[currentSongIndex];

  songTitle.textContent = song.title;

  folderName.textContent = song.folder;

  durationDisplay.textContent = formatTime(song.duration);

  currentTimeDisplay.textContent = formatTime(currentTime);
}

/* =====================================
   UPDATE CIRCULAR PROGRESS
===================================== */

function updateProgress() {
  const song = demoSongs[currentSongIndex];

  const progress = Math.min(currentTime / song.duration, 1);

  // Update progress line

  const offset = CIRCUMFERENCE * (1 - progress);

  progressFill.style.strokeDashoffset = offset;

  // Calculate progress ball position

  // IMPORTANT:
  // The SVG itself is rotated -90 degrees.
  // Therefore, calculate the ball position
  // in the SVG's original coordinate system.

  const angle = progress * Math.PI * 2;

  const x = CENTER + RADIUS * Math.cos(angle);

  const y = CENTER + RADIUS * Math.sin(angle);

  // Apply ball position

  progressThumb.setAttribute("cx", x);

  progressThumb.setAttribute("cy", y);

  // Update current playback time

  currentTimeDisplay.textContent = formatTime(currentTime);
}

/* =====================================
   8. UPDATE PLAY / PAUSE BUTTON
===================================== */

function updatePlayButton() {
  playPauseIcon.innerHTML = `
    <i
      data-lucide="${isPlaying ? "pause" : "play"}"
      class="play-icon"
    ></i>
  `;

  playPauseButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");

  lucide.createIcons({
    root: playPauseIcon,
  });
}

/* =====================================
   9. PLAY / PAUSE
===================================== */

function togglePlayback() {
  isPlaying = !isPlaying;

  updatePlayButton();
}

playPauseButton.addEventListener("click", togglePlayback);

/* =====================================
   10. PLAYBACK SIMULATION
===================================== */

function startPlaybackSimulation() {
  clearInterval(playbackInterval);

  playbackInterval = setInterval(() => {
    if (!isPlaying || isDragging) return;

    const song = demoSongs[currentSongIndex];

    currentTime++;

    if (currentTime >= song.duration) {
      if (repeatMode === 2) {
        currentTime = 0;
      } else if (currentSongIndex < demoSongs.length - 1) {
        nextSong();
      } else if (repeatMode === 1) {
        currentSongIndex = 0;

        currentTime = 0;

        updateSongInformation();
      } else {
        currentTime = song.duration;

        isPlaying = false;

        updatePlayButton();
      }
    }

    updateProgress();
  }, 1000);
}

/* =====================================
   11. SEEK USING OUTER CIRCLE
===================================== */

function seekFromPointer(event) {
  const rect = outerProgress.getBoundingClientRect();

  const centerX = rect.left + rect.width / 2;

  const centerY = rect.top + rect.height / 2;

  const x = event.clientX - centerX;

  const y = event.clientY - centerY;

  // Find angle from the centre.

  let angle = Math.atan2(y, x);

  // Adjust so 0 starts at the top.

  let progress = (angle + Math.PI / 2) / (Math.PI * 2);

  progress = (progress + 1) % 1;

  const song = demoSongs[currentSongIndex];

  currentTime = progress * song.duration;

  updateProgress();
}

/* =====================================
   BUTTON SELECTED STATE
===================================== */

const nowPlayingButton = document.getElementById("nowPlayingButton");

const tagsButton = document.getElementById("tagsButton");

function setActiveMode(activeButton) {
  [nowPlayingButton, tagsButton].forEach((button) => {
    const selected = button === activeButton;

    button.classList.toggle("is-selected", selected);

    button.setAttribute("aria-pressed", String(selected));
  });
}

/* =====================================
   12. DRAG AND CLICK EVENTS
===================================== */

outerProgress.addEventListener("pointerdown", (event) => {
  if (tagsMode) return;
  isDragging = true;

  outerProgress.setPointerCapture(event.pointerId);

  seekFromPointer(event);
});

outerProgress.addEventListener("pointermove", (event) => {
  if (tagsMode || !isDragging) return;
  if (!isDragging) return;

  seekFromPointer(event);
});

outerProgress.addEventListener("pointerup", () => {
  isDragging = false;
});

outerProgress.addEventListener("pointercancel", () => {
  isDragging = false;
});

/* =====================================
   13. PREVIOUS SONG
===================================== */

function previousSong() {
  currentSongIndex--;

  if (currentSongIndex < 0) {
    currentSongIndex = demoSongs.length - 1;
  }

  currentTime = 0;

  isPlaying = true;

  updateSongInformation();

  updateProgress();

  updatePlayButton();
}

document
  .getElementById("previousButton")
  .addEventListener("click", previousSong);

/* =====================================
   14. NEXT SONG
===================================== */

function nextSong() {
  if (isShuffle) {
    let nextIndex;

    do {
      nextIndex = Math.floor(Math.random() * demoSongs.length);
    } while (demoSongs.length > 1 && nextIndex === currentSongIndex);

    currentSongIndex = nextIndex;
  } else {
    currentSongIndex++;

    if (currentSongIndex >= demoSongs.length) {
      currentSongIndex = repeatMode === 1 ? 0 : demoSongs.length - 1;
    }
  }

  currentTime = 0;

  isPlaying = true;

  updateSongInformation();

  updateProgress();

  updatePlayButton();
}

document.getElementById("nextButton").addEventListener("click", nextSong);

/* =====================================
   15. SHUFFLE
===================================== */

shuffleButton.addEventListener("click", () => {
  isShuffle = !isShuffle;

  shuffleButton.classList.toggle("selected", isShuffle);
});

/* =====================================
   16. REPEAT
===================================== */

function updateRepeat() {
  const iconName = repeatMode === 2 ? "repeat-1" : "repeat";

  repeatIcon.innerHTML = `
    <i data-lucide="${iconName}" class="control-icon"></i>
  `;

  repeatButton.classList.toggle("selected", repeatMode !== 0);

  repeatButton.setAttribute(
    "aria-label",
    ["Repeat off", "Repeat queue", "Repeat one"][repeatMode],
  );

  lucide.createIcons({
    root: repeatIcon,
  });
}

repeatButton.addEventListener("click", () => {
  repeatMode = (repeatMode + 1) % 3;

  updateRepeat();
});

/* =====================================
   18. MOONBOX TAG DATA
===================================== */

// Frontend demo data.
// Later we will replace this with MoonBox data.

const demoTags = [
  { name: "Chill", count: 42, icon: "moon" },
  { name: "Workout", count: 28, icon: "zap" },
  { name: "Romantic", count: 35, icon: "heart" },
  { name: "Focus", count: 19, icon: "brain" },
  { name: "Party", count: 56, icon: "party-popper" },
  { name: "Sad", count: 23, icon: "cloud-rain" },
  { name: "Favorites", count: 64, icon: "star" },
];

let tagsMode = false;

let focusedTagIndex = 0;

// Multiple tags can be selected simultaneously.

const selectedTags = new Set();

/* =====================================
   19. TAG ELEMENTS
===================================== */

const mainCircle = document.getElementById("mainCircle");

const progressLayer = document.getElementById("progressLayer");

const tagSegmentsLayer = document.getElementById("tagSegmentsLayer");

const musicSection = document.querySelector(".music-section");

const tagsSection = document.getElementById("tagsSection");

const tagCard = document.getElementById("selectedTagCard");

const selectedTagIcon = document.getElementById("selectedTagIcon");

const selectedTagName = document.getElementById("selectedTagName");

const selectedTagCount = document.getElementById("selectedTagCount");

const tagSelectionStatus = document.getElementById("tagSelectionStatus");

const tagModeNavigation = document.getElementById("tagModeNavigation");

const previousTagButton = document.getElementById("previousTagButton");

const nextTagButton = document.getElementById("nextTagButton");

if (!tagSegmentsLayer) {
  throw new Error("MoonBox: tagSegmentsLayer is missing from widget.html");
}

function createTagSegments() {
  tagSegmentsLayer.innerHTML = "";

  const totalTags = demoTags.length;

  const segmentAngle = (Math.PI * 2) / totalTags;

  // Space between segments
  const gap = 0.035;

  // Outer and inner radius
  const outerRadius = 296;

  const innerRadius = 260;

  demoTags.forEach((tag, index) => {
    const startAngle = index * segmentAngle + gap / 2;

    const endAngle = (index + 1) * segmentAngle - gap / 2;

    // Outer starting point

    const x1 = CENTER + outerRadius * Math.cos(startAngle);

    const y1 = CENTER + outerRadius * Math.sin(startAngle);

    // Outer ending point

    const x2 = CENTER + outerRadius * Math.cos(endAngle);

    const y2 = CENTER + outerRadius * Math.sin(endAngle);

    // Inner ending point

    const x3 = CENTER + innerRadius * Math.cos(endAngle);

    const y3 = CENTER + innerRadius * Math.sin(endAngle);

    // Inner starting point

    const x4 = CENTER + innerRadius * Math.cos(startAngle);

    const y4 = CENTER + innerRadius * Math.sin(startAngle);

    // Create circular segment

    const pathData = `
            M ${x1} ${y1}

            A ${outerRadius} ${outerRadius}
            0 0 1 ${x2} ${y2}

            L ${x3} ${y3}

            A ${innerRadius} ${innerRadius}
            0 0 0 ${x4} ${y4}

            Z
        `;

    const segment = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );

    segment.setAttribute("d", pathData);

    segment.classList.add("tag-segment");

    segment.dataset.index = index;

    segment.setAttribute("role", "button");

    segment.setAttribute("tabindex", "0");

    segment.setAttribute("aria-label", `${tag.name}, ${tag.count} songs`);

    // Click to display tag in centre

    segment.addEventListener("click", () => {
      focusTag(index);
    });

    // Keyboard support

    segment.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();

        focusTag(index);
      }
    });

    tagSegmentsLayer.appendChild(segment);
  });
}

function updateFocusedTag() {
  const tag = demoTags[focusedTagIndex];

  // Update central tag information

  selectedTagIcon.innerHTML = `
  <i data-lucide="${tag.icon}" class="center-tag-icon"></i>
`;

  lucide.createIcons({
    root: selectedTagIcon,
  });

  selectedTagName.textContent = tag.name;

  selectedTagCount.textContent = `${tag.count} songs`;

  // Check whether current tag is selected

  const isSelected = selectedTags.has(focusedTagIndex);

  tagCard.classList.toggle("is-selected", isSelected);

  tagSelectionStatus.textContent = isSelected ? "SELECTED" : "TAP TO SELECT";

  // Update all circumference segments

  document.querySelectorAll(".tag-segment").forEach((segment) => {
    const index = Number(segment.dataset.index);

    const selected = selectedTags.has(index);

    const focused = index === focusedTagIndex;

    segment.classList.toggle("selected", selected);

    segment.classList.toggle("focused", focused);

    segment.setAttribute("aria-pressed", String(selected));
  });
}
/* =====================================
   22. FOCUS A TAG
===================================== */

function focusTag(index) {
  focusedTagIndex = (index + demoTags.length) % demoTags.length;

  updateFocusedTag();
}

/* =====================================
   23. SELECT / DESELECT TAG
===================================== */

function toggleFocusedTag() {
  if (selectedTags.has(focusedTagIndex)) {
    selectedTags.delete(focusedTagIndex);
  } else {
    selectedTags.add(focusedTagIndex);
  }

  updateFocusedTag();
}

// Click central tag.

tagCard.addEventListener("click", toggleFocusedTag);

// Keyboard selection.

tagCard.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();

    toggleFocusedTag();
  }
});

/* =====================================
   24. PREVIOUS / NEXT TAG
===================================== */

previousTagButton.addEventListener("click", () => {
  focusTag(focusedTagIndex - 1);
});

nextTagButton.addEventListener("click", () => {
  focusTag(focusedTagIndex + 1);
});

/* =====================================
   25. SWITCH BETWEEN MODES
===================================== */

function showTagsMode() {
  tagsMode = true;

  mainCircle.classList.add("tags-mode");

  // Hide music player.

  musicSection.hidden = true;

  // Show tag navigator.

  tagsSection.hidden = false;

  // Change bottom navigation.

  tagsButton.hidden = true;

  tagModeNavigation.hidden = false;

  // Keep Now Playing as the return button.

  nowPlayingButton.classList.add("is-selected");

  nowPlayingButton.setAttribute("aria-pressed", "true");

  updateFocusedTag();
}

function showNowPlayingMode() {
  tagsMode = false;

  mainCircle.classList.remove("tags-mode");

  // Restore music player.

  musicSection.hidden = false;

  // Hide tag navigator.

  tagsSection.hidden = true;

  // Restore bottom Tags pill.

  tagsButton.hidden = false;

  tagModeNavigation.hidden = true;

  nowPlayingButton.classList.remove("is-selected");

  nowPlayingButton.setAttribute("aria-pressed", "false");
}

/* =====================================
   26. MODE BUTTON EVENTS
===================================== */

tagsButton.addEventListener("click", showTagsMode);

nowPlayingButton.addEventListener("click", showNowPlayingMode);

/* =====================================
   27. INITIALIZE TAG NAVIGATOR
===================================== */

createTagSegments();

updateFocusedTag();

/* =====================================
   17. INITIALIZE WIDGET
===================================== */

function initializeWidget() {
  lucide.createIcons();
  updateSongInformation();

  updateProgress();

  updatePlayButton();

  updateRepeat();

  startPlaybackSimulation();

  console.log("MoonBox Now Playing Widget Ready");
}

initializeWidget();
