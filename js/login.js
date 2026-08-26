import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/* ==========================================================
   MOONBOX LOGIN / ACCOUNT
   FIREBASE CONNECTED
========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ========================================================
     ELEMENTS
  ======================================================== */

  const accountButton = document.getElementById("moonboxAccountButton");

  const moonboxName = document.getElementById("moonboxName");

  if (!accountButton || !moonboxName) {
    console.warn("MoonBox: account elements not found.");

    return;
  }

  /* ========================================================
     STATE

     Firebase is the source of truth.
  ======================================================== */

  let isLoggedIn = false;

  let currentUser = null;

  let currentProfile = null;

  let accountMenu = null;

  let signupMode = false;

  /* ========================================================
     CREATE LOGIN OVERLAY
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

      <!-- CLOSE -->

      <button
        type="button"
        class="moonbox-account-close"
        id="moonboxAccountClose"
        aria-label="Close"
      >
        <i data-lucide="x"></i>
      </button>


      <!-- HEADER -->

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


      <!-- FORM -->

      <form
        class="moonbox-login-form"
        id="moonboxLoginForm"
        novalidate
      >

        <!-- NAME -->

        <div
          class="moonbox-field moonbox-name-field"
        >

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


        <!-- EMAIL -->

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


        <!-- PASSWORD -->

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


        <!-- SUBMIT -->

        <button
          type="submit"
          class="moonbox-login-submit"
          id="moonboxLoginSubmit"
        >
          Sign In
        </button>


        <!-- MESSAGE -->

        <p
          class="moonbox-login-message"
          id="moonboxLoginMessage"
        ></p>

      </form>


      <!-- SWITCH -->

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
     FORM ELEMENTS
  ======================================================== */

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
     LUCIDE
  ======================================================== */

  function refreshIcons() {
    if (typeof lucide !== "undefined") {
      lucide.createIcons();
    }
  }

  refreshIcons();

  /* ========================================================
     FIRESTORE USER PROFILE
  ======================================================== */

  async function createUserProfile(user, displayName) {
    const userRef = doc(db, "users", user.uid);

    const profile = {
      uid: user.uid,

      email: user.email,

      displayName: displayName,

      moonboxName: `${displayName}'s MoonBox`,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);

    return profile;
  }

  /* ========================================================
     LOAD USER PROFILE
  ======================================================== */

  async function loadUserProfile(user) {
    const userRef = doc(db, "users", user.uid);

    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data();
  }

  /* ========================================================
     AUTH MODE
  ======================================================== */

  function updateAuthMode() {
    form.classList.toggle("signup-mode", signupMode);

    message.textContent = "";

    if (signupMode) {
      title.textContent = "Create your MoonBox";

      subtitle.textContent = "Create an account to sync your music metadata.";

      submitButton.textContent = "Create Account";

      switchText.textContent = "Already have an account?";

      switchButton.textContent = "Sign in";
    } else {
      title.textContent = "Sign in to MoonBox";

      subtitle.textContent = "Sync your MoonBox across devices.";

      submitButton.textContent = "Sign In";

      switchText.textContent = "Don't have an account?";

      switchButton.textContent = "Create account";
    }
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
     SWITCH SIGN IN / SIGN UP
  ======================================================== */

  switchButton.addEventListener("click", () => {
    signupMode = !signupMode;

    updateAuthMode();

    if (signupMode) {
      setTimeout(() => {
        nameInput.focus();
      }, 50);
    } else {
      setTimeout(() => {
        emailInput.focus();
      }, 50);
    }
  });

  /* ========================================================
     SIGN IN / SIGN UP
  ======================================================== */

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();

    const password = passwordInput.value.trim();

    const displayName = nameInput.value.trim();

    /* ----------------------------------------------------
         VALIDATION
      ---------------------------------------------------- */

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

    /* ----------------------------------------------------
         LOADING
      ---------------------------------------------------- */

    submitButton.disabled = true;

    submitButton.textContent = signupMode ? "Creating..." : "Signing in...";

    message.textContent = "";

    try {
      /* ==================================================
           SIGN UP
        ================================================== */

      if (signupMode) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        const user = credential.user;

        /* ----------------------------------------------
             Save display name in Firebase Auth
          ---------------------------------------------- */

        await updateProfile(user, {
          displayName: displayName,
        });

        /* ----------------------------------------------
             Create Firestore user profile
          ---------------------------------------------- */

        await createUserProfile(user, displayName);

        console.log("MoonBox account created:", user.uid);
      } else {

      /* ==================================================
           SIGN IN
        ================================================== */
        const credential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );

        console.log("MoonBox user signed in:", credential.user.uid);
      }

      /*
          Firebase's onAuthStateChanged()
          will update the UI.
        */

      closeLogin();
    } catch (error) {
      console.error("MoonBox authentication error:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          message.textContent = "An account already exists with this email.";

          break;

        case "auth/invalid-email":
          message.textContent = "Please enter a valid email.";

          break;

        case "auth/weak-password":
          message.textContent = "Password must be at least 6 characters.";

          break;

        case "auth/invalid-credential":
          message.textContent = "Incorrect email or password.";

          break;

        case "auth/user-not-found":
          message.textContent = "No account was found with this email.";

          break;

        case "auth/wrong-password":
          message.textContent = "Incorrect email or password.";

          break;

        case "auth/too-many-requests":
          message.textContent = "Too many attempts. Try again later.";

          break;

        case "auth/network-request-failed":
          message.textContent = "Network error. Check your connection.";

          break;

        default:
          message.textContent = "Something went wrong. Please try again.";
      }

      submitButton.textContent = signupMode ? "Create Account" : "Sign In";

      submitButton.disabled = false;
    }
  });

  /* ========================================================
     CLOSE BUTTON
  ======================================================== */

  closeButton.addEventListener("click", closeLogin);

  /* ========================================================
     CLICK OUTSIDE LOGIN
  ======================================================== */

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeLogin();
    }
  });

  /* ========================================================
     ESCAPE
  ======================================================== */

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (overlay.classList.contains("show")) {
      closeLogin();
    }

    closeAccountMenu();
  });

  /* ========================================================
     ACCOUNT MENU
  ======================================================== */

  function createAccountMenu() {
    if (accountMenu) {
      return;
    }

    accountMenu = document.createElement("div");

    accountMenu.className = "moonbox-account-menu";

    accountMenu.innerHTML = `

      <div
        class="moonbox-account-menu-header"
      >

        <strong id="moonboxMenuName">
          MoonBox
        </strong>


        <span id="moonboxMenuEmail">
        </span>

      </div>


      <div
        class="moonbox-account-divider"
      ></div>


      <button
        type="button"
        id="moonboxCloudButton"
      >

        <i data-lucide="cloud"></i>

        <span>
          Cloud Library
        </span>

      </button>


      <button
        type="button"
        id="moonboxAccountSettings"
      >

        <i data-lucide="user-round"></i>

        <span>
          Account
        </span>

      </button>


      <div
        class="moonbox-account-divider"
      ></div>


      <button
        type="button"
        id="moonboxLogoutButton"
      >

        <i data-lucide="log-out"></i>

        <span>
          Log out
        </span>

      </button>

    `;

    /*
      Keep the account menu attached
      to the MoonBox logo.
    */

    accountButton.style.position = "relative";

    accountButton.appendChild(accountMenu);

    refreshIcons();

    /* ======================================================
       LOGOUT
    ====================================================== */

    document
      .getElementById("moonboxLogoutButton")
      .addEventListener("click", async () => {
        try {
          await signOut(auth);

          closeAccountMenu();
        } catch (error) {
          console.error("MoonBox logout error:", error);
        }
      });

    /* ======================================================
       CLOUD LIBRARY
    ====================================================== */

    document
      .getElementById("moonboxCloudButton")
      .addEventListener("click", () => {
        console.log("MoonBox Cloud Library will be connected next.");
      });

    /* ======================================================
       ACCOUNT SETTINGS
    ====================================================== */

    document
      .getElementById("moonboxAccountSettings")
      .addEventListener("click", () => {
        console.log("MoonBox Account Settings will be connected next.");
      });
  }

  /* ========================================================
     OPEN ACCOUNT MENU
  ======================================================== */

  function openAccountMenu() {
    createAccountMenu();

    const menuName = document.getElementById("moonboxMenuName");

    const menuEmail = document.getElementById("moonboxMenuEmail");

    menuName.textContent =
      currentProfile?.moonboxName || currentUser?.displayName || "MoonBox";

    menuEmail.textContent = currentUser?.email || "";

    accountMenu.classList.add("show");
  }

  /* ========================================================
     CLOSE ACCOUNT MENU
  ======================================================== */

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
     FIREBASE AUTH STATE
  ======================================================== */

  onAuthStateChanged(auth, async (user) => {
    /* ====================================================
         LOGGED OUT
      ==================================================== */

    if (!user) {
      isLoggedIn = false;

      currentUser = null;

      currentProfile = null;

      moonboxName.textContent = "MoonBox";

      closeAccountMenu();

      console.log("MoonBox: no user signed in.");

      return;
    }

    /* ====================================================
         LOGGED IN
      ==================================================== */

    isLoggedIn = true;

    currentUser = user;

    try {
      currentProfile = await loadUserProfile(user);

      /* --------------------------------------------------
           Profile missing
        -------------------------------------------------- */

      if (!currentProfile) {
        const displayName =
          user.displayName || user.email?.split("@")[0] || "User";

        currentProfile = await createUserProfile(user, displayName);
      }

      /* --------------------------------------------------
           Update MoonBox title
        -------------------------------------------------- */

      moonboxName.textContent = currentProfile.moonboxName;

      console.log("MoonBox: signed in", currentProfile);
    } catch (error) {
      console.error("MoonBox: profile loading failed", error);

      /*
          Still show a useful name if
          Firestore temporarily fails.
        */

      const fallbackName =
        user.displayName || user.email?.split("@")[0] || "MoonBox";

      moonboxName.textContent =
        fallbackName === "MoonBox" ? "MoonBox" : `${fallbackName}'s MoonBox`;
    }
  });

  /* ========================================================
     INITIAL UI
  ======================================================== */

  moonboxName.textContent = "MoonBox";
});
