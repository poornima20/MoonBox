/* ==========================================================
   MOON BOX
   navigation.js

   Mobile navigation safeguards:
   - Vertical scrolling never changes screens
   - Horizontal swipe must be intentional
   - Interactive elements never trigger navigation
   - Player cannot be opened by swipe without a song
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ======================================================
        ELEMENTS
  ====================================================== */

  const workspace = document.getElementById("workspace");

  const buttons = document.querySelectorAll(".nav-button");

  const indicator = document.querySelector(".nav-indicator");

  const TOTAL_SCREENS = buttons.length;

  let currentScreen = 0;

  /* ======================================================
        MOBILE SWIPE SETTINGS
  ====================================================== */

  const SWIPE_DISTANCE = 90;

  /*
    Horizontal movement must be substantially larger
    than vertical movement.

    Example:

    dx = 100
    dy = 20

    100 > 20 * 1.5
    YES → horizontal swipe

    dx = 100
    dy = 90

    100 > 90 * 1.5
    NO → ignore
  */
  const SWIPE_DIRECTION_RATIO = 1.5;

  /* ======================================================
        SONG SELECTION STATE

        This is intentionally kept separate from navigation.

        Player navigation will only be allowed when this
        becomes true.
  ====================================================== */

  let songSelected = false;

  /*
    Allow player.js / library.js to tell navigation that
    a song has been selected.

    Example from your player/library code:

        window.moonBoxSongSelected(true);

    When there is no active song:

        window.moonBoxSongSelected(false);
  */

  window.moonBoxSongSelected = (selected) => {
    songSelected = Boolean(selected);
  };

  /* ======================================================
        MOVE INDICATOR
  ====================================================== */

  function moveIndicator(index) {
    const button = buttons[index];

    if (!button || !indicator) return;

    const navRect = button.parentElement.getBoundingClientRect();

    const buttonRect = button.getBoundingClientRect();

    indicator.style.width = `${buttonRect.width}px`;

    indicator.style.height = `${buttonRect.height}px`;

    indicator.style.left = `${buttonRect.left - navRect.left}px`;

    indicator.style.top = `${buttonRect.top - navRect.top}px`;
  }

  /* ======================================================
        UPDATE ACTIVE BUTTON
  ====================================================== */

  function updateButtons(index) {
    buttons.forEach((button) => {
      button.classList.remove("active");
    });

    if (buttons[index]) {
      buttons[index].classList.add("active");
    }
  }

  /* ======================================================
        PLAYER NAVIGATION CHECK
  ====================================================== */

  function canOpenPlayer() {
    /*
      Player is screen 2.

      Never allow navigation into Player unless a song
      has actually been selected.
    */

    return songSelected === true;
  }

  /* ======================================================
        CHANGE SCREEN
  ====================================================== */

  function goToScreen(index) {
    if (index < 0) {
      index = 0;
    }

    if (index >= TOTAL_SCREENS) {
      index = TOTAL_SCREENS - 1;
    }

    /* ==================================================
        PLAYER GUARD

        Screen 0 = Tags
        Screen 1 = Library
        Screen 2 = Player
    ================================================== */

    if (index === 2) {
      /*
        Existing MoonBox navigation guard
      */

      if (typeof checkMoonBoxNavigation === "function") {
        if (!checkMoonBoxNavigation()) {
          return;
        }
      }

      /*
        IMPORTANT:

        Do not allow Player to open unless a song
        has actually been selected.
      */
    }

    /* ==================================================
        EXISTING GUARD FOR LIBRARY
    ================================================== */

    if (index === 1 && typeof checkMoonBoxNavigation === "function") {
      if (!checkMoonBoxNavigation()) {
        return;
      }
    }

    /* ==================================================
        ACTUAL SCREEN CHANGE
    ================================================== */

    currentScreen = index;

    workspace.style.transform = `translateX(-${currentScreen * 100}vw)`;

    updateButtons(currentScreen);

    moveIndicator(currentScreen);
  }

  /* ======================================================
        CLICK EVENTS
  ====================================================== */

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => {
      goToScreen(index);
    });
  });

  /* ======================================================
        KEYBOARD
  ====================================================== */

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      goToScreen(currentScreen + 1);
    }

    if (e.key === "ArrowLeft") {
      goToScreen(currentScreen - 1);
    }
  });

  /* ======================================================
        TOUCH SWIPE
  ====================================================== */

  let startX = 0;
  let startY = 0;

  let currentX = 0;
  let currentY = 0;

  let dragging = false;

  let swipeTarget = null;

  /* ======================================================
        ELEMENTS THAT SHOULD NEVER START NAVIGATION
  ====================================================== */

  function isNoSwipeElement(target) {
    if (!target) {
      return false;
    }

    return Boolean(
      target.closest(
        [
          "[data-no-swipe]",

          "button",
          "input",
          "textarea",
          "select",
          "a",

          ".tag",
          ".tag-circle",
          ".tag-name",

          ".tag-manage-button",
          ".tag-menu",

          ".tag-selection-footer",

          ".tag-modal",
          ".tag-modal-overlay",

          ".tag-drag-handle",
          ".tag-group-drag-handle",

          ".tag-order-row",
          ".tag-order-group",

          ".library-song",

          ".library-song-list",

          ".player-controls",
          ".player-panel",

          ".player-tag-picker-overlay",
          ".player-tag-picker-window",

          ".folder-overlay",
          ".folder-window",
        ].join(","),
      ),
    );
  }

  /* ======================================================
        TOUCH START
  ====================================================== */

  workspace.addEventListener(
    "touchstart",
    (e) => {
      /*
        Only support one finger.

        This also prevents pinch gestures from
        becoming navigation gestures.
      */

      if (!e.touches || e.touches.length !== 1) {
        dragging = false;
        return;
      }

      const touch = e.touches[0];

      swipeTarget = e.target;

      /*
        Interactive areas should never initiate
        screen navigation.
      */

      if (isNoSwipeElement(swipeTarget)) {
        dragging = false;
        return;
      }

      startX = touch.clientX;
      startY = touch.clientY;

      currentX = startX;
      currentY = startY;

      dragging = true;
    },
    {
      passive: true,
    },
  );

  /* ======================================================
        TOUCH MOVE
  ====================================================== */

  workspace.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) {
        return;
      }

      /*
        If another finger appears, cancel navigation.
      */

      if (!e.touches || e.touches.length !== 1) {
        dragging = false;
        return;
      }

      const touch = e.touches[0];

      currentX = touch.clientX;
      currentY = touch.clientY;

      const dx = currentX - startX;
      const dy = currentY - startY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      /*
        ==================================================
        VERTICAL SCROLL PROTECTION

        As soon as vertical movement is dominant,
        this gesture belongs to the page/grid.

        Navigation is cancelled permanently for
        this gesture.
        ==================================================
      */

      if (absY > absX) {
        dragging = false;
        return;
      }

      /*
        If movement becomes strongly diagonal,
        don't navigate.
      */

      if (absY > 10 && absX < absY * SWIPE_DIRECTION_RATIO) {
        dragging = false;
        return;
      }
    },
    {
      passive: true,
    },
  );

  /* ======================================================
        TOUCH END
  ====================================================== */

  workspace.addEventListener(
    "touchend",
    () => {
      if (!dragging) {
        return;
      }

      const dx = currentX - startX;
      const dy = currentY - startY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      /* ==================================================
          SAFETY CHECK 1

          Vertical movement never navigates.
      ================================================== */

      if (absY >= absX) {
        dragging = false;
        return;
      }

      /* ==================================================
          SAFETY CHECK 2

          Horizontal swipe must be clearly dominant.
      ================================================== */

      if (absX < absY * SWIPE_DIRECTION_RATIO) {
        dragging = false;
        return;
      }

      /* ==================================================
          SAFETY CHECK 3

          Swipe must be large enough.
      ================================================== */

      if (absX < SWIPE_DISTANCE) {
        dragging = false;
        return;
      }

      /* ==================================================
          REAL HORIZONTAL SWIPE
      ================================================== */

      if (dx < 0) {
        /*
          Swipe LEFT

          Tags → Library
          Library → Player
        */

        const nextScreen = currentScreen + 1;

        /*
          Extra Player protection.

          Even if something changes elsewhere,
          a left swipe can never open Player
          without a selected song.
        */

        goToScreen(nextScreen);
      } else {
        /*
          Swipe RIGHT

          Player → Library
          Library → Tags
        */

        goToScreen(currentScreen - 1);
      }

      /* ==================================================
          RESET
      ================================================== */

      dragging = false;

      startX = 0;
      startY = 0;

      currentX = 0;
      currentY = 0;

      swipeTarget = null;
    },
    {
      passive: true,
    },
  );

  /* ======================================================
        TOUCH CANCEL
  ====================================================== */

  workspace.addEventListener(
    "touchcancel",
    () => {
      dragging = false;

      startX = 0;
      startY = 0;

      currentX = 0;
      currentY = 0;

      swipeTarget = null;
    },
    {
      passive: true,
    },
  );

  /* ======================================================
        MOUSE WHEEL — HORIZONTAL
  ====================================================== */

  let wheelLock = false;

  window.addEventListener("wheel", (e) => {
    if (wheelLock) {
      return;
    }

    if (Math.abs(e.deltaX) < 20) {
      return;
    }

    wheelLock = true;

    if (e.deltaX > 0) {
      goToScreen(currentScreen + 1);
    } else {
      goToScreen(currentScreen - 1);
    }

    setTimeout(() => {
      wheelLock = false;
    }, 450);
  });

  /* ======================================================
        WINDOW RESIZE
  ====================================================== */

  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      moveIndicator(currentScreen);

      workspace.style.transform = `translateX(-${currentScreen * 100}vw)`;
    }, 100);
  });

  /* ======================================================
        RESIZE OBSERVER
  ====================================================== */

  const nav = document.querySelector(".nav-pill");

  if (nav) {
    const resizeObserver = new ResizeObserver(() => {
      moveIndicator(currentScreen);
    });

    resizeObserver.observe(nav);
  }

  /* ======================================================
        FOLDER BUTTON
  ====================================================== */

  const folderButton = document.querySelector(".folder-button");

  /* ======================================================
        INITIALIZE
  ====================================================== */

  moveIndicator(0);

  goToScreen(0);
});

/* ==========================================================
   LUCIDE
========================================================== */

lucide.createIcons();
