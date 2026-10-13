# 🎓 EduTrack

**Attendance, grades and records, in real time.**

EduTrack is a centralized, role-based academic management portal built for a hackathon. It replaces paper registers and scattered spreadsheets with one live system for administrators, faculty and students.

---

## 📌 Problem Statement

In most educational institutions, attendance, grade management and student record-keeping are still handled manually or through disconnected files.

- **Faculty** spend time on paper registers and separate spreadsheets, where missed entries and wrong calculations are common.
- **Students** can't see their attendance percentage until it becomes critically low, and report cards can take days or weeks to arrive.
- **Administrators** struggle to keep accurate staff, student and course records across multiple registers, risking data loss and duplication.

## 💡 Our Solution

EduTrack gives every stakeholder a single source of truth with real-time access:

| Role | What they get |
|------|---------------|
| 👩‍🏫 **Faculty** | One-click attendance marking, a grade entry grid with auto-calculation, and instant report cards |
| 🎒 **Student** | Live attendance per course, low-attendance warnings, marks and charts, and a printable report card |
| 🛠️ **Admin** | Institution-wide stats, an "at-risk students" list, grade distribution and student management |

---

## ✨ Core Features

### 1. One-Click Attendance (Faculty)
- Choose a course and date, then toggle Present/Absent per student
- "Mark All Present" shortcut
- Duplicate-safe: saving again for the same course, student and date updates the record

### 2. Grade Entry and Instant Report Card (Faculty)
- Enter marks per student, course and exam in a simple grid
- Auto-calculated total, percentage, grade (A+/A/B/C/F) and pass/fail
- Clean, printable report card with overall attendance, using **Print / Save as PDF**

### 3. Real-Time Dashboards (Student and Admin)
- **Student:** attendance progress per course, a ⚠ low-attendance badge under 75% with classes needed to recover, a marks table and chart
- **Admin:** summary cards, an at-risk students table, a grade distribution chart and an Add Student form
- **Bonus API:** a "Quote of the Day" card powered by [ZenQuotes](https://zenquotes.io) (no API key needed, with an offline fallback)

---

## 🛠️ Tech Stack

- **Backend:** Python 3, Flask
- **Database:** SQLite
- **Frontend:** HTML5, CSS3, vanilla JavaScript, Jinja2 templates
- **Charts:** Chart.js (CDN)
- **Icons:** Lucide / Font Awesome (CDN)
- **External API:** ZenQuotes (free)

---

## 📁 Project Structure

```
edutrack/
├── app.py              # Flask app, routes, DB setup and seed data
├── edutrack.db         # SQLite database (auto-created on first run)
├── requirements.txt
├── templates/          # Jinja2 HTML templates
│   ├── base.html
│   ├── landing.html
│   ├── attendance.html
│   ├── grades.html
│   ├── report.html
│   ├── student_dashboard.html
│   └── admin.html
├── static/
│   ├── css/style.css
│   └── js/app.js
└── README.md
```

---

## 🚀 Getting Started

### Run on Replit
1. Import this repo into Replit
2. Click **Run**
3. Open the web preview. The database is created and seeded automatically.

### Run locally

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/edutrack.git
cd edutrack

# 2. (Optional) create a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the app
python app.py
```

Then open **http://localhost:5000**.

---

## 🎬 60-Second Demo Script

1. **Landing page:** pick a role from the **Switch Role** dropdown.
2. **Faculty → Attendance:** choose a course, mark a student absent, hit **Save**.
3. **Faculty → Grades:** enter marks and watch totals and grades calculate instantly.
4. **Switch to Student:** see the attendance percentage drop and the ⚠ warning appear. Open the **Report Card** and print it.
5. **Switch to Admin:** view the at-risk students table and the grade distribution chart, then add a new student.

> No login is required. The role switcher is used for demo purposes only.

---

## 🗄️ Seed Data

On first run, the app creates:
- 12 students (class CSE-A)
- 5 courses and 3 faculty members
- 20 days of attendance records, with a few students deliberately below 75%
- Midterm and Final marks for every student and course

---

## 🔮 Future Scope

- Secure authentication with real role-based access
- Email/SMS alerts for low attendance
- Parent portal
- Timetable and leave management
- Export to Excel/CSV and bulk import
- Cloud database (PostgreSQL) for multi-institution deployment

---

## 👥 Team

| Name | Role |
|------|------|
| `<Name>` | `<Role>` |
| `<Name>` | `<Role>` |
| `<Name>` | `<Role>` |

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">Built with ❤️ during <b>&lt;Hackathon Name&gt;</b></p>
