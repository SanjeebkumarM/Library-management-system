import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, getDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentStudentRollNo = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentStudentRollNo = user.email.split('@')[0].toUpperCase();
        document.getElementById('IdDisplay').innerText = currentStudentRollNo;
        loadAllTabs();
    } else {
        window.location.href = "index.html";
    }
});

async function loadAllTabs() {
    await Promise.all([
        loadPendingRequests(),
        loadActiveLoans(),
        loadPastHistory()
    ]);
}
document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

// A helper function to grab book details (The "Client-Side Join")
async function getBookDetails(bookNo) {
    const bookSnap = await getDoc(doc(db, "books", bookNo));
    if (bookSnap.exists()) {
        const data = bookSnap.data();
        return {
            title: data.title || "Unknown Title",
            cover: data.cover_picture_url || "https://via.placeholder.com/150x225?text=No+Cover"
        };
    }
    return { title: "Book Not Found", cover: "https://via.placeholder.com/150x225?text=Removed" };
}

async function loadPendingRequests() {
    const container = document.getElementById('pendingRequestsContainer');
    
    const q = query(collection(db, "book_requests"), 
        where("roll_no", "==", currentStudentRollNo), 
        where("status", "==", "Pending")
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">You have no pending requests.</p></div>`;
        return;
    }

    let html = '';
    for (const reqDoc of querySnapshot.docs) {
        const reqData = reqDoc.data();
        const bookDetails = await getBookDetails(reqData.book_no);
        const reqDate = reqData.request_date ? reqData.request_date.toDate().toLocaleDateString() : 'Unknown';

        html += `
        <div class="col-md-6 col-lg-4 book-item">
            <div class="card border-0 shadow-sm h-100 overflow-hidden real-wrapper">
            <div class="d-flex h-100">
                <div class="img-wrapper bg-light">
                    <img src="${bookDetails.cover}" class="list-cover" alt="Cover" loading="lazy">
                </div>
                <div class="card-body p-2 d-flex flex-column flex-grow-1" style="min-width: 0;">
                <h6 class="fw-bold mb-1 lh-sm text-truncate">${bookDetails.title}</h6>
                <p class="text-muted small mb-3">ID: ${reqData.book_no}</p>
                <p class="small mb-2"><strong>Requested:</strong> ${reqDate}</p>
                <div class="mt-auto d-flex gap-2">
                    <span class="badge bg-secondary rounded-pill py-2 w-50 d-flex align-items-center justify-content-center">Pending</span>
                    <button class="btn btn-sm btn-outline-danger w-50 rounded-pill fw-bold" onclick="cancelRequest('${reqDoc.id}')">Cancel</button>
                </div>
                </div>
            </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

// Cancel pending requests
window.cancelRequest = async function(requestId) {
    Swal.fire({
        title: 'Cancel Request?',
        text: "Are you sure you want to cancel this book request?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, cancel it!'
    }).then(async (sweetResult) => {
        if (sweetResult.isConfirmed) {
            try {
                await deleteDoc(doc(db, "book_requests", requestId));
                
                Swal.fire({
                    title: 'Cancelled!',
                    text: 'Your request has been removed.',
                    icon: 'success',
                    timer: 800,
                    showConfirmButton: false
                }).then(() => {
                    loadPendingRequests();
                });
            } catch (error) {
                console.error("Error cancelling request:", error);
                Swal.fire('Connection Error', 'Failed to connect to the server.', 'error');
            }
        }
    });
};

async function loadActiveLoans() {
    const container = document.getElementById('activeLoansContainer');

    const q = query(collection(db, "borrowing_history"), 
        where("roll_no", "==", currentStudentRollNo),
        where("status", "in", ["Active", "Overdue"])
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">You have no active borrowed books.</p></div>`;
        return;
    }

    let html = '';
    const now = new Date(); // To dynamically check if a book is overdue

    for (const recordDoc of querySnapshot.docs) {
        const record = recordDoc.data();
        const bookDetails = await getBookDetails(record.book_no);
        
        const issueDate = record.date_of_issue ? record.date_of_issue.toDate().toLocaleDateString() : 'Unknown';
        const rawDueDate = record.expected_return_date ? record.expected_return_date.toDate() : null;
        const dueDateString = rawDueDate ? rawDueDate.toLocaleDateString() : 'Unknown';
        
        // Dynamic Overdue Logic!
        const isOverdue = rawDueDate && (now > rawDueDate);
        const borderClass = isOverdue ? "border border-danger border-2" : "";

        html += `
        <div class="col-md-6 col-lg-4 book-item">             
            <div class="card border-0 shadow-sm h-100 overflow-hidden real-wrapper ${borderClass}">
            <div class="d-flex h-100">
                <div class="img-wrapper bg-light">
                   <img src="${bookDetails.cover}" class="list-cover" alt="Cover" loading="lazy">
                </div>
                <div class="card-body p-2 d-flex flex-column flex-grow-1" style="min-width: 0;">
                <h6 class="fw-bold mb-1 lh-sm text-truncate">${bookDetails.title}</h6>
                <p class="text-muted small mb-1">ID: ${record.book_no}</p>
                
                <div class="mt-auto">
                    <p class="small mb-1"><strong>Issued:</strong> ${issueDate}</p>
                    ${isOverdue ? 
                    `<p class="small text-danger fw-bold mb-1"><strong>Due:</strong> ${dueDateString}</p>
                     <span class="badge bg-danger rounded-pill w-100 py-2">Overdue</span>` 
                    : 
                    `<p class="small text-success fw-bold mb-1"><strong>Due:</strong> ${dueDateString}</p>
                     <span class="badge bg-warning text-dark rounded-pill w-100 py-2">Active</span>`
                    }
                </div>
                </div>
            </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}

async function loadPastHistory() {
    const container = document.getElementById('pastHistoryContainer');
    
    const q = query(collection(db, "borrowing_history"), 
        where("roll_no", "==", currentStudentRollNo),
        where("status", "==", "Returned")
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        container.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">No past borrowing history.</p></div>`;
        return;
    }

    let html = '';
    for (const recordDoc of querySnapshot.docs) {
        const record = recordDoc.data();
        const bookDetails = await getBookDetails(record.book_no);
        const returnDate = record.actual_return_date ? record.actual_return_date.toDate().toLocaleDateString() : 'Unknown';

        html += `
        <div class="col-md-6 col-lg-4 book-item">
            <div class="card border-0 shadow-sm h-100 overflow-hidden real-wrapper">
            <div class="d-flex h-100">
                <div class="img-wrapper bg-light opacity-100">
                   <img src="${bookDetails.cover}" class="list-cover grayscale" alt="Cover" loading="lazy" style="filter: grayscale(100%);">
                </div>
                <div class="card-body p-2 d-flex flex-column flex-grow-1" style="min-width: 0;" >
                <h6 class="fw-bold mb-1 lh-sm text-truncate">${bookDetails.title}</h6>
                <p class="text-muted small mb-2">ID: ${record.book_no}</p>
                <div class="mt-auto">
                    <p class="small mb-4"><strong>Returned:</strong> ${returnDate}</p>
                    <span class="badge bg-success bg-opacity-25 text-success rounded-pill w-100 py-2">Returned</span>
                </div>
                </div>
            </div>
            </div>
        </div>`;
    }
    container.innerHTML = html;
}