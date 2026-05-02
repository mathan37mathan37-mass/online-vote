const firebaseConfig = {
  apiKey: "AIzaSyC9BifKo1Xr6ffGy0cCeHz5kEAxu4qvCoE",
  authDomain: "online-voting-system-3d657.firebaseapp.com",
  projectId: "online-voting-system-3d657",
  storageBucket: "online-voting-system-3d657.appspot.com",
  messagingSenderId: "15198536052",
  appId: "1:15198536052:web:38fb28153f50701ee9ec21"
};

console.log('Firebase config loaded:', firebaseConfig);

// جلوگیری duplicate initialization
if (!firebase.apps.length) {
  console.log('Initializing Firebase app...');
  firebase.initializeApp(firebaseConfig);
} else {
  console.log('Firebase app already initialized');
}

// GLOBAL objects
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

console.log('Firebase services initialized:', { auth, db, storage });