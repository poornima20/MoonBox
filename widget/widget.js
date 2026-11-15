(() => {
  /* =====================================
   2. WIDGET STATE
===================================== */

  // Playback information received from the main MoonBox player.
  let isPlaying = false;
  let isShuffle = false;
  let repeatMode = 0;

  let moonboxState = {
    hasActiveSong: false,
    song: null,

    playback: {
      currentTime: 0,
      duration: 0,
      playing: false,
      shuffle: false,
      repeatMode: 0,
    },

    queue: [],
    currentIndex: -1,
  };

  // Tag information received from tag.js.

  let moonboxTags = [];
  let selectedTagIds = new Set();

  /* =====================================
   REQUEST REAL TAG DATA FROM TAG.JS
===================================== */

  function requestWidgetTagState() {
    document.dispatchEvent(
      new CustomEvent("moonbox:requestWidgetTagState", {
        detail: {
          setState(state) {
            moonboxTags = Array.isArray(state.tags) ? state.tags : [];

            selectedTagIds = new Set(
              Array.isArray(state.selectedTagIds)
                ? state.selectedTagIds.map(String)
                : [],
            );

            if (moonboxTags.length === 0) {
              focusedTagIndex = 0;
              tagSegmentsLayer.innerHTML = "";
              return;
            }

            focusedTagIndex = Math.min(focusedTagIndex, moonboxTags.length - 1);

            createTagSegments();
            updateFocusedTag();
          },
        },
      }),
    );
  }

  // Widget-only UI state.

  let tagsMode = false;
  let focusedTagIndex = 0;
  let isDragging = false;

  /* =====================================
   3. GET HTML ELEMENTS
===================================== */

  const songTitle = document.getElementById("songTitle");

  const folderName = document.getElementById("folderName");

  const currentTimeDisplay = document.getElementById("wcurrentTime");

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

  // Configure circular stroke.

  if (!progressFill) {
    console.error("MoonBox Widget: #progressFill was not found.");
  } else {
    progressFill.style.strokeDasharray = CIRCUMFERENCE;
    progressFill.style.strokeDashoffset = CIRCUMFERENCE;
  }

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
    const song = moonboxState.song;

    if (!moonboxState.hasActiveSong || !song) {
      songTitle.textContent = "Your Music";
      folderName.textContent = "Nothing playing";
      durationDisplay.textContent = "0:00";
      currentTimeDisplay.textContent = "0:00";
      return;
    }

    songTitle.textContent = song.title || "Unknown title";

    folderName.textContent = song.folder || "";

    durationDisplay.textContent = formatTime(moonboxState.playback.duration);

    currentTimeDisplay.textContent = formatTime(
      moonboxState.playback.currentTime,
    );
  }

  /* =====================================
   7. UPDATE CIRCULAR PROGRESS
===================================== */

  function updateProgress() {
    const duration = Number(moonboxState.playback.duration) || 0;

    const currentTime = Number(moonboxState.playback.currentTime) || 0;

    const progress =
      duration > 0 ? Math.min(Math.max(currentTime / duration, 0), 1) : 0;

    const offset = CIRCUMFERENCE * (1 - progress);

    progressFill.style.strokeDashoffset = offset;

    const angle = progress * Math.PI * 2;

    const x = CENTER + RADIUS * Math.cos(angle);

    const y = CENTER + RADIUS * Math.sin(angle);

    progressThumb.setAttribute("cx", x);

    progressThumb.setAttribute("cy", y);

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

  function sendPlayerCommand(command, value = null) {
    document.dispatchEvent(
      new CustomEvent("moonbox:widgetCommand", {
        detail: {
          command,
          value,
        },
      }),
    );
  }

  function togglePlayback() {
    sendPlayerCommand("togglePlayback");
  }

  playPauseButton.addEventListener("click", togglePlayback);

  /* =====================================
   11. SEEK USING OUTER CIRCLE
===================================== */

  function seekFromPointer(event) {
    const rect = outerProgress.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = event.clientX - centerX;
    const y = event.clientY - centerY;

    let angle = Math.atan2(y, x);

    let progress = (angle + Math.PI / 2) / (Math.PI * 2);

    progress = (progress + 1) % 1;

    const duration = Number(moonboxState.playback.duration) || 0;

    if (duration <= 0) return;

    const seekTime = progress * duration;

    sendPlayerCommand("seek", seekTime);
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
    sendPlayerCommand("previous");
  }

  document
    .getElementById("previousButton")
    .addEventListener("click", previousSong);

  /* =====================================
   14. NEXT SONG
===================================== */

  function nextSong() {
    sendPlayerCommand("next");
  }

  document.getElementById("nextButton").addEventListener("click", nextSong);
  /* =====================================
   15. SHUFFLE
===================================== */
  shuffleButton.addEventListener("click", () => {
    sendPlayerCommand("toggleShuffle");
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
    sendPlayerCommand("cycleRepeat");
  });

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

  /* Receive selection and tag changes */

  document.addEventListener("moonbox:tagsChanged", () => {
    requestWidgetTagState();
  });

  /* Receive tag creation, editing and deletion */

  [
    "moonbox:tagCreated",
    "moonbox:tagUpdated",
    "moonbox:tagDeleted",
    "moonbox:foldersReady",
    "moonbox:cloudTagsReady",
  ].forEach((eventName) => {
    document.addEventListener(eventName, requestWidgetTagState);
  });

  if (!tagSegmentsLayer) {
    throw new Error("MoonBox: tagSegmentsLayer is missing from widget.html");
  }

  function createTagSegments() {
    tagSegmentsLayer.innerHTML = "";

    const totalTags = moonboxTags.length;

    if (totalTags === 0) return;

    const segmentAngle = (Math.PI * 2) / totalTags;

    const gap = 0.035;

    const outerRadius = 296;
    const innerRadius = 260;

    moonboxTags.forEach((tag, index) => {
      const startAngle = index * segmentAngle + gap / 2;

      const endAngle = (index + 1) * segmentAngle - gap / 2;

      const x1 = CENTER + outerRadius * Math.cos(startAngle);
      const y1 = CENTER + outerRadius * Math.sin(startAngle);

      const x2 = CENTER + outerRadius * Math.cos(endAngle);
      const y2 = CENTER + outerRadius * Math.sin(endAngle);

      const x3 = CENTER + innerRadius * Math.cos(endAngle);
      const y3 = CENTER + innerRadius * Math.sin(endAngle);

      const x4 = CENTER + innerRadius * Math.cos(startAngle);
      const y4 = CENTER + innerRadius * Math.sin(startAngle);

      const pathData = `
      M ${x1} ${y1}
      A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4}
      Z
    `;

      const segment = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );

      segment.setAttribute("d", pathData);
      segment.classList.add("tag-segment");

      segment.dataset.index = index;
      segment.dataset.tagId = String(tag.id);

      segment.setAttribute("role", "button");
      segment.setAttribute("tabindex", "0");

      segment.setAttribute("aria-label", `${tag.name}, ${tag.count} songs`);

      segment.addEventListener("click", () => {
        focusTag(index);
      });

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
    const tag = moonboxTags[focusedTagIndex];

    if (!tag) return;

    selectedTagIcon.innerHTML = `
    <i data-lucide="${tag.icon}" class="center-tag-icon"></i>
  `;

    lucide.createIcons({
      root: selectedTagIcon,
    });

    selectedTagName.textContent = tag.name;

    selectedTagCount.textContent = `${tag.count} ${tag.count === 1 ? "song" : "songs"}`;

    const isSelected = selectedTagIds.has(String(tag.id));

    tagCard.classList.toggle("is-selected", isSelected);

    tagSelectionStatus.textContent = isSelected ? "SELECTED" : "TAP TO SELECT";

    document.querySelectorAll(".tag-segment").forEach((segment) => {
      const tagId = segment.dataset.tagId;

      const selected = selectedTagIds.has(tagId);

      const focused = tagId === String(tag.id);

      segment.classList.toggle("selected", selected);

      segment.classList.toggle("focused", focused);

      segment.setAttribute("aria-pressed", String(selected));
    });
  }

  /* =====================================
   22. FOCUS A TAG
===================================== */

  function focusTag(index) {
    if (moonboxTags.length === 0) return;

    focusedTagIndex = (index + moonboxTags.length) % moonboxTags.length;

    updateFocusedTag();
  }

  /* =====================================
   23. SELECT / DESELECT TAG
===================================== */

  function toggleFocusedTag() {
    const tag = moonboxTags[focusedTagIndex];

    if (!tag) return;

    document.dispatchEvent(
      new CustomEvent("moonbox:toggleTagSelection", {
        detail: {
          tagId: String(tag.id),
        },
      }),
    );
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

  /* ==========================================
   RECEIVE MAIN PLAYER STATE
========================================== */

  document.addEventListener("moonbox:widgetStateChanged", (event) => {
    if (!event.detail) return;

    moonboxState = event.detail;

    renderWidget();
  });

  function renderWidget() {
    const song = moonboxState.song;

    updateSongInformation();

    if (!moonboxState.hasActiveSong || !song) {
      isPlaying = false;
      updatePlayButton();

      progressFill.style.strokeDashoffset = CIRCUMFERENCE;

      progressThumb.setAttribute("cx", CENTER);
      progressThumb.setAttribute("cy", CENTER);

      return;
    }

    isPlaying = moonboxState.playback.playing;

    isShuffle = moonboxState.playback.shuffle;

    repeatMode = moonboxState.playback.repeatMode;

    updatePlayButton();

    updateProgress();

    updateRepeat();

    // Artwork and current-song tags will be connected
    // once we confirm your actual song metadata structure.
  }

  function renderEmptyWidget() {
    songTitle.textContent = "Your Music";

    folderName.textContent = "Nothing playing";

    currentTimeDisplay.textContent = "0:00";

    durationDisplay.textContent = "0:00";
  }

  /* =====================================
   26. MODE BUTTON EVENTS
===================================== */

  tagsButton.addEventListener("click", showTagsMode);

  nowPlayingButton.addEventListener("click", showNowPlayingMode);

  /* =====================================
   17. INITIALIZE WIDGET
===================================== */

  function initializeWidget() {
    lucide.createIcons();

    updateSongInformation();
    updateProgress();
    updatePlayButton();
    updateRepeat();

    requestWidgetTagState();

    console.log("MoonBox Widget Ready");
  }

  initializeWidget();
})(); //error handling for the whole widget code block, so that if any error occurs, it doesn't break the rest of the application.
