import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let currentStudentRollNo = null;
let currentAccountStatus = "Active";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentStudentRollNo = user.email.split('@')[0].toUpperCase();
        
        const studentRef = doc(db, "students", currentStudentRollNo);
        const studentSnap = await getDoc(studentRef);
        
        document.getElementById('IdDisplay').innerText = currentStudentRollNo;

        if (studentSnap.exists()) {
            currentAccountStatus = studentSnap.data().account_status || "Active";
        }

        await loadBooksFromFirestore();
        initCartUI();
    } else {
        window.location.href = "index.html";
    }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
    signOut(auth).then(() => window.location.href = "index.html");
});

//Get books from database
async function loadBooksFromFirestore() {
    const bookGrid = document.getElementById("bookGrid");
    
    try {
        const querySnapshot = await getDocs(collection(db, "books"));
        let html = "";

        querySnapshot.forEach((doc) => {
            const book = doc.data();
            
            //If no cover is uploaded replace with no cover
            const coverImg = book.cover_picture_url || "https://via.placeholder.com/150x225?text=No+Cover";
            
            let buttonHtml = "";
            
            if (currentAccountStatus === 'Blocked') {
                // If the student is blocked, replace the button entirely
                buttonHtml = `<button class="btn btn-outline-danger w-100 fw-bold rounded-pill disabled py-1" style="font-size: 0.75rem;">
                  Account Blocked
                </button>`;
            } else if (book.available_copies > 0) {
                buttonHtml = `<button class="btn btn-outline-primary w-100 fw-bold rounded-pill borrow-btn py-1" 
                        style="font-size: 0.75rem;"
                        data-bookno="${doc.id}" 
                        data-bookauthor="${book.author}"
                        data-title="${book.title}"
                        data-cover="${coverImg}">
                  + Add to Cart
                </button>`;
            } else {
                buttonHtml = `<button class="btn btn-outline-secondary w-100 fw-bold rounded-pill disabled py-1" style="font-size: 0.75rem;">
                  Out of Stock
                </button>`;
            }

            html += `
            <div class="col book-item" data-branch="${book.category_branch}">
              <div class="card h-100 shadow-sm border-0 book-card real-wrapper">
                <img src="${coverImg}" class="card-img-top book-cover" alt="${book.title}" loading="lazy">
                <div class="card-body d-flex flex-column p-2">
                  <span class="badge bg-secondary align-self-start mb-1 branch-badge">${book.category_branch}</span>
                  <h6 class="card-title fw-bold mb-1 text-truncate book-title" title="${book.title}" style="font-size: 0.85rem;">${book.title}</h6>
                  <p class="text-muted small mb-2 text-truncate text-uppercase book-author" style="font-size: 0.65rem;">Author: ${book.author}</p>
                  <p class="text-muted small mb-2 text-uppercase book-id" style="font-size: 0.65rem;">ID: ${doc.id}</p>
                  <div class="mt-auto pt-2 border-top">
                    ${buttonHtml}
                  </div>
                </div>
              </div>
            </div>`;
        });

        bookGrid.innerHTML = html;
        attachSearchAndFilterLogic();
        attachAddToCartListeners();

    } catch (error) {
        console.error("Error loading books:", error);
        bookGrid.innerHTML = `<div class="col-12 text-center text-danger">Failed to load catalog. Check console for details.</div>`;
    }
}

//search and filter
function attachSearchAndFilterLogic() {
    const searchInput = document.getElementById('catalogSearch');
    const categoryButtons = document.querySelectorAll('.filter-btn');
    const mobileCategorySelect = document.getElementById('categoryFilterMobile');

    function applyFilters() {
        const currentSearch = searchInput.value.toLowerCase();
        let currentFilter = "all";
        
        categoryButtons.forEach(btn => {
            if (btn.classList.contains('btn-dark')) {
                currentFilter = btn.getAttribute('data-filter');
            }
        });

        document.querySelectorAll('.book-item').forEach(item => {
            const title = item.querySelector('.book-title').textContent.toLowerCase();
            const bookId = item.querySelector('.book-id').textContent.toLowerCase();
            const author = item.querySelector('.book-author').textContent.toLowerCase();
            const branch = item.getAttribute('data-branch');
            
            const matchesSearch = title.includes(currentSearch) || bookId.includes(currentSearch) || author.includes(currentSearch);
            const matchesFilter = (currentFilter === "all") || (branch === currentFilter);

            item.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
        });
    }

    searchInput.addEventListener('keyup', applyFilters);

    categoryButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryButtons.forEach(b => {
                b.classList.remove('btn-dark');
                b.classList.add('btn-outline-dark');
            });
            this.classList.remove('btn-outline-dark');
            this.classList.add('btn-dark');

            if (mobileCategorySelect) mobileCategorySelect.value = this.getAttribute('data-filter');
            applyFilters();
        });
    });

    if (mobileCategorySelect) {
        mobileCategorySelect.addEventListener('change', function() {
            const currentFilter = this.value;
            categoryButtons.forEach(b => {
                b.classList.remove('btn-dark');
                b.classList.add('btn-outline-dark');
                if(b.getAttribute('data-filter') === currentFilter) {
                     b.classList.remove('btn-outline-dark');
                     b.classList.add('btn-dark');
                }
            });
            applyFilters();
        });
    }
}

let cart = JSON.parse(localStorage.getItem('campusLibraryCart')) || []; 

