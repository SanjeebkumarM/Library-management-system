import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, writeBatch, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentAdminId = "LIB-ADMIN";
let currentStudentRollNo = null;

onAuthStateChanged(auth, (user) => {
    if (user && user.email.includes('@admin.library.com')) {
        currentAdminId = user.email.split('@')[0].toUpperCase();
        document.getElementById('adminIdDisplay').innerText = currentAdminId;
    } else {
        window.location.href = "admin_login.html";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "admin_login.html");
});

//DOM Elements
const cameraContainer = document.getElementById('cameraContainer');
const scanInput = document.getElementById('digitalCardInput');
const resultsSection = document.getElementById('resultsSection');
const requestTableBody = document.getElementById('requestTableBody');
const issueBtn = document.getElementById('issueBtn');
let html5QrcodeScanner = null;

//Scanner Logic (USB or Typing)
scanInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault(); 
    const scannedCode = scanInput.value.trim();
    if (scannedCode) {
      fetchStudentData(scannedCode);
      scanInput.value = ''; 
    }
  }
});

// Camera Scanner Logic
document.getElementById('startCameraBtn').addEventListener('click', function() {
    cameraContainer.style.display = 'block';
    if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false);
        html5QrcodeScanner.render((decodedText) => {
            html5QrcodeScanner.clear();
            cameraContainer.style.display = 'none';
            html5QrcodeScanner = null;
            document.getElementById('digitalCardInput').value = decodedText;
            fetchStudentData(decodedText);
        }, () => {});
    }
});

document.getElementById('stopCameraBtn').addEventListener('click', function() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.clear();
        html5QrcodeScanner = null;
    }
    cameraContainer.style.display = 'none';
    scanInput.focus();
});


// Fetch Student & Cart Data from Firestore firebase
async function fetchStudentData(cardNumber) {
    Swal.fire({ title: 'Searching...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      
        const studentQuery = query(collection(db, "students"), where("digital_card_no", "==", cardNumber));
        const studentSnap = await getDocs(studentQuery);

        if (studentSnap.empty) {
            Swal.fire('Not Found', 'Invalid Digital Library Card.', 'error');
            resultsSection.style.display = 'none';
            return;
        }

        const studentData = studentSnap.docs[0].data();
        currentStudentRollNo = studentSnap.docs[0].id; // The document ID is their roll number
        
        // Calculate overdue books live
        const overdueQuery = query(collection(db, "borrowing_history"), 
            where("roll_no", "==", currentStudentRollNo), 
            where("status", "==", "Overdue")
        );
        const overdueCount = (await getDocs(overdueQuery)).size;

        // Fetch their pending cart
        const cartQuery = query(collection(db, "book_requests"), 
            where("roll_no", "==", currentStudentRollNo), 
            where("status", "==", "Pending")
        );
        const cartSnap = await getDocs(cartQuery);

        populateDashboard(studentData, overdueCount, cartSnap.docs);
        Swal.close();
    } catch (error) {
        console.error("Fetch error:", error);
        Swal.fire('Error', 'Failed to read database.', 'error');
    }
}

async function populateDashboard(student, overdueCount, cartDocs) {
    document.getElementById('studentName').innerText = student.name || "Unknown";
    document.getElementById('studentRollNo').innerText = currentStudentRollNo;
    document.getElementById('studentBranch').innerText = student.branch || "Unknown";
    document.getElementById('studentPhoto').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random&size=120`;
    
    const isBlocked = student.account_status === 'Blocked';
    document.getElementById('accountStatus').innerText = isBlocked ? 'Blocked' : 'Clear';
    document.getElementById('accountStatus').className = isBlocked ? 'badge bg-danger rounded-pill' : 'badge bg-success rounded-pill';
    document.getElementById('overdueCount').innerText = overdueCount;

    requestTableBody.innerHTML = '';

    if (cartDocs.length === 0) {
        requestTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4 w-100 d-block d-md-table-cell">No pending requests found.</td></tr>';
    } else {
        // Check stock for each requested book
        for (const reqDoc of cartDocs) {
            const reqData = reqDoc.data();
            const bookSnap = await getDoc(doc(db, "books", reqData.book_no));
            const bookData = bookSnap.exists() ? bookSnap.data() : { title: "Unknown", available_copies: 0 };
            
            const inStock = bookData.available_copies > 0;
            const stockBadge = inStock ? '<span class="badge text-bg-success">In Stock</span>' : '<span class="badge text-bg-danger">Out of Stock</span>';
            const checkboxStatus = inStock ? '' : 'disabled';

            const row = `
                <tr>
                    <td class="ps-4">
                        <input class="form-check-input request-checkbox border-secondary" type="checkbox" value="${reqDoc.id}" data-bookno="${reqData.book_no}" ${checkboxStatus} style="transform: scale(1.3);">
                    </td>
                    <td><strong>${reqData.book_no}</strong></td>
                    <td>${bookData.title}</td>
                    <td>${stockBadge}</td>
                </tr>
            `;
            requestTableBody.insertAdjacentHTML('beforeend', row);
        }
    }

    resultsSection.style.display = 'flex';
    issueBtn.disabled = isBlocked;
}

// Issue Books
issueBtn.addEventListener('click', async function() {
    const checkboxes = document.querySelectorAll('.request-checkbox:checked');
    if (checkboxes.length === 0) {
        Swal.fire('Select a Book', 'Please check the box next to at least one book.', 'warning');
        return;
    }

    Swal.fire({
        title: 'Issue Books?',
        text: `You are about to issue ${checkboxes.length} book(s) to this student.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: 'Yes, Issue Books'
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Issuing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

            try {
                // I am using batch write to ensure all database operations happen at the exact same time
                const batch = writeBatch(db);
                
                // Here we calculate due date (assuming books are to be returned after 14 days)
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 14);

                checkboxes.forEach(cb => {
                    const requestId = cb.value;
                    const bookNo = cb.getAttribute('data-bookno');

                    //deletes pending requests
                    batch.delete(doc(db, "book_requests", requestId));

                    const newHistoryRef = doc(collection(db, "borrowing_history"));
                    batch.set(newHistoryRef, {
                        roll_no: currentStudentRollNo,
                        book_no: bookNo,
                        issued_by: currentAdminId,
                        date_of_issue: serverTimestamp(),
                        expected_return_date: dueDate,
                        status: "Active"
                    });

                    // Here books get deducted form stock after issuing
                    batch.update(doc(db, "books", bookNo), {
                        available_copies: increment(-1)
                    });
                });

                await batch.commit();

                Swal.fire('Issued!', 'The books have been added to the student\'s account.', 'success').then(() => {
                    resultsSection.style.display = 'none';
                    currentStudentRollNo = null;
                    scanInput.focus(); 
                });
            } catch (error) {
                console.error('Batch write failed:', error);
                Swal.fire('Error', 'Failed to update database.', 'error');
            }
        }
    });
});

document.getElementById('clearBtn').addEventListener('click', function() {
  resultsSection.style.display = 'none';
  currentStudentRollNo = null;
  scanInput.focus(); 
});