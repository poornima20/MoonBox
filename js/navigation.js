/* ==========================================================
   MOON BOX
   navigation.js
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
        MOVE INDICATOR
    ====================================================== */

  function moveIndicator(index) {
    const button = buttons[index];
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

    buttons[index].classList.add("active");
  }

  /* ======================================================
        CHANGE SCREEN
    ====================================================== */

  function goToScreen(index) {
    if (index < 0) index = 0;

    if (index >= TOTAL_SCREENS) index = TOTAL_SCREENS - 1;

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

  let currentX = 0;

  let dragging = false;

  workspace.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;

      dragging = true;
    },
    { passive: true },
  );

  workspace.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;

      currentX = e.touches[0].clientX;
    },
    { passive: true },
  );

  workspace.addEventListener("touchend", () => {
    if (!dragging) return;

    const distance = currentX - startX;

    if (Math.abs(distance) > 80) {
      if (distance < 0) {
        goToScreen(currentScreen + 1);
      } else {
        goToScreen(currentScreen - 1);
      }
    }

    dragging = false;

    startX = 0;

    currentX = 0;
  });

  /* ======================================================
        MOUSE WHEEL (Horizontal)
    ====================================================== */

  let wheelLock = false;

  window.addEventListener("wheel", (e) => {
    if (wheelLock) return;

    if (Math.abs(e.deltaX) < 20) return;

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

  const resizeObserver = new ResizeObserver(() => {
    moveIndicator(currentScreen);
  });

  resizeObserver.observe(nav);
  /* ======================================================
        FOLDER BUTTON
    ====================================================== */

  const folderButton = document.querySelector(".folder-button");

  folderButton.addEventListener("click", () => {
    alert("Folder picker will be implemented later.");
  });

  /* ======================================================
        INITIALIZE
    ====================================================== */

  moveIndicator(0);

  goToScreen(0);
});

lucide.createIcons();
