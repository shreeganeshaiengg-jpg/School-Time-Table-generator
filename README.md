# School Timetable Generator

An automated, intelligent school timetable generator that leverages **Constraint Programming (CP-SAT)** optimization and randomized search heuristics to create optimal, conflict-free schedules for classes and teachers.

---

## 🛠️ Project Structure & Architecture

The application is split into a **Python Flask backend** (which handles constraint optimization using Google's OR-Tools) and a **Vanilla JavaScript frontend** (which manages user input, handles state, and renders the dynamic scheduling grids).

### File Directory

- 📄 [app.py](file:///c:/Users/shree/Desktop/Time_Table/app.py) — The Python backend serving API requests, validating constraints, and running the CP-SAT solver/heuristic fallback.
- 📁 `static/`
  - 📁 `js/`
    - 📄 [app.js](file:///c:/Users/shree/Desktop/Time_Table/static/js/app.js) — The frontend script managing page logic, state representation, demo loading, validation, API communication, and layout rendering.
  - 📁 `css/`
    - 📄 [style.css](file:///c:/Users/shree/Desktop/Time_Table/static/css/style.css) — Stylesheets powering the premium dark-mode or responsive UI design.
- 📁 `templates/`
  - 📄 [index.html](file:///c:/Users/shree/Desktop/Time_Table/templates/index.html) — The template webpage containing layout forms, controls, grids, and print styles.
- 📄 [requirements.txt](file:///c:/Users/shree/Desktop/Time_Table/requirements.txt) — List of required Python dependencies.

---

## 🐍 Backend Architecture: [app.py](file:///c:/Users/shree/Desktop/Time_Table/app.py)

The backend handles core math solver operations and serves Flask routes:

### 1. Flask Routes
- **`GET /`** (`index` function): Renders the main interface index page.
- **`POST /api/generate`** (`generate_timetable` function): Receives configuration details via JSON, performs validation, sets up the constraint satisfaction problem, runs the solver, and returns results.

### 2. Validation Checks
Before attempting to schedule, the backend enforces sanity checks to ensure a valid schedule is mathematically possible:
* **Weekly Hour Checks:** Verifies that total weekly hours assigned to subjects in a single class do not exceed the total available periods (`days * periods_per_day`).
* **Lab Configuration Validation:** Confirms continuous lab hours are less than or equal to the daily periods and that total weekly hours for a lab are a multiple of its continuous chunk duration.

### 3. Google OR-Tools CP-SAT Solver Constraints
The core optimization model runs on Google OR-Tools:
* **Decision Variables (`X[subject_index, day, period]`):** Boolean variable indicating whether a subject assignment `i` is scheduled on day `d` at period `p`.
* **Lab block helper variables (`Y[subject_index, day, period]`):** Tracks where a multi-hour lab block starts.
* **Hard Constraints:**
  1. **Weekly Hours:** Sum of periods scheduled for subject `i` must exactly equal its `weekly_hours` target.
  2. **Lab Blocks:** Lab subjects requiring consecutive hours (e.g., 2 continuous hours) are scheduled as a single block that does not split across breaks/days, nor overlaps with another block of the same lab.
  3. **Class Scheduling Conflict:** A class (section) can have at most one subject scheduled per period.
  4. **Teacher Conflict:** A teacher can be scheduled to teach at most one class per period (preventing double-booking).
  5. **Daily Limit:** Limits how many times a subject can be scheduled on the same day (e.g., a 4-hour subject is limited to a maximum of 1 or 2 periods per day so students are not overwhelmed).
  6. **No Consecutive Theory Periods:** Prevents consecutive double periods of the same theory subject.
* **Optimization Objectives:**
  * **Minimize Teacher Gaps:** Penalizes and reduces instances where a teacher has free gaps between their scheduled teaching periods.
  * **Class Free Periods:** Pushes class free periods towards the end of the day.

### 4. Heuristic Fallback Algorithm (`generate_timetable_heuristic`)
If the CP-SAT solver is unable to find a mathematically feasible solution within the timeout limit (5 seconds), the engine falls back to a **Randomized Heuristic Constraint Satisfaction Algorithm**.
- It simulates multiple randomized trials (up to 2,000 trials).
- Iteratively places lab blocks and theory tasks, validating state constraints on each slot.
- If a complete timetable is successfully generated during any trial, it is returned immediately.

---

## 🌐 Frontend Architecture: [app.js](file:///c:/Users/shree/Desktop/Time_Table/static/js/app.js)

The client script manages state, controls interactions, communicates with the backend, and renders HTML components dynamically.

### 1. Application State Variables
* `sections`: Array storing all class names (e.g. `["Grade 10-A", "Grade 10-B"]`).
* `teachers`: Array storing unique teacher names.
* `masterSubjects`: Configured subjects, storing flags for labs and consecutive hours.
* `subjects`: Class-specific subject assignments mapping class, subject name, teacher, and weekly hours.
* `timetables` & `teacherTimetables`: Stored response grids fetched from backend.

### 2. Interaction Handlers
* **Dynamic Forms:** Add/Remove classes, teachers, subjects, and assignments in real-time. Cascade delete operations automatically clean up dependent assignments if a parent teacher, class, or subject is removed.
* **Demo Data Loader (`loadDemoData`):** Auto-populates complex, pre-validated dummy details containing 7 teachers, 2 classes, and multiple theory & lab assignments (2-hour continuous blocks) so users can test the application instantly.
* **Print Support:** Handles print styles via window printing context, enabling the physical printing of clean grids.

### 3. Rendering Engine
* **Tabbed Navigation:** Updates views between class-specific timetables and teacher-specific timetables.
* **Dynamic Grid Compilation (`renderTimetableGrid`):** Generates clean tables showing days of the week on rows and period slots as columns. Free periods are automatically marked with special styles, and labs display distinct layout badges.

---

## 🚀 Setup & Execution Guide

Follow these steps to run the application locally on your Windows computer:

### 1. Navigate to the Directory
Open **PowerShell** or **Command Prompt** and navigate to your project directory:
```powershell
cd "c:\Users\shree\Desktop\Time_Table"
```

### 2. Set Up a Virtual Environment (Optional but Recommended)
Create and activate an isolated virtual environment to avoid package version conflicts:
```powershell
# Create the virtual environment
python -m venv venv

# Activate the virtual environment:
# - In PowerShell:
.\venv\Scripts\Activate.ps1
# - In Command Prompt (CMD):
.\venv\Scripts\activate.bat
```
*(If you run into a PowerShell execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first, then run the activation script.)*

### 3. Install Dependencies
Install all required libraries specified in [requirements.txt](file:///c:/Users/shree/Desktop/Time_Table/requirements.txt):
```powershell
pip install -r requirements.txt
```

### 4. Start the Flask Server
Run the python startup script:
```powershell
python app.py
```
Upon successful execution, the console will log:
`* Running on http://127.0.0.1:5000`

### 5. Access the Web App
Open your web browser of choice and go to:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)** or **[http://localhost:5000](http://localhost:5000)**
