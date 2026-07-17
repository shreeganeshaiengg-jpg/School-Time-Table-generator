// === APPLICATION STATE ===
const sections = []; // Stores section names, e.g. ["Grade 10-A", "Grade 10-B"]
const teachers = []; // Stores teacher names, e.g. ["Mr. Alan", "Mrs. Baker"]
const masterSubjects = []; // Stores master subject objects, e.g. [{name: "Maths", is_lab: false, continuous_hours: 1}]
const subjects = []; // Stores class subject assignments
let timetables = null; // Stores class timetables returned by server
let teacherTimetables = null; // Stores teacher timetables returned by server
let workingDays = []; // Stores working days in use
let periodsPerDay = 7; // Periods per day
let activeTab = ""; // Currently selected class or teacher tab

// === HTML ELEMENT REFERENCES ===
const elements = {
    daysSelector: document.getElementById('daysSelector'),
    periodsPerDay: document.getElementById('periodsPerDay'),
    sectionInput: document.getElementById('sectionInput'),
    btnAddSection: document.getElementById('btnAddSection'),
    sectionsList: document.getElementById('sectionsList'),
    teacherInput: document.getElementById('teacherInput'),
    btnAddTeacher: document.getElementById('btnAddTeacher'),
    teachersList: document.getElementById('teachersList'),
    masterSubjectInput: document.getElementById('masterSubjectInput'),
    masterSubjectIsLab: document.getElementById('masterSubjectIsLab'),
    masterLabContinuousContainer: document.getElementById('masterLabContinuousContainer'),
    masterSubjectContinuous: document.getElementById('masterSubjectContinuous'),
    btnAddMasterSubject: document.getElementById('btnAddMasterSubject'),
    masterSubjectsList: document.getElementById('masterSubjectsList'),
    subjectSection: document.getElementById('subjectSection'),
    subjectName: document.getElementById('subjectName'),
    subjectTeacher: document.getElementById('subjectTeacher'),
    subjectHours: document.getElementById('subjectHours'),
    btnAddSubject: document.getElementById('btnAddSubject'),
    subjectsList: document.getElementById('subjectsList'),
    btnGenerate: document.getElementById('btnGenerate'),
    btnQuickFill: document.getElementById('btnQuickFill'),
    alertContainer: document.getElementById('alertContainer'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    outputPanel: document.getElementById('outputPanel'),
    viewToggle: document.getElementById('viewToggle'),
    tabsContainer: document.getElementById('tabsContainer'),
    timetableGrid: document.getElementById('timetableGrid'),
    btnPrint: document.getElementById('btnPrint')
};

// === INITIALIZATION & LISTENERS ===
document.addEventListener('DOMContentLoaded', () => {
    // Show/hide continuous lab hours input based on checkbox (in master section)
    elements.masterSubjectIsLab.addEventListener('change', () => {
        elements.masterLabContinuousContainer.style.display = elements.masterSubjectIsLab.checked ? 'block' : 'none';
    });

    // Add class section button click
    elements.btnAddSection.addEventListener('click', addSection);

    // Add teacher button click
    elements.btnAddTeacher.addEventListener('click', addTeacher);

    // Add master subject button click
    elements.btnAddMasterSubject.addEventListener('click', addMasterSubject);

    // Add subject assignment button click
    elements.btnAddSubject.addEventListener('click', addSubject);

    // Generate timetable click
    elements.btnGenerate.addEventListener('click', generateTimetable);

    // Load Demo Data click
    elements.btnQuickFill.addEventListener('click', loadDemoData);

    // View Toggle select change (Class vs Teacher)
    elements.viewToggle.addEventListener('change', () => {
        activeTab = ""; // Reset active tab when toggling views
        renderTabs();
    });

    // Print button click
    elements.btnPrint.addEventListener('click', () => {
        window.print();
    });
});

// === HELPER FUNCTIONS ===

// Display alert messages on the page
function showAlert(message, type = 'danger') {
    elements.alertContainer.innerHTML = `
        <div class="alert-message alert-${type}">
            ${message}
        </div>
    `;
    // Scroll to top where alert is placed
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAlerts() {
    elements.alertContainer.innerHTML = '';
}

// Add class to the list
function addSection() {
    const sectionName = elements.sectionInput.value.trim();
    if (!sectionName) {
        showAlert("Class name cannot be empty!");
        return;
    }
    if (sections.includes(sectionName)) {
        showAlert("This class name already exists!");
        return;
    }

    sections.push(sectionName);
    elements.sectionInput.value = ""; // Clear input
    clearAlerts();
    
    renderSectionsList();
    updateSectionDropdown();
}

// Render class list on page
function renderSectionsList() {
    if (sections.length === 0) {
        elements.sectionsList.innerHTML = `<div style="color: #999; padding: 5px;">No classes added yet.</div>`;
        return;
    }

    let html = "";
    sections.forEach((sec, idx) => {
        html += `
            <div class="list-item">
                <span>${sec}</span>
                <button class="danger" onclick="removeSection(${idx})">Delete</button>
            </div>
        `;
    });
    elements.sectionsList.innerHTML = html;
}

// Remove class from the list
window.removeSection = function(index) {
    const secName = sections[index];
    sections.splice(index, 1);
    
    // Remove all subjects belonging to deleted class
    for (let i = subjects.length - 1; i >= 0; i--) {
        if (subjects[i].section === secName) {
            subjects.splice(i, 1);
        }
    }
    
    renderSectionsList();
    updateSectionDropdown();
    clearAlerts();
};

// Update dropdown menu options for section selection
function updateSectionDropdown() {
    let html = '<option value="">-- Select Class --</option>';
    sections.forEach(sec => {
        html += `<option value="${sec}">${sec}</option>`;
    });
    elements.subjectSection.innerHTML = html;
}

// Add teacher to the list
function addTeacher() {
    const teacherName = elements.teacherInput.value.trim();
    if (!teacherName) {
        showAlert("Teacher name cannot be empty!");
        return;
    }
    if (teachers.includes(teacherName)) {
        showAlert("This teacher name already exists!");
        return;
    }

    teachers.push(teacherName);
    elements.teacherInput.value = "";
    clearAlerts();

    renderTeachersList();
    updateTeacherDropdown();
}

// Render teacher list on page
function renderTeachersList() {
    if (teachers.length === 0) {
        elements.teachersList.innerHTML = `<div style="color: #999; padding: 5px;">No teachers added yet.</div>`;
        return;
    }

    let html = "";
    teachers.forEach((tchr, idx) => {
        html += `
            <div class="list-item">
                <span>${tchr}</span>
                <button class="danger" onclick="removeTeacher(${idx})">Delete</button>
            </div>
        `;
    });
    elements.teachersList.innerHTML = html;
}

// Remove teacher from the list
window.removeTeacher = function(index) {
    const name = teachers[index];
    teachers.splice(index, 1);

    // Cascade delete subjects assigned to deleted teacher
    for (let i = subjects.length - 1; i >= 0; i--) {
        if (subjects[i].teacher === name) {
            subjects.splice(i, 1);
        }
    }

    renderTeachersList();
    updateTeacherDropdown();
    renderSubjectsList();
    clearAlerts();
};

// Update dropdown menu options for teacher selection
function updateTeacherDropdown() {
    let html = '<option value="">-- Select Teacher --</option>';
    teachers.forEach(tchr => {
        html += `<option value="${tchr}">${tchr}</option>`;
    });
    elements.subjectTeacher.innerHTML = html;
}

// Add master subject to the list
function addMasterSubject() {
    const subjectName = elements.masterSubjectInput.value.trim();
    const isLab = elements.masterSubjectIsLab.checked;
    const continuous = isLab ? parseInt(elements.masterSubjectContinuous.value) : 1;

    if (!subjectName) {
        showAlert("Subject name cannot be empty!");
        return;
    }
    // Check if name already exists (case-insensitive)
    const exists = masterSubjects.some(sub => sub.name.toLowerCase() === subjectName.toLowerCase());
    if (exists) {
        showAlert("This subject name already exists!");
        return;
    }
    if (isLab && (isNaN(continuous) || continuous <= 0)) {
        showAlert("Continuous hours must be a positive number!");
        return;
    }

    masterSubjects.push({
        name: subjectName,
        is_lab: isLab,
        continuous_hours: continuous
    });

    // Reset inputs
    elements.masterSubjectInput.value = "";
    elements.masterSubjectIsLab.checked = false;
    elements.masterSubjectIsLab.dispatchEvent(new Event('change'));
    clearAlerts();

    renderMasterSubjectsList();
    updateSubjectDropdown();
}

// Render master subjects list
function renderMasterSubjectsList() {
    if (masterSubjects.length === 0) {
        elements.masterSubjectsList.innerHTML = `<div style="color: #999; padding: 5px;">No subjects defined yet.</div>`;
        return;
    }

    let html = "";
    masterSubjects.forEach((sub, idx) => {
        const typeLabel = sub.is_lab ? ` [Lab: ${sub.continuous_hours}h]` : ' [Theory]';
        html += `
            <div class="list-item">
                <span>${sub.name}${typeLabel}</span>
                <button class="danger" onclick="removeMasterSubject(${idx})">Delete</button>
            </div>
        `;
    });
    elements.masterSubjectsList.innerHTML = html;
}

// Remove subject from master list (with cascade delete for assignments)
window.removeMasterSubject = function(index) {
    const name = masterSubjects[index].name;
    masterSubjects.splice(index, 1);

    // Cascade delete any assignments matching this subject name
    for (let i = subjects.length - 1; i >= 0; i--) {
        if (subjects[i].name.toLowerCase() === name.toLowerCase()) {
            subjects.splice(i, 1);
        }
    }

    renderMasterSubjectsList();
    updateSubjectDropdown();
    renderSubjectsList();
    clearAlerts();
};

// Update dropdown menu options for subject selection
function updateSubjectDropdown() {
    let html = '<option value="">-- Select Subject --</option>';
    masterSubjects.forEach(sub => {
        html += `<option value="${sub.name}">${sub.name}</option>`;
    });
    elements.subjectName.innerHTML = html;
}

// Add a subject assignment
function addSubject() {
    const section = elements.subjectSection.value;
    const name = elements.subjectName.value;
    const teacher = elements.subjectTeacher.value;
    const hours = parseInt(elements.subjectHours.value);

    // Basic Validation
    if (!section) return showAlert("Please select a class!");
    if (!name) return showAlert("Please select a subject!");
    if (!teacher) return showAlert("Please select a teacher!");
    if (isNaN(hours) || hours <= 0) return showAlert("Weekly hours must be a positive number!");
    
    // Look up lab details from the master subject record
    const master = masterSubjects.find(sub => sub.name === name);
    if (!master) return showAlert("Selected subject does not exist in master list!");
    
    const isLab = master.is_lab;
    const continuous = master.continuous_hours;

    if (isLab && hours % continuous !== 0) {
        return showAlert(`Weekly hours must be divisible by continuous lab hours (${continuous})!`);
    }

    // Add subject object to list
    subjects.push({
        section,
        name,
        teacher,
        weekly_hours: hours,
        is_lab: isLab,
        continuous_hours: continuous
    });

    // Reset inputs
    elements.subjectName.value = "";
    elements.subjectTeacher.value = "";
    elements.subjectHours.value = "5";
    clearAlerts();

    renderSubjectsList();
    showAlert(`Added ${name} for ${section} successfully!`, "success");
}

// Render added subjects list (Class assignments)
function renderSubjectsList() {
    if (subjects.length === 0) {
        elements.subjectsList.innerHTML = `<div style="color: #999; padding: 5px;">No subjects added yet.</div>`;
        return;
    }

    let html = "";
    subjects.forEach((sub, idx) => {
        const labLabel = sub.is_lab ? ` [Lab: ${sub.continuous_hours}h]` : '';
        html += `
            <div class="list-item">
                <div style="font-size: 13px;">
                    <strong>${sub.name}</strong> (${sub.section}) - ${sub.teacher} | ${sub.weekly_hours}h${labLabel}
                </div>
                <button class="danger" onclick="removeSubject(${idx})">Delete</button>
            </div>
        `;
    });
    elements.subjectsList.innerHTML = html;
}

// Remove subject assignment
window.removeSubject = function(index) {
    subjects.splice(index, 1);
    renderSubjectsList();
    clearAlerts();
};

// Load Demo School data so user can quickly test generator
function loadDemoData() {
    clearAlerts();
    
    // Set 5 working days
    const checkboxes = elements.daysSelector.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.checked = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(cb.value);
    });

    // Set 7 periods per day
    elements.periodsPerDay.value = 7;

    // Load sample classes
    sections.length = 0;
    sections.push("Grade 10-A", "Grade 10-B");
    renderSectionsList();
    updateSectionDropdown();

    // Load sample teachers
    teachers.length = 0;
    teachers.push("Mr. Alan", "Mrs. Baker", "Dr. Carter", "Ms. Davis", "Mrs. Foster", "Mr. Green", "Mr. Harris");
    renderTeachersList();
    updateTeacherDropdown();

    // Load sample master subjects
    masterSubjects.length = 0;
    masterSubjects.push({ name: "Mathematics", is_lab: false, continuous_hours: 1 });
    masterSubjects.push({ name: "English", is_lab: false, continuous_hours: 1 });
    masterSubjects.push({ name: "Physics", is_lab: false, continuous_hours: 1 });
    masterSubjects.push({ name: "Biology Lab", is_lab: true, continuous_hours: 2 });
    masterSubjects.push({ name: "Computer Lab", is_lab: true, continuous_hours: 2 });
    masterSubjects.push({ name: "Chemistry Lab", is_lab: true, continuous_hours: 2 });
    masterSubjects.push({ name: "Sports Science", is_lab: false, continuous_hours: 1 });
    renderMasterSubjectsList();
    updateSubjectDropdown();

    // Load sample subject assignments
    subjects.length = 0;
    
    // Grade 10-A subjects
    subjects.push({ section: 'Grade 10-A', name: 'Mathematics', teacher: 'Mr. Alan', weekly_hours: 5, is_lab: false, continuous_hours: 1 });
    subjects.push({ section: 'Grade 10-A', name: 'English', teacher: 'Mrs. Baker', weekly_hours: 4, is_lab: false, continuous_hours: 1 });
    subjects.push({ section: 'Grade 10-A', name: 'Physics', teacher: 'Dr. Carter', weekly_hours: 4, is_lab: false, continuous_hours: 1 });
    subjects.push({ section: 'Grade 10-A', name: 'Biology Lab', teacher: 'Mrs. Foster', weekly_hours: 4, is_lab: true, continuous_hours: 2 });
    subjects.push({ section: 'Grade 10-A', name: 'Computer Lab', teacher: 'Mr. Green', weekly_hours: 4, is_lab: true, continuous_hours: 2 });
    
    // Grade 10-B subjects
    subjects.push({ section: 'Grade 10-B', name: 'Mathematics', teacher: 'Mr. Alan', weekly_hours: 5, is_lab: false, continuous_hours: 1 });
    subjects.push({ section: 'Grade 10-B', name: 'English', teacher: 'Mrs. Baker', weekly_hours: 4, is_lab: false, continuous_hours: 1 });
    subjects.push({ section: 'Grade 10-B', name: 'Chemistry Lab', teacher: 'Ms. Davis', weekly_hours: 4, is_lab: true, continuous_hours: 2 });
    subjects.push({ section: 'Grade 10-B', name: 'Sports Science', teacher: 'Mr. Harris', weekly_hours: 3, is_lab: false, continuous_hours: 1 });

    renderSubjectsList();
    showAlert("Sample data loaded. Click 'Generate Timetable' now!", "success");
}

