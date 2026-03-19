import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const loginForm = document.getElementById("adminLoginForm");
const errorMessage = document.getElementById("errorMessage");
const loginBtn = document.getElementById("loginBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const employee_id = document.getElementById("employee_id").value.trim();
  const password = document.getElementById("password").value;

  const firebaseEmail = `${employee_id}@admin.library.com`;

  loginBtn.disabled = true;
  loginBtn.innerText = "Logging in...";
  errorMessage.classList.add("d-none");

  try {
    await signInWithEmailAndPassword(auth, firebaseEmail, password);
    
    window.location.href = "admin_dashboard.html"; 

  } catch (error) {
    errorMessage.innerText = "Invalid Employee ID or Password.";
    errorMessage.classList.remove("d-none");
    
    loginBtn.disabled = false;
    loginBtn.innerText = "Login (Admin)";
  }
});