import { auth, db, firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { onAuthStateChanged, signOut, getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, writeBatch, increment, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { sendWelcomeEmail } from "./email_service.js";

onAuthStateChanged(auth, (user) => {
    if (user && user.email.includes('@admin.library.com')) {
        document.getElementById('adminIdDisplay').innerText = user.email.split('@')[0].toUpperCase();
        loadStudentDirectory();
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

//Load Student Directory
async function loadStudentDirectory() {
    const tbody = document.getElementById('studentTableBody');
    try {
        const querySnapshot = await getDocs(collection(db, "students"));
        let html = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted w-100 d-block d-md-table-cell">No students found.</td></tr>';
            return;
        }

        for (const studentDoc of querySnapshot.docs) {
            const student = studentDoc.data();
            const rollNo = studentDoc.id;
            const email = student.email || "No Email";
            
            // Checks for active or overdue
            const historyQuery = query(collection(db, "borrowing_history"), where("roll_no", "==", rollNo), where("status", "in", ["Active", "Overdue"]));
            const historyDocs = await getDocs(historyQuery);
            
            let borrowStatus = 'Clear';
            historyDocs.forEach(hDoc => {
                if (hDoc.data().status === 'Overdue') borrowStatus = 'Overdue';
                else if (borrowStatus !== 'Overdue') borrowStatus = 'Active';
            });

            const badgeHtml = borrowStatus === 'Overdue' ? '<span class="badge bg-danger rounded-pill">Overdue</span>' :
                              borrowStatus === 'Active' ? '<span class="badge bg-warning text-dark rounded-pill">Active</span>' :
                              '<span class="badge bg-success rounded-pill">Clear</span>';

            html += `
                <tr class="student-row align-middle" data-status="${borrowStatus}">
                  <td class="ps-4 fw-bold">${rollNo}</td>
                  <td>
                    <a href="#" class="text-decoration-none fw-bold text-primary view-history-btn d-block" 
                       data-roll="${rollNo}" data-name="${student.name}" data-mobile="${student.mobile_no || ''}">
                      ${student.name}
                    </a>
                    <small class="text-muted">${email}</small>
                  </td>
                  <td><span class="badge bg-secondary">${student.branch}</span></td>
                  <td>${student.admission_year}</td>
                  <td class="text-muted">${student.digital_card_no}</td>
                  <td>${badgeHtml}</td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-warning fw-bold edit-student-btn" 
                      data-roll="${rollNo}" data-name="${student.name}" data-email="${student.email || ''}" 
                      data-branch="${student.branch}" data-year="${student.admission_year}" 
                      data-mobile="${student.mobile_no || ''}" data-card="${student.digital_card_no}"
                      data-status="${student.account_status}">
                      <i class="bi bi-pencil-square"></i> Edit
                    </button>
                  </td>
                </tr>
            `;
        }
        tbody.innerHTML = html;
        attachHistoryListeners();
        attachEditStudentListeners();
        applyStudentFilters(); 
    } catch (error) {
        console.error("Error loading directory:", error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Failed to load directory.</td></tr>';
    }
}

// Register New Student
// 3. Register New Student (Auth + Database)
document.getElementById('saveStudentBtn').addEventListener('click', async function() {
    const rollNo = document.getElementById('regRollNo').value.trim().toUpperCase();
    const name = document.getElementById('regName').value.trim();
    const realEmail = document.getElementById('regEmail').value.trim(); // Their actual contact email
    const password = document.getElementById('regPassword').value; 
    const cardNo = document.getElementById('regCardNo').value.trim();

    if (!rollNo || !name || !realEmail || !password || !cardNo) {
        Swal.fire('Missing Info', 'Roll No, Name, Email, Password, and Card No are required.', 'warning');
        return;
    }

    if (password.length < 6) {
        Swal.fire('Weak Password', 'Firebase requires passwords to be at least 6 characters.', 'warning');
        return;
    }

    //Constructs the invisible login email
    const loginEmail = `${rollNo.toLowerCase()}@student.library.com`;

    Swal.fire({ title: 'Creating Account...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        // Create the Auth account using the constructed Roll No email!
        await createUserWithEmailAndPassword(secondaryAuth, loginEmail, password);
        
        await signOut(secondaryAuth);

        const studentData = {
            name: name,
            email: realEmail, 
            branch: document.getElementById('regBranch').value,
            admission_year: parseInt(document.getElementById('regYear').value),
            mobile_no: document.getElementById('regMobile').value.trim(),
            digital_card_no: cardNo,
            account_status: "Active"
        };

        await setDoc(doc(db, "students", rollNo), studentData);
        
        //Sent an email to the registered student the login details
        const emailSent = await sendWelcomeEmail(realEmail, name, rollNo, password, cardNo);
        
        let successMessage = `Account created! Student can log in with Roll No: ${rollNo}.`;
        if (emailSent) {
            successMessage += " An email with login details has been sent.";
        } else {
            successMessage += " (Warning: Welcome email failed to send).";
        }

        Swal.fire('Success', successMessage, 'success').then(() => {
            window.location.reload();
        });

    } catch (error) {
        console.error('Error adding student:', error);
        if (error.code === 'auth/email-already-in-use') {
            Swal.fire('Error', 'An account for this Roll Number already exists.', 'error');
        } else {
            Swal.fire('Error', 'Failed to save student profile.', 'error');
        }
    }
});

// Edit Student
function attachEditStudentListeners() {
    document.querySelectorAll('.edit-student-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('editRollNo').value = this.getAttribute('data-roll');
            document.getElementById('editName').value = this.getAttribute('data-name');
            document.getElementById('editEmail').value = this.getAttribute('data-email');
            document.getElementById('editMobile').value = this.getAttribute('data-mobile');
            document.getElementById('editBranch').value = this.getAttribute('data-branch');
            document.getElementById('editYear').value = this.getAttribute('data-year');
            document.getElementById('editCardNo').value = this.getAttribute('data-card');
            document.getElementById('editStatus').value = this.getAttribute('data-status');

            new bootstrap.Modal(document.getElementById('editStudentModal')).show();
        });
    });
}

document.getElementById('updateStudentBtn').addEventListener('click', async function() {
    const rollNo = document.getElementById('editRollNo').value;
    const newName = document.getElementById('editName').value.trim();
    const newEmail = document.getElementById('editEmail').value.trim();
    const newMobile = document.getElementById('editMobile').value.trim();
    const newBranch = document.getElementById('editBranch').value;
    const newYear = parseInt(document.getElementById('editYear').value);
    const newCardNo = document.getElementById('editCardNo').value.trim();
    const newStatus = document.getElementById('editStatus').value;

    if (!newName || !newEmail || !newCardNo || isNaN(newYear)) {
        Swal.fire('Invalid Input', 'Please check your text fields.', 'warning');
        return;
    }

    Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await updateDoc(doc(db, "students", rollNo), {
            name: newName,
            email: newEmail,
            mobile_no: newMobile,
            branch: newBranch,
            admission_year: newYear,
            digital_card_no: newCardNo,
            account_status: newStatus
        });

        Swal.fire('Updated!', 'Student profile has been updated.', 'success').then(() => {
            window.location.reload(); 
        });

    } catch (error) {
        console.error('Error updating student:', error);
        Swal.fire('Error', 'Failed to update database.', 'error');
    }
});

// View Borrowing History
function attachHistoryListeners() {
    document.querySelectorAll('.view-history-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const rollNo = this.getAttribute('data-roll');
            const name = this.getAttribute('data-name');
            const mobile = this.getAttribute('data-mobile');
            
            const offcanvas = new bootstrap.Offcanvas(document.getElementById('historyOffcanvas'));
            offcanvas.show();
            
            viewHistory(rollNo, name, mobile);
        });
    });
}

