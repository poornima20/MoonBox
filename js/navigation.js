/* ==========================================================
   MOON BOX
   navigation.js

   Responsibilities:
   - Resizable Tags / Library panels
   - Nothing else

   Top navigation no longer switches screens.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ======================================================
        ELEMENTS
  ====================================================== */

  const musicWorkspace = document.querySelector(".music-workspace");

  const divider = document.getElementById("workspaceDivider");

  const tagPanel = document.querySelector(".tag-screen");

  const libraryPanel = document.querySelector(".library-screen");

  /* ======================================================
        RESIZE STATE
  ====================================================== */

  let resizingPanels = false;

  /* ======================================================
      MINIMUM PANEL WIDTHS
====================================================== */

  const DESKTOP_TAG_MIN = 350;
  const DESKTOP_LIBRARY_MIN = 420;

  /*
  Tiny-device minimums.

  These are intentionally small because Tags and Library
  must remain visible together even on very narrow screens.
*/
  const TINY_TAG_MIN = 140;
  const TINY_LIBRARY_MIN = 140;

  /* ======================================================
      GET MINIMUM WIDTHS
====================================================== */

  function getPanelMinimums() {
    const isMobile = window.innerWidth <= 768;

    if (!isMobile) {
      return {
        tagMin: DESKTOP_TAG_MIN,
        libraryMin: DESKTOP_LIBRARY_MIN,
      };
    }

    if (!musicWorkspace || !divider) {
      return {
        tagMin: TINY_TAG_MIN,
        libraryMin: TINY_LIBRARY_MIN,
      };
    }

    const workspaceWidth = musicWorkspace.getBoundingClientRect().width;

    const dividerWidth = divider.getBoundingClientRect().width || 8;

    const availableWidth = Math.max(0, workspaceWidth - dividerWidth);

    /*
    Tags gets roughly 42% of the available space
    as its preferred minimum.

    But it is never allowed below 140px.
  */
    let tagMin = Math.max(TINY_TAG_MIN, Math.min(220, availableWidth * 0.42));

    /*
    Library gets the remaining usable space.

    On normal phones this will approach 300px.
    On very tiny devices it is allowed to shrink.
  */
    let libraryMin = Math.max(
      TINY_LIBRARY_MIN,
      Math.min(300, availableWidth - tagMin),
    );

    /*
    Final safety check:
    never demand more width than physically exists.
  */
    if (tagMin + libraryMin > availableWidth) {
      libraryMin = Math.max(TINY_LIBRARY_MIN, availableWidth - tagMin);
    }

    if (tagMin + libraryMin > availableWidth) {
      tagMin = Math.max(TINY_TAG_MIN, availableWidth - libraryMin);
    }

    return {
      tagMin,
      libraryMin,
    };
  }

  /* ======================================================
        RESIZE PANELS
  ====================================================== */

  function resizePanels(clientX) {
    if (!musicWorkspace || !tagPanel || !libraryPanel || !divider) {
      return;
    }

    const workspaceRect = musicWorkspace.getBoundingClientRect();

    const dividerWidth = divider.getBoundingClientRect().width || 8;

    const { tagMin, libraryMin } = getPanelMinimums();

    /*
      Total usable width after removing divider.
    */

    const availableWidth = workspaceRect.width - dividerWidth;

    /*
      Maximum width Tags can have while
      still leaving Library its minimum.
    */

    const maxTagWidth = availableWidth - libraryMin;

    /*
      Mouse / pointer position relative
      to the workspace.
    */

    let newTagWidth = clientX - workspaceRect.left;

    /*
      Enforce minimum Tags width
      and maximum Tags width.
    */

    newTagWidth = Math.max(tagMin, Math.min(newTagWidth, maxTagWidth));

    /*
      Apply width through CSS variable.
    */

    musicWorkspace.style.setProperty("--tags-width", `${newTagWidth}px`);
    /*
  Update Tags layout based on the actual
  width of the Tags panel.
*/
    tagPanel.classList.toggle("narrow-tags", newTagWidth < 400);

    tagPanel.classList.toggle("compact-tags", newTagWidth <= 270);

    tagPanel.classList.toggle("tiny-tags", newTagWidth <= 210);

    tagPanel.classList.toggle("ultra-tiny-tags", newTagWidth <= 165);
  }

  /* ======================================================
        POINTER DOWN
  ====================================================== */

  if (divider) {
    divider.addEventListener("pointerdown", (event) => {
      /*
        Only allow primary mouse button.
      */

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      resizingPanels = true;

      divider.setPointerCapture(event.pointerId);

      document.body.classList.add("workspace-resizing");

      event.preventDefault();
    });

    /* ====================================================
          POINTER MOVE
    ==================================================== */

    divider.addEventListener("pointermove", (event) => {
      if (!resizingPanels) {
        return;
      }

      resizePanels(event.clientX);

      event.preventDefault();
    });

    /* ====================================================
          POINTER UP
    ==================================================== */

    divider.addEventListener("pointerup", (event) => {
      resizingPanels = false;

      if (divider.hasPointerCapture(event.pointerId)) {
        divider.releasePointerCapture(event.pointerId);
      }

      document.body.classList.remove("workspace-resizing");
    });

    /* ====================================================
          POINTER CANCEL
    ==================================================== */

    divider.addEventListener("pointercancel", (event) => {
      resizingPanels = false;

      if (divider.hasPointerCapture(event.pointerId)) {
        divider.releasePointerCapture(event.pointerId);
      }

      document.body.classList.remove("workspace-resizing");
    });
  }

  /* ======================================================
        DEFAULT WIDTH
  ====================================================== */

  if (musicWorkspace) {
    const existingWidth = getComputedStyle(musicWorkspace)
      .getPropertyValue("--tags-width")
      .trim();

    if (!existingWidth) {
      musicWorkspace.style.setProperty("--tags-width", "50%");
    }
  }
});