// Send data to python backend and get optimized timetable
async function generateTimetable() {
    clearAlerts();

    if (sections.length === 0) return showAlert("Please add at least one Class!");
    if (subjects.length === 0) return showAlert("Please add at least one Subject!");

    // Gather working days selected
    const checkedDays = Array.from(elements.daysSelector.querySelectorAll('input[type="checkbox"]:checked'))
                             .map(cb => cb.value);
    if (checkedDays.length === 0) return showAlert("Please select at least one working day!");

    const periods = parseInt(elements.periodsPerDay.value);
    if (isNaN(periods) || periods <= 0) return showAlert("Periods per day must be a valid positive number!");

    // Construct JSON object
    const payload = {
        working_days: checkedDays,
        periods_per_day: periods,
        sections: sections,
        subjects: subjects
    };

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Save results to state
            timetables = result.timetables;
            teacherTimetables = result.teacher_timetables;
            workingDays = result.working_days;
            periodsPerDay = result.periods_per_day;

            // Show output
            elements.welcomeScreen.style.display = 'none';
            elements.outputPanel.style.display = 'block';

            renderTabs();
            showAlert("Timetable generated successfully!", "success");
        } else {
            showAlert(result.error);
        }
    } catch (err) {
        console.error(err);
        showAlert("Server communication error. Make sure Python app is running.");
    }
}

