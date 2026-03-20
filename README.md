# Library-management-system
Digital Library Management System, where students can digitally browse campus library books catalog and request for selected books digitally.

# Live Website:
https://campus-library-app.web.app/

# Languages:
1. HTML
2. CSS
3. JAVASCRIPT

# Back-End/Database:
1. FIREBASE/FIRESTORE

# Dependencies:
1. Bootstrap 5 (Front-End UI)
2. Sweetalert2 (Replaces javascript default popup boxes)
3. Mailjet/MailJS API (Email Delivery)
4. QR generation API (Generates QR code for Digital Library Card)

# Features:
1. Admin Panel: 
   - Admin Dashboard ( Scan QR codes to see students pending book requests, issue selected books or cancel requests)
   - Manage Student ( Student Directory - view list of registered students, access their borrowung histoty to check active, overdue or returned status of the books,
                      Return button to update stock and mark book as returned, Alert button to notify students about their books overdue, Search & Filter students (Active,Overdue,Clear))
   - Manage Books ( View list of added books, Add new books, Update existing books, Search & Filter books by branch, title, book id, author etc)
2. Student Panel:
   - Student Dashboard ( Generated QR Code of Digital library card, Library Announcements)
   - Books Catalog ( Display books as Cards in Grid, Add to Cart, Cart System for selected books submission, Search & Filter books categories)
   - My Books ( View in tabs currently borrowed books, pending requests and cancel button, History for list of returned books)
3. Hidden features:
   - Automatically checks for Overdues as admin or student logins to their portals and mark blocked if (overdue exceeds > 2) makes students unable to add or submit book requests until the physicsl copies are returned)
   - Automatically Sends Email to the newly registered students by the admin with Welcome message and login details ( Currently emails are sent using personal email id so it gets marked as spam in the inbox - needs custom domain to avoid such issues)
   - Base64 Encoding to convert Image to Text to efficiently store converted Text as URL without using any cloud storage for uploaded books cover images (This also risks exceeding free doc storage of firebase) this is only for demonstration purpose might change it later to cloud storage)

# Authentication:
  - Uses firebase default authentication system (Email/Password login)
  - Since firebase authentication uses Email as user id, we have tricked system to use Roll-No instead)
