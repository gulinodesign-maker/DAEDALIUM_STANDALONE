/* dDAE_3.248 - Firebase frontend config + endpoint traduzione opzionale */
const DDAE_LICENSE_PAYMENT_URL = "";

// Endpoint di traduzione opzionale usato solo come fallback durante il salvataggio delle traduzioni.
// Se la funzione serverless viene distribuita insieme al progetto, lasciare vuoto usa ./api/translate.
// Se resta su dominio esterno (es. Vercel), inserire qui l'URL HTTPS completo.
window.DDAE_OPENAI_TRANSLATE_ENDPOINT = "https://daedalium-translate-api.vercel.app/api/translate";
window.DDAE_TRANSLATE_API_URL = window.DDAE_OPENAI_TRANSLATE_ENDPOINT;
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
