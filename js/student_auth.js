import { auth } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const loginForm = document.getElementById("studentLoginForm");
const errorMessage = document.getElementById("errorMessage");
const loginBtn = document.getElementById("loginBtn");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rollNo = document.getElementById("rollNo").value.trim();
  const password = document.getElementById("password").value;

  // The Invisible Domain Trick
  const firebaseEmail = `${rollNo}@student.library.com`;

  loginBtn.disabled = true;
  loginBtn.innerText = "Logging in...";
  errorMessage.classList.add("d-none");

  try {
    await signInWithEmailAndPassword(auth, firebaseEmail, password);
    
    window.location.href = "/student_dashboard.html"; 

  } catch (error) {
   
    errorMessage.innerText = "Invalid Roll Number or Password.";
    errorMessage.classList.remove("d-none");
    

    loginBtn.disabled = false;
    loginBtn.innerText = "Login";
  }
});