function attachAddToCartListeners() {
    document.querySelectorAll('.borrow-btn').forEach(button => {
        button.addEventListener('click', function() {
            // Extra security check in case they manipulate the HTML
            if (currentAccountStatus === 'Blocked') return;

            const bookNo = this.getAttribute('data-bookno');
            const title = this.getAttribute('data-title');
            const cover = this.getAttribute('data-cover');
            const exists = cart.find(item => item.bookNo === bookNo);
            
            if (!exists) {
                cart.push({ bookNo, title, cover });
                this.innerText = "✓ Added";
                this.classList.remove('btn-outline-primary');
                this.classList.add('btn-success');
                saveCart();
            }
        });
    });
}

function saveCart() {
    localStorage.setItem('campusLibraryCart', JSON.stringify(cart));
    updateCartUI();
}

function initCartUI() {
    updateCartUI();
    // Update button states if items are already in cart
    document.querySelectorAll('.borrow-btn').forEach(button => {
        const bookNo = button.getAttribute('data-bookno');
        if (cart.find(item => item.bookNo === bookNo)) {
            button.innerText = "✓ Added";
            button.classList.remove('btn-outline-primary');
            button.classList.add('btn-success');
        }
    });
}

function updateCartUI() {
    const cartBadge = document.getElementById('cartBadge');
    const cartItemsList = document.getElementById('cartItemsList');
    
    cartBadge.innerText = cart.length;

    if (cart.length === 0) {
        cartItemsList.innerHTML = `
          <div class="text-center text-muted mt-5 py-5">
            <h1 class="display-4 opacity-50 mb-3"><i class="bi bi-cart"></i></h1>
            <p>Your cart is empty.</p>
            <p class="small">Click 'Add to Cart' on a book to add it here.</p>
          </div>
        `;
        return;
    }

    let html = '';
    cart.forEach((item, index) => {
        html += `
           <div class="card shadow-sm border-0 mb-2">
                <div class="card-body p-2 d-flex align-items-center">
                    <img src="${item.cover}" alt="Cover" class="rounded me-3 shadow-sm" style="width: 45px; height: 65px; object-fit: cover; aspect-ratio: 2/3;">
                    <div class="flex-grow-1" style="min-width: 0;">
                        <h6 class="fw-bold mb-0 text-truncate" style="font-size: 0.9rem;" title="${item.title}">${item.title}</h6>
                        <small class="text-muted" style="font-size: 0.75rem;">ID: ${item.bookNo}</small>
                    </div>
                    <button class="btn btn-sm btn-outline-danger border-0 ms-2 flex-shrink-0" id="remove-btn-${index}" title="Remove">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItemsList.innerHTML = html;

    // Attach remove listeners dynamically
    cart.forEach((item, index) => {
        document.getElementById(`remove-btn-${index}`).addEventListener('click', () => removeFromCart(index, item.bookNo));
    });
}

function removeFromCart(index, bookNo) {
    cart.splice(index, 1);
    const gridBtn = document.querySelector(`.borrow-btn[data-bookno="${bookNo}"]`);
    if (gridBtn) {
        gridBtn.innerText = "+ Add to Cart";
        gridBtn.classList.remove('btn-success');
        gridBtn.classList.add('btn-outline-primary');
    }
    saveCart();
}

window.discardCart = function() {
    if (cart.length === 0) {
        Swal.fire('Cart is empty!', 'Nothing to discard.', 'info');
        return;
    } 
    Swal.fire({
        title: 'Clear Cart?',
        text: "Are you sure you want to remove all books from your cart?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',  
        confirmButtonText: 'Yes, clear it!'
    }).then((result) => {
        if (result.isConfirmed) {
            cart = []; 
            localStorage.removeItem('campusLibraryCart'); 
            
            document.querySelectorAll('.borrow-btn.btn-success').forEach(btn => {
                btn.innerText = "+ Add to Cart";
                btn.classList.remove('btn-success');
                btn.classList.add('btn-outline-primary');
            });
            updateCartUI();

            Swal.fire({
                title: 'Cleared!',
                text: 'Your cart is now empty.',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false
            });
            
        }
        
    });
};

window.submitCart = async function() {
    // stop user if the account is blocked
    if (currentAccountStatus === 'Blocked') {
        Swal.fire('Account Blocked', 'You cannot request books while your account is blocked. Please contact the librarian.', 'error');
        return;
    }

    if (cart.length === 0) {
        Swal.fire('Cart is empty!', 'Please add some books before submitting.', 'info');
        return;
    } 

    Swal.fire({
        title: 'Submit Request?',
        text: `You are about to request ${cart.length} book(s) from the library.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754', 
        confirmButtonText: 'Yes, submit request!'
    }).then(async (sweetResult) => {
        if (sweetResult.isConfirmed) {
            const submitBtn = document.getElementById('submitCartBtn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';
            
            try {
                // We loop through the cart and create a NoSQL document for each requested book
                for (const item of cart) {
                    await addDoc(collection(db, "book_requests"), {
                        roll_no: currentStudentRollNo,
                        book_no: item.bookNo,
                        request_date: serverTimestamp(),
                        status: 'Pending'
                    });
                }

                // Clear the UI cart
                cart = [];
                localStorage.removeItem('campusLibraryCart');
                
                Swal.fire({
                    title: 'Success!',
                    text: 'Your request has been sent to the librarian!',
                    icon: 'success',
                    confirmButtonColor: '#198754'
                }).then(() => {
                    window.location.href = "student_my_books.html"; 
                });
                
            } catch (error) {
                console.error("Error submitting to Firebase:", error);
                Swal.fire('Error', 'Failed to connect to the cloud database.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Submit Request";
            }
        }
    });
};