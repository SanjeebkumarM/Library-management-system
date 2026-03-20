# Campus Digital Library System 📚

A comprehensive Digital Library Management System that allows students to digitally browse the campus catalog, request physical books, and manage their borrowing history, while providing librarians with a robust suite of management tools.

**🚀 Live Application:** [Campus Library App](https://campus-library-app.web.app/)



---

## 💻 Tech Stack & Dependencies

**Core Languages:** HTML5, CSS3, Vanilla JavaScript
**Backend & Database:** Google Firebase Authentication & Cloud Firestore (NoSQL)

**Key Dependencies & APIs:**
* **Bootstrap 5:** For a fully responsive, mobile-first frontend UI.
* **SweetAlert2:** Replaces default JavaScript browser alerts with beautiful, customizable popup modals.
* **EmailJS:** Handles automated transactional email delivery without a backend server.
* **QR Code API:** Dynamically generates unique QR codes for Digital Library Cards and request processing.

---

## ✨ System Features

### 🛡️ Admin Panel (Librarian Dashboard)
* **Request Processing:** Scan student QR codes to view pending book requests, issue selected physical books, or cancel requests.
* **Student Directory:** View all registered students and access detailed borrowing histories. Check active, overdue, or returned statuses.
* **Overdue Management:** One-click alert buttons to notify students about overdue books. Filter students by status (Active, Overdue, Clear).
* **Inventory Control:** Full CRUD access to the book catalog. Add new books, update existing metadata, and search/filter the database by branch, title, author, or Book ID.



### 🎓 Student Panel
* **Student Dashboard:** Displays the student's auto-generated Digital Library Card (QR Code) and global library announcements.
* **Interactive Catalog:** Books are displayed as interactive cards in a grid layout. Features a complete Cart System allowing students to queue multiple books before submitting a final request.
* **My Books Hub:** A tabbed interface allowing students to track currently borrowed books, view/cancel pending requests, and access their complete return history.



---

## ⚙️ Automated System Logic & Architecture

Behind the scenes, the application utilizes several advanced logical flows to maintain library rules and optimize the database:

* **Custom Authentication Flow:** While Firebase Auth strictly requires an email address, this system features a custom script that allows students to log in strictly using their **Roll Number**. The system dynamically converts the Roll Number into a backend ID, maintaining security while simulating a true university portal experience.
* **Automated Penalty Enforcement:** Upon logging in (as either a student or admin), the system automatically audits the database for overdue timelines. If a student's overdue count exceeds 2 books, their account is dynamically marked as "Blocked," disabling their ability to add books to their cart or submit new requests until physical copies are returned.
* **Automated Onboarding Emails:** When an Admin registers a new student, the system triggers an EmailJS payload, automatically sending the student a welcome message containing their Digital Library Card Number and initial login credentials. *(Note: Currently utilizing a standard email sender; custom domain integration is planned for strict spam-filter compliance).*
* **Base64 Image Encoding:** To minimize external storage dependencies, book cover images uploaded by the Admin are converted into Base64 encoded text strings and stored directly within the Firestore database document. *(Note: This is a demonstration of data serialization; production environments with large image assets may migrate to Firebase Cloud Storage to optimize document size limits).*

---

## 🗄️ Database Architecture (Cloud Firestore)

The application utilizes a NoSQL document structure:
* `students/`: Documents are keyed by Roll Number to prevent duplicates. Stores demographic data, real contact emails, and digital card numbers.
* `books/`: Stores catalog inventory, tracking total copies, available copies, and base64/URL cover images. Security rules prevent unauthorized modifications.

---

## 📄 License
This project is for educational and demonstration purposes.
