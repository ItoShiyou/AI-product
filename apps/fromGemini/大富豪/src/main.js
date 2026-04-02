import { app } from "./firebase.js";

const appRoot = document.getElementById("app");

if (appRoot) {
  appRoot.textContent = `Firebase initialized: ${app.name}`;
}
