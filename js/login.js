/* ==========================================================
   MOONBOX LOGIN / ACCOUNT
   UI ONLY

   Firebase will be connected later.
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ========================================================
     ELEMENTS
  ======================================================== */

  const accountButton = document.getElementById("moonboxAccountButton");

  const moonboxName = document.getElementById("moonboxName");

  if (!accountButton || !moonboxName) {
    console.warn("MoonBox account elements not found.");
    return;
  }

  /* ========================================================
     LOCAL UI STATE

     Temporary only.
     Firebase will replace this later.
  ======================================================== */

  let isLoggedIn = false;

  let currentUser = null;

  /* ========================================================
     CREATE LOGIN UI
  ======================================================== */

  const overlay = document.createElement("div");

  overlay.className = "moonbox-account-overlay";

  overlay.innerHTML = `
    <div
      class="moonbox-account-window"
      role="dialog"
      aria-modal="true"
      aria-labelledby="moonboxAccountTitle"
    >

      <button
        type="button"
        class="moonbox-account-close"
        id="moonboxAccountClose"
        aria-label="Close"
      >
        <i data-lucide="x"></i>
      </button>


      <div class="moonbox-account-header">

        <div class="moonbox-account-logo">
          <img
            src="assets/moonboxlogo.png"
            alt="MoonBox"
          />
        </div>

        <h2 id="moonboxAccountTitle">
          Sign in to MoonBox
        </h2>

        <p id="moonboxAccountSubtitle">
          Sync your MoonBox across devices.
        </p>

      </div>


      <form
        class="moonbox-login-form"
        id="moonboxLoginForm"
        novalidate
      >

        <div class="moonbox-field moonbox-name-field">

          <label for="moonboxDisplayName">
            Name
          </label>

          <input
            id="moonboxDisplayName"
            type="text"
            autocomplete="name"
            placeholder="Your name"
          />

        </div>


        <div class="moonbox-field">

          <label for="moonboxEmail">
            Email
          </label>

          <input
            id="moonboxEmail"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />

        </div>


        <div class="moonbox-field">

          <label for="moonboxPassword">
            Password
          </label>

          <input
            id="moonboxPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Your password"
            required
          />

        </div>


        <button
          type="submit"
          class="moonbox-login-submit"
          id="moonboxLoginSubmit"
        >
          Sign In
        </button>


        <p
          class="moonbox-login-message"
          id="moonboxLoginMessage"
        ></p>

      </form>


      <div class="moonbox-account-switch">

        <span id="moonboxSwitchText">
          Don't have an account?
        </span>

        <button
          type="button"
          id="moonboxSwitchButton"
        >
          Create account
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  /* ========================================================
     ELEMENT REFERENCES
  ======================================================== */

  const windowElement = overlay.querySelector(".moonbox-account-window");

  const closeButton = document.getElementById("moonboxAccountClose");

  const form = document.getElementById("moonboxLoginForm");

  const title = document.getElementById("moonboxAccountTitle");

  const subtitle = document.getElementById("moonboxAccountSubtitle");

  const submitButton = document.getElementById("moonboxLoginSubmit");

  const switchButton = document.getElementById("moonboxSwitchButton");

  const switchText = document.getElementById("moonboxSwitchText");

  const message = document.getElementById("moonboxLoginMessage");

  const nameInput = document.getElementById("moonboxDisplayName");

  const emailInput = document.getElementById("moonboxEmail");

  const passwordInput = document.getElementById("moonboxPassword");

  /* ========================================================
     LUCIDE ICONS
  ======================================================== */

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  /* ========================================================
     LOGIN / SIGNUP MODE
  ======================================================== */

  let signupMode = false;

  function updateAuthMode() {
    form.classList.toggle("signup-mode", signupMode);

    if (signupMode) {
      title.textContent = "Create your MoonBox";

      subtitle.textContent = "Create an account to sync your music metadata.";

      submitButton.textContent = "Create Account";

      switchText.textContent = "Already have an account?";

      switchButton.textContent = "Sign in";

      nameInput.focus();
    } else {
      title.textContent = "Sign in to MoonBox";

      subtitle.textContent = "Sync your MoonBox across devices.";

      submitButton.textContent = "Sign In";

      switchText.textContent = "Don't have an account?";

      switchButton.textContent = "Create account";
    }

    message.textContent = "";

    passwordInput.value = "";
  }

  /* ========================================================
     OPEN LOGIN
  ======================================================== */

  function openLogin() {
    if (isLoggedIn) {
      openAccountMenu();
      return;
    }

    signupMode = false;

    updateAuthMode();

    overlay.classList.add("show");

    setTimeout(() => {
      emailInput.focus();
    }, 150);
  }

  /* ========================================================
     CLOSE LOGIN
  ======================================================== */

  function closeLogin() {
    overlay.classList.remove("show");

    message.textContent = "";

    form.reset();

    signupMode = false;

    updateAuthMode();
  }

  /* ========================================================
     SWITCH LOGIN / SIGNUP
  ======================================================== */

  switchButton.addEventListener("click", () => {
    signupMode = !signupMode;

    updateAuthMode();
  });

  /* ========================================================
     FORM SUBMIT
     
     TEMPORARY DEMO ONLY.
     Firebase will replace this.
  ======================================================== */

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    const password = passwordInput.value.trim();

    const displayName = nameInput.value.trim();

    if (!email) {
      message.textContent = "Enter your email.";

      emailInput.focus();

      return;
    }

    if (!password) {
      message.textContent = "Enter your password.";

      passwordInput.focus();

      return;
    }

    if (signupMode && !displayName) {
      message.textContent = "Enter your name.";

      nameInput.focus();

      return;
    }

    /* ------------------------------------------------------
       TEMPORARY LOCAL LOGIN

       This is only so you can test the UI.
       Firebase will replace this block.
    ------------------------------------------------------ */

    currentUser = {
      email,

      displayName: signupMode ? displayName : email.split("@")[0],

      moonboxName: signupMode
        ? `${displayName}'s MoonBox`
        : `${email.split("@")[0]}'s MoonBox`,
    };

    isLoggedIn = true;

    /* Update header */

    moonboxName.textContent = currentUser.moonboxName;

    closeLogin();

    console.log("Temporary MoonBox login:", currentUser);
  });

  /* ========================================================
     CLOSE BUTTON
  ======================================================== */

  closeButton.addEventListener("click", closeLogin);

  /* ========================================================
     CLICK OUTSIDE
  ======================================================== */

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeLogin();
    }
  });

  /* ========================================================
     ESCAPE KEY
  ======================================================== */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (overlay.classList.contains("show")) {
      closeLogin();
    }
  });

  /* ========================================================
     ACCOUNT MENU
  ======================================================== */

  let accountMenu = null;

  function createAccountMenu() {
    if (accountMenu) {
      return;
    }

    accountMenu = document.createElement("div");

    accountMenu.className = "moonbox-account-menu";

    accountMenu.innerHTML = `

      <div class="moonbox-account-menu-header">

        <strong id="moonboxMenuName">
          MoonBox
        </strong>

        <span id="moonboxMenuEmail">
        </span>

      </div>


      <div class="moonbox-account-divider"></div>


      <button
        type="button"
        id="moonboxCloudButton"
      >
        <i data-lucide="cloud"></i>
        <span>Cloud Library</span>
      </button>


      <button
        type="button"
        id="moonboxAccountSettings"
      >
        <i data-lucide="user-round"></i>
        <span>Account</span>
      </button>


      <div class="moonbox-account-divider"></div>


      <button
        type="button"
        id="moonboxLogoutButton"
      >
        <i data-lucide="log-out"></i>
        <span>Log out</span>
      </button>

    `;

    /*
      Put the menu around the logo area.
      We make the logo container the positioning context.
    */

    accountButton.style.position = "relative";

    accountButton.appendChild(accountMenu);

    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }

    /* Logout */

    document
      .getElementById("moonboxLogoutButton")
      .addEventListener("click", () => {
        isLoggedIn = false;

        currentUser = null;

        moonboxName.textContent = "MoonBox";

        closeAccountMenu();
      });

    /* Temporary buttons */

    document
      .getElementById("moonboxCloudButton")
      .addEventListener("click", () => {
        console.log("Cloud Library will be connected later.");
      });

    document
      .getElementById("moonboxAccountSettings")
      .addEventListener("click", () => {
        console.log("Account settings will be connected later.");
      });
  }

  function openAccountMenu() {
    createAccountMenu();

    const menuName = document.getElementById("moonboxMenuName");

    const menuEmail = document.getElementById("moonboxMenuEmail");

    menuName.textContent = currentUser?.moonboxName || "MoonBox";

    menuEmail.textContent = currentUser?.email || "";

    accountMenu.classList.add("show");
  }

  function closeAccountMenu() {
    if (!accountMenu) {
      return;
    }

    accountMenu.classList.remove("show");
  }

  /* ========================================================
     HEADER CLICK
  ======================================================== */

  accountButton.addEventListener("click", (event) => {
    event.stopPropagation();

    if (isLoggedIn) {
      if (accountMenu && accountMenu.classList.contains("show")) {
        closeAccountMenu();
      } else {
        openAccountMenu();
      }

      return;
    }

    openLogin();
  });

  /* ========================================================
     CLOSE ACCOUNT MENU OUTSIDE
  ======================================================== */

  document.addEventListener("click", (event) => {
    if (!accountMenu) {
      return;
    }

    if (!accountButton.contains(event.target)) {
      closeAccountMenu();
    }
  });

  /* ========================================================
     INITIAL STATE
  ======================================================== */

  moonboxName.textContent = "MoonBox";
});
