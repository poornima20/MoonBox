import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwmB5e7Ombg1wz-PO3PjHbWi0zd60VACU",
  authDomain: "moonbox-b24cf.firebaseapp.com",
  projectId: "moonbox-b24cf",
  storageBucket: "moonbox-b24cf.firebasestorage.app",
  messagingSenderId: "174852906309",
  appId: "1:174852906309:web:c1b6adcaf1e0e15840f22c",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export { app, auth, db };
