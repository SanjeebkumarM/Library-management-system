import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, getDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

onAuthStateChanged(auth, (user) => {
    if (user && user.email.includes('@admin.library.com')) {
        document.getElementById('adminIdDisplay').innerText = user.email.split('@')[0].toUpperCase();
        loadBooksCatalog();
    } else {
        window.location.href = "admin_login.html";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "admin_login.html");
});


//Load Book Catalog
async function loadBooksCatalog() {
    const tbody = document.getElementById('bookTableBody');
    try {
        const querySnapshot = await getDocs(collection(db, "books"));
        let html = '';

        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted w-100 d-block d-md-table-cell">No books found in the catalog.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const book = docSnap.data();
            const bookNo = docSnap.id;
            const author = book.author || "Unknown Author";
            const inStock = book.available_copies > 0;
            const stockBadge = inStock ? '<span class="badge bg-success rounded-pill">In Stock</span>' : '<span class="badge bg-danger rounded-pill">Out of Stock</span>';

            html += `
                <tr class="book-row">
                  <td class="ps-4 fw-bold text-uppercase book-no">${bookNo}</td>
                  <td>
                    <div class="fw-bold text-primary book-title">${book.title}</div>
                    <div class="text-muted small book-author">By: ${author}</div>
                  </td>
                  <td class="book-branch"><span class="badge bg-secondary">${book.category_branch}</span></td>
                  <td class="text-center">${book.total_copies}</td>
                  <td class="text-center fw-bold ${inStock ? 'text-success' : 'text-danger'}">${book.available_copies}</td>
                  <td class="text-center">${stockBadge}</td>
                  <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-warning fw-bold edit-btn" 
                      data-bookno="${bookNo}" data-title="${book.title}" data-author="${author}" 
                      data-branch="${book.category_branch}" data-total="${book.total_copies}" data-avail="${book.available_copies}">
                      <i class="bi bi-pencil-square"></i> Edit
                    </button>
                  </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        attachEditListeners();
        applyBookFilters();

    } catch (error) {
        console.error("Error loading books:", error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Failed to load catalog.</td></tr>';
    }
}


// Add New Book (with Base64 Local Image Encoding)
document.getElementById('saveBookBtn').addEventListener('click', async function() {
    const title = document.getElementById('bookTitle').value.trim();
    const bookNo = document.getElementById('bookNo').value.trim().toUpperCase();
    const author = document.getElementById('bookAuthor').value.trim();
    const branch = document.getElementById('bookBranch').value;
    const totalCopies = parseInt(document.getElementById('bookTotal').value);
    const fileInput = document.getElementById('bookCover');

    if (!title || !bookNo || !author || isNaN(totalCopies)) {
        Swal.fire('Missing Info', 'Please fill in all text fields.', 'warning');
        return;
    }

    Swal.fire({ title: 'Saving Book...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const bookRef = doc(db, "books", bookNo);
        const bookSnap = await getDoc(bookRef);
        if (bookSnap.exists()) {
            Swal.fire('Error', `Book ID ${bookNo} already exists!`, 'error');
            return;
        }

        let coverUrl = "";

        // BASE64 ENCODING (Since Iam not using any cloud file to save cover image instead using this trick to convert image into long text and save it as document filed)
        if (fileInput.files.length > 0) {
            const imageFile = fileInput.files[0];
            
            // Firestore limit is 1MB. We block images larger than 800KB just to be safe.
            if (imageFile.size > 800000) {
                Swal.fire('File Too Large,','please upload an image smaller than 800KB.', 'warning');
                return;
            }

            // Convert physical file to a text string
            const reader = new FileReader();
            coverUrl = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject("Error reading file");
                reader.readAsDataURL(imageFile);
            });
        }

        await setDoc(bookRef, {
            title: title,
            author: author,
            category_branch: branch,
            total_copies: totalCopies,
            available_copies: totalCopies, 
            cover_picture_url: coverUrl
        });

        Swal.fire('Success', 'Book successfully added to the catalog!', 'success').then(() => {
            window.location.reload();
        });

    } catch (error) {
        console.error('Error adding book:', error);
        Swal.fire('Error', 'Failed to save book to cloud.', 'error');
    }
});


// Edit Book Details
function attachEditListeners() {
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            document.getElementById('editBookNo').value = this.getAttribute('data-bookno');
            document.getElementById('editTitle').value = this.getAttribute('data-title');
            document.getElementById('editAuthor').value = this.getAttribute('data-author');
            document.getElementById('editBranch').value = this.getAttribute('data-branch');
            const total = parseInt(this.getAttribute('data-total'));
            const avail = parseInt(this.getAttribute('data-avail'));
            
            document.getElementById('editTotal').value = total;
            document.getElementById('editOriginalTotal').value = total;
            document.getElementById('editAvailable').value = avail;

            new bootstrap.Modal(document.getElementById('editBookModal')).show();
        });
    });
}

document.getElementById('updateBookBtn').addEventListener('click', async function() {
    const bookNo = document.getElementById('editBookNo').value;
    const newTitle = document.getElementById('editTitle').value.trim();
    const newAuthor = document.getElementById('editAuthor').value.trim();
    const newBranch = document.getElementById('editBranch').value;
    const fileInput = document.getElementById('editBookCover');
    
    const newTotal = parseInt(document.getElementById('editTotal').value);
    const oldTotal = parseInt(document.getElementById('editOriginalTotal').value);
    const oldAvailable = parseInt(document.getElementById('editAvailable').value);

    if (!newTitle || !newAuthor || isNaN(newTotal) || newTotal < 1) {
        Swal.fire('Invalid Input', 'Please check your fields.', 'warning');
        return;
    }

    const difference = newTotal - oldTotal;
    const newAvailable = oldAvailable + difference;

    if (newAvailable < 0) {
        Swal.fire('Warning', `You cannot lower the total copies to ${newTotal} because there are currently ${oldTotal - oldAvailable} copies checked out.`, 'warning');
        return;
    }

    Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const updatePayload = {
            title: newTitle,
            author: newAuthor,
            category_branch: newBranch,
            total_copies: newTotal,
            available_copies: newAvailable
        };

        if (fileInput && fileInput.files.length > 0) {
            const imageFile = fileInput.files[0];
            
            if (imageFile.size > 800000) {
                Swal.fire('File Too Large', 'Please upload an image smaller than 800KB.', 'warning');
                return;
            }

            const reader = new FileReader();
            const coverUrl = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject("Error reading file");
                reader.readAsDataURL(imageFile);
            });

            updatePayload.cover_picture_url = coverUrl; 
        }
        await updateDoc(doc(db, "books", bookNo), updatePayload);

        Swal.fire('Updated!', 'Inventory has been updated.', 'success').then(() => {
            window.location.reload(); 
        });

    } catch (error) {
        console.error('Error updating book:', error);
        Swal.fire('Error', 'Failed to update database.', 'error');
    }
});


// search and filter
const bookSearch = document.getElementById('bookSearch');
const statusFilter = document.getElementById('statusFilter');

function applyBookFilters() {
    const searchValue = bookSearch.value.toLowerCase();
    const branchValue = statusFilter.value.toLowerCase();
    const tableRows = document.querySelectorAll('.book-row');

    tableRows.forEach(row => {
        const rowText = row.textContent.toLowerCase();
        const branchBadge = row.querySelector('.book-branch').textContent.toLowerCase();
        
        const matchesSearch = rowText.includes(searchValue);
        const matchesBranch = (branchValue === 'all') || branchBadge.includes(branchValue);
        
        row.style.display = (matchesSearch && matchesBranch) ? '' : 'none';
    });
}

if (bookSearch) bookSearch.addEventListener('keyup', applyBookFilters);
if (statusFilter) statusFilter.addEventListener('change', applyBookFilters);