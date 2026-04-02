import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDjsVyKEiJGFYjMQcbbDaRUOYJUUIPNOb4",
  authDomain: "daifugoh-fd702.firebaseapp.com",
  projectId: "daifugoh-fd702",
  storageBucket: "daifugoh-fd702.firebasestorage.app",
  messagingSenderId: "239195578542",
  appId: "1:239195578542:web:ba46f2bfa2ca689b428d3f",
  measurementId: "G-NRYLPE7ENN"
};

export const app = initializeApp(firebaseConfig);

export let analytics = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