async function viewHistory(rollNo, studentName, mobileNo) {
    document.getElementById('drawerStudentName').innerText = studentName;
    document.getElementById('drawerRollNo').innerText = rollNo;
    document.getElementById('drawerAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=random&size=80`;

    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm"></div></td></tr>';

    try {
        const historyQuery = query(collection(db, "borrowing_history"), where("roll_no", "==", rollNo));
        const historySnap = await getDocs(historyQuery);

        if (historySnap.empty) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-5 text-muted">No borrowing history found.</td></tr>';
            return;
        }

        let html = '';
        for (const hDoc of historySnap.docs) {
            const item = hDoc.data();
            const transactionId = hDoc.id;
            
            const bookSnap = await getDoc(doc(db, "books", item.book_no));
            const bookTitle = bookSnap.exists() ? bookSnap.data().title : "Unknown Title";

            const issueDate = item.date_of_issue ? item.date_of_issue.toDate().toLocaleDateString() : 'Unknown';
            const expectedReturn = item.expected_return_date ? item.expected_return_date.toDate().toLocaleDateString() : 'Unknown';
            const actualReturn = item.actual_return_date ? item.actual_return_date.toDate().toLocaleDateString() : null;

            let badgeClass = 'bg-secondary';
            let secondDateHtml = '';
            let actionButtonHtml = '';

            if (item.status === 'Active') {
                badgeClass = 'bg-warning text-dark';
                secondDateHtml = `<span class="text-muted">Due: ${expectedReturn}</span>`;
                actionButtonHtml = `<button class="btn btn-sm btn-outline-success rounded-pill px-2 mt-2" style="font-size: 0.75rem;" id="returnBtn-${transactionId}">Return Book</button>`;
            } 
            else if (item.status === 'Returned') {
                badgeClass = 'bg-success';
                secondDateHtml = `<span class="text-success">Ret: ${actualReturn}</span>`;
            } 
            else if (item.status === 'Overdue') {
                badgeClass = 'bg-danger';
                secondDateHtml = `<span class="text-danger fw-bold">Due: ${expectedReturn}</span>`;
                const message = `Hello ${studentName}, this is an alert from the Campus Library. Your book "${bookTitle}" (ID: ${item.book_no}) is OVERDUE. Please return it immediately.`;
                const whatsappUrl = `https://wa.me/91${mobileNo}?text=${encodeURIComponent(message)}`;
                
                actionButtonHtml = `
                    <div class="d-flex gap-2 mt-2">
                        <a href="${whatsappUrl}" target="_blank" class="btn btn-sm btn-success rounded-pill px-3" style="font-size: 0.75rem;">Alert</a>
                        <button class="btn btn-sm btn-outline-success rounded-pill px-2" style="font-size: 0.75rem;" id="returnBtn-${transactionId}">Return</button>
                    </div>
                `;
            }

            html += `
                <tr>
                    <td class="ps-3 py-2 align-middle">
                        <strong class="text-primary">${item.book_no}</strong><br>
                        <small class="text-muted text-truncate d-inline-block" style="max-width: 150px;">${bookTitle}</small>
                        <br>${actionButtonHtml}
                    </td>
                    <td class="align-middle">
                        <small class="d-block mb-1">Iss: ${issueDate}</small>
                        <small class="d-block">${secondDateHtml}</small>
                    </td>
                    <td class="pe-3 text-end align-middle">
                        <span class="badge ${badgeClass} rounded-pill">${item.status}</span>
                    </td>
                </tr>
            `;
        }
        
        tbody.innerHTML = html;

        historySnap.docs.forEach(hDoc => {
            const btn = document.getElementById(`returnBtn-${hDoc.id}`);
            if (btn) {
                btn.addEventListener('click', () => markReturned(hDoc.id, hDoc.data().book_no, rollNo, studentName, mobileNo));
            }
        });

    } catch (error) {
        console.error('Error fetching history:', error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger py-4">Failed to load history data.</td></tr>';
    }
}

//Mark Returned
async function markReturned(transactionId, bookNo, rollNo, studentName, mobileNo) {
    Swal.fire({
        title: 'Return Book?',
        text: "Confirm physical return of this book?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: 'Yes, Mark Returned'
    }).then(async (result) => { 
        if (result.isConfirmed) {
            Swal.fire({ title: 'Processing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            try {
                const batch = writeBatch(db);
                
                batch.update(doc(db, "borrowing_history", transactionId), {
                    status: "Returned",
                    actual_return_date: serverTimestamp()
                });

                batch.update(doc(db, "books", bookNo), {
                    available_copies: increment(1)
                });

                await batch.commit();

                Swal.fire('Returned!', 'The book is back in inventory.', 'success').then(() => {
                    viewHistory(rollNo, studentName, mobileNo); 
                    loadStudentDirectory(); 
                });
            } catch (error) {
                console.error("Error returning:", error);              
                Swal.fire('Error', 'Failed to return book.', 'error');
            }
        }
    });
}

// search and filter
const tableSearch = document.getElementById('tableSearch');
const statusFilter = document.getElementById('statusFilter');

function applyStudentFilters() {
    const searchValue = tableSearch.value.toLowerCase();
    const statusValue = statusFilter.value;
    const studentRows = document.querySelectorAll('.student-row'); 

    studentRows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        const rowStatus = row.getAttribute('data-status');

        const matchesSearch = rowText.includes(searchValue);
        const matchesStatus = (statusValue === 'all') || (rowStatus === statusValue);

        row.style.display = (matchesSearch && matchesStatus) ? '' : 'none';
    });
}

if (tableSearch) tableSearch.addEventListener('keyup', applyStudentFilters);
if (statusFilter) statusFilter.addEventListener('change', applyStudentFilters);

// Check for book overdue automatically
async function autoRunOverdueCheck() {
    try {
        const batch = writeBatch(db);
        const activeQuery = query(collection(db, "borrowing_history"), where("status", "==", "Active"));
        const activeSnap = await getDocs(activeQuery);
        
        const now = new Date();
        let updatedCount = 0;

        activeSnap.forEach(docSnap => {
            const data = docSnap.data();
            const dueDate = data.expected_return_date ? data.expected_return_date.toDate() : null;
            
            if (dueDate && now > dueDate) {
                batch.update(docSnap.ref, { status: "Overdue" });
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Silently marked ${updatedCount} books as Overdue!`);
            loadStudentDirectory(); 
        }
    } catch (error) {
        console.error("Silent overdue check failed:", error);
    }
}

autoRunOverdueCheck();