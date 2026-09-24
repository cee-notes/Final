# MEC CEE Bachelor Level Practice Portal

A comprehensive, free-to-use online mock test platform designed specifically for **MEC CEE (Medical Education Commission Common Entrance Examination)** aspirants in Nepal. This system helps students prepare for MBBS, BDS, Nursing, and Public Health Service bachelor-level entrance exams through timed mocks, detailed analytics, and a robust question bank.

🌐 **Live Portal**: [https://cee-notes.github.io/Final/](https://cee-notes.github.io/Final/)  
📂 **Source Code**: [GitHub Repository](https://github.com/cee-notes/Final)

---

## 🎯 Objective

To provide Nepali medical aspirants with a realistic exam simulation environment that mirrors the **MEC CEE pattern**, offering:
- **Timed Mock Tests** simulating the actual 2-hour exam duration.
- **Negative Marking** logic (+1 for correct, -0.25 for wrong).
- **Detailed Performance Analytics** to identify weak areas in Physics, Chemistry, Biology, and English.
- **Teacher/Admin Dashboard** for managing question banks and student progress.

---

## ✨ Key Features

### 👨‍🎓 For Students (Aspirants)
1. **Realistic Exam Interface**:
   - Timer-based countdown (configurable, default 120 mins).
   - Question palette (Answered, Marked for Review, Not Visited).
   - Keyboard shortcuts for faster navigation (`A-D` for options, `M` to mark).
2. **Instant Results & Analysis**:
   - Total Score, Accuracy %, and Rank estimation.
   - Section-wise breakdown (Physics, Chemistry, Biology, English).
   - Detailed solution review with explanations after submission.
3. **Progress Tracking**:
   - Historical attempt history.
   - Weak topic identification (e.g., "Weak in Optics" or "Strong in Genetics").
   - Leaderboard to compare performance with peers.
4. **Custom Practice**:
   - Practice specific subjects or topics individually.
   - Retry previously attempted questions.

### 👨‍🏫 For Teachers / Admins
1. **Student Management**:
   - Approve/Reject new student registrations.
   - View individual student progress and activity logs.
2. **Question Bank Management**:
   - **Add Questions**: Create MCQs with images, explanations, and topic tags.
   - **Bulk Upload**: Import questions via CSV/Excel.
   - **PDF Builder**: Extract text from syllabus PDFs to create questions.
   - **Edit/Delete**: Manage existing questions easily.
3. **Class Analytics**:
   - Overall class performance metrics.
   - Identify common weak topics across all students.
   - Export data to CSV for offline analysis.

---

## 📚 MEC CEE Syllabus Coverage

The portal supports the standard MEC CEE Bachelor Level syllabus structure:

| Subject | Topics Covered | Micro-Syllabus Codes |
| :--- | :--- | :--- |
| **Physics** | Mechanics, Heat, Light, Electricity, Modern Physics | P1–P8 |
| **Chemistry** | Physical, Inorganic, Organic Chemistry | C1–C7 |
| **Biology** | Zoology (Human Physiology, Genetics) & Botany | Z1–Z9, B1–B6 |
| **English** | Grammar, Vocabulary, Comprehension | E1–E5 |

*(Note: Topic codes can be customized in the backend to match specific college syllabi.)*

---

## 🚀 Quick Start & Demo

### 🔑 Demo Credentials
Use these accounts to test the platform immediately:

**Teacher/Admin:**
- Email: `teacher@cee.edu`
- Password: `demo1234`

**Students:**
- Email: `student@cee.edu` | `aayush@cee.edu` | `sabina@cee.edu`
- Password: `demo1234`

**Pending Account:**
- Email: `pending@cee.edu` (Requires admin approval to login)

---

## 🛠️ Technical Architecture

This project uses a **Serverless Architecture** to ensure zero hosting costs and high reliability.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) | Responsive UI, Exam Engine, Dashboards |
| **Hosting** | GitHub Pages | Free static site hosting |
| **Backend API** | Google Apps Script (GAS) | Handles logic, authentication, scoring |
| **Database** | Google Sheets | Stores Users, Questions, Attempts, Responses |
| **Email Service** | Gmail (via MailApp) | Sends registration approvals and result reports |

### File Structure
```text
Final/
├── index.html              # Main Single Page Application (SPA)
├── style.css               # Dark-themed responsive styling
├── script.js               # Frontend logic & API calls
├── cee_mock_all_in_one.gs  # Main Backend Logic (Auth, Exam, Scoring)
├── model_exam_engine.gs    # Exam Engine & Question Randomization
├── code.gs                 # Utility functions & Helpers
├── CNAME                   # Custom domain configuration (optional)
└── README.md               # Project documentation
