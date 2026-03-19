import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Our invisible domain trick: CSE24028@student.library.com
    // We split at the '@' to grab just the roll number!
    const rawRollNo = user.email.split('@')[0];
    const rollNo = rawRollNo.toUpperCase(); 
    
    //Fetch data from firebase
    const docRef = doc(db, "students", rollNo);
    const docSnap = await getDoc(docRef);

    const studentId = rollNo;
    document.getElementById('IdDisplay').innerText = studentId;
    document.getElementById("studentIdDisplay").innerText = studentId;

    if (docSnap.exists()) {
      const studentData = docSnap.data();
      populateDashboard(studentData);
    } else {
      console.log("No student record found in Firestore!");
    }
  } else {
    // If they aren't logged in, kick them back to the login page
    window.location.href = "index.html";
  }
});

function populateDashboard(data) {
  const safeName = data.name || "Student Name";
  const safeCardNo = data.digital_card_no || "PENDING-CARD";
  const safeBranch = data.branch || "Unknown Branch";
  const safeYear = data.admission_year || "Unknown Year";
  const safeStatus = data.account_status || "Clear";

  const encodedName = encodeURIComponent(safeName);
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=ffffff&color=0d6efd&size=90`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${safeCardNo}`;
  const detailsText = `${safeBranch} • Batch of ${safeYear}`;
  
  const statusHtml = safeStatus === 'Blocked' 
    ? `<div class="alert alert-danger fw-bold rounded-pill shadow-sm">Account Status: Blocked</div>`
    : `<div class="alert alert-success fw-bold rounded-pill shadow-sm">Account Status: Clear</div>`;

  document.getElementById("mobileName").innerText = safeName;
  document.getElementById("mobileDetails").innerText = detailsText;
  document.getElementById("mobileCardNo").innerText = safeCardNo;
  document.getElementById("mobileAvatar").src = avatarUrl;
  document.getElementById("mobileQR").src = qrUrl;
  document.getElementById("mobileQR").style.display = "inline";
  document.getElementById("mobileStatusContainer").innerHTML = statusHtml;

  document.getElementById("desktopName").innerText = safeName;
  document.getElementById("desktopDetails").innerText = detailsText;
  document.getElementById("desktopCardNo").innerText = safeCardNo;
  document.getElementById("desktopAvatar").src = avatarUrl;
  document.getElementById("desktopQR").src = qrUrl;
  document.getElementById("desktopQR").style.display = "inline";
  document.getElementById("desktopStatusContainer").innerHTML = statusHtml;
  
  const firstName = safeName.split(" ")[0];
  document.getElementById("welcomeName").innerText = `Welcome back, ${firstName}!`;
}
const handleLogout = () => {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
};

document.getElementById("mobileLogoutBtn").addEventListener("click", handleLogout);
document.getElementById("desktopLogoutBtn").addEventListener("click", handleLogout);