/* dDAE Config - 1.020 (LOCAL) */
const API_BASE_URL = ""; // LOCAL build: nessuna dipendenza Google
const API_KEY = "daedalium2026";
// Tassa di soggiorno: € per persona (>10 anni) per notte
// Imposta qui la tariffa corretta per la tua struttura/comune.
const TOURIST_TAX_EUR_PPN = 1.5;

// Ridotti (es. anziani): moltiplicatore sull'importo (0.5 = -50%). Per ora non usato se non c'è il campo.
const TOURIST_TAX_REDUCED_FACTOR = 0.5;

// Firebase (Firestore-only) bridge
const FIREBASE_ENABLED = true;
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDYG-TqrzfN5kDUH9GYWmYbqnwoqEnWMkM",
  authDomain: "ddae-sync.firebaseapp.com",
  projectId: "ddae-sync",
  storageBucket: "ddae-sync.firebasestorage.app",
  messagingSenderId: "460884105746",
  appId: "1:460884105746:web:29e06fc11d43c78bdd96cb",
  measurementId: "G-Q2BXTMGR96"
};