// Render class or teacher tabs
function renderTabs() {
    elements.tabsContainer.innerHTML = '';
    const viewType = elements.viewToggle.value;

    let tabKeys = [];
    if (viewType === 'class') {
        tabKeys = Object.keys(timetables);
    } else {
        tabKeys = Object.keys(teacherTimetables);
    }

    if (tabKeys.length === 0) {
        elements.tabsContainer.innerHTML = '<div>No data available</div>';
        return;
    }

    // Set first tab as active if current is invalid
    if (!activeTab || !tabKeys.includes(activeTab)) {
        activeTab = tabKeys[0];
    }

    // Create tab buttons
    tabKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = `tab-link ${key === activeTab ? 'active' : ''}`;
        btn.innerText = key;
        btn.onclick = () => {
            document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = key;
            renderTimetableGrid();
        };
        elements.tabsContainer.appendChild(btn);
    });

    renderTimetableGrid();
}

// Render grid output table
function renderTimetableGrid() {
    const grid = elements.timetableGrid;
    const key = activeTab;
    if (!key) return;

    const viewType = elements.viewToggle.value;
    const currentData = viewType === 'class' ? timetables[key] : teacherTimetables[key];

    // 1. Render Table Header
    let theadHtml = '<tr><th>Day / Period</th>';
    for (let p = 1; p <= periodsPerDay; p++) {
        theadHtml += `<th>Period ${p}</th>`;
    }
    theadHtml += '</tr>';
    grid.querySelector('thead').innerHTML = theadHtml;

    // 2. Render Table Rows (Days)
    let tbodyHtml = '';
    workingDays.forEach(day => {
        tbodyHtml += `<tr>`;
        tbodyHtml += `<td style="font-weight: bold; background-color: #ecf0f1;">${day}</td>`;

        const daySlots = currentData[day] || [];
        for (let p = 0; p < periodsPerDay; p++) {
            const slot = daySlots[p];
            tbodyHtml += '<td>';
            
            if (slot) {
                const subLabel = viewType === 'class' ? `Tchr: ${slot.teacher}` : `Class: ${slot.section}`;
                const labBadge = slot.is_lab ? `<span class="lab-badge">Lab</span>` : '';
                tbodyHtml += `
                    <div class="subject-info">${slot.subject}</div>
                    <div class="teacher-info">${subLabel}</div>
                    ${labBadge}
                `;
            } else {
                tbodyHtml += '<span class="free-period">Free</span>';
            }
            
            tbodyHtml += '</td>';
        }
        tbodyHtml += `</tr>`;
    });
    grid.querySelector('tbody').innerHTML = tbodyHtml;
}
