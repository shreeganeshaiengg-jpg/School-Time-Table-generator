import math
import random
from flask import Flask, request, jsonify, render_template
from ortools.sat.python import cp_model

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

def generate_timetable_heuristic(working_days, periods_per_day, sections, subjects, num_trials=2000):
    num_days = len(working_days)
    num_periods = periods_per_day
    
    # Identify unique teachers
    teachers = list(set(s.get("teacher") for s in subjects if s.get("teacher")))
    
    # Separate into lab blocks and theory tasks
    lab_blocks = []
    theory_tasks = []
    
    for idx, s in enumerate(subjects):
        name = s.get("name")
        section = s.get("section")
        teacher = s.get("teacher")
        weekly = s.get("weekly_hours", 0)
        is_lab = s.get("is_lab", False)
        cont = s.get("continuous_hours", 1)
        
        if is_lab and cont > 1:
            num_blocks = weekly // cont
            for _ in range(num_blocks):
                lab_blocks.append({
                    "subject_idx": idx,
                    "name": name,
                    "section": section,
                    "teacher": teacher,
                    "is_lab": True,
                    "duration": cont,
                    "weekly_hours": weekly
                })
        else:
            for _ in range(weekly):
                theory_tasks.append({
                    "subject_idx": idx,
                    "name": name,
                    "section": section,
                    "teacher": teacher,
                    "is_lab": is_lab,
                    "duration": 1,
                    "weekly_hours": weekly
                })

    for trial in range(num_trials):
        # Initialize grids
        timetables = {sec: {day: [None] * num_periods for day in working_days} for sec in sections}
        teacher_timetables = {t: {day: [None] * num_periods for day in working_days} for t in teachers}
        
        # section -> day -> subject_name_lower -> count
        daily_subject_counts = {sec: {day: {} for day in working_days} for sec in sections}
        
        # Place lab blocks
        success = True
        random.shuffle(lab_blocks)
        
        for block in lab_blocks:
            sec = block["section"]
            t = block["teacher"]
            name_lower = block["name"].strip().lower()
            duration = block["duration"]
            
            valid_positions = []
            for d_idx, day in enumerate(working_days):
                if daily_subject_counts[sec][day].get(name_lower, 0) > 0:
                    continue
                    
                for p in range(num_periods - duration + 1):
                    sec_free = all(timetables[sec][day][p + k] is None for k in range(duration))
                    t_free = True
                    if t:
                        t_free = all(teacher_timetables[t][day][p + k] is None for k in range(duration))
                        
                    if sec_free and t_free:
                        valid_positions.append((day, p))
            
            if not valid_positions:
                success = False
                break
                
            day, start_p = random.choice(valid_positions)
            
            sub_info = {
                "subject": block["name"],
                "teacher": t,
                "is_lab": True,
                "continuous_hours": duration
            }
            for k in range(duration):
                timetables[sec][day][start_p + k] = sub_info
                if t:
                    teacher_timetables[t][day][start_p + k] = {
                        "subject": block["name"],
                        "section": sec,
                        "is_lab": True,
                        "continuous_hours": duration
                    }
            
            daily_subject_counts[sec][day][name_lower] = daily_subject_counts[sec][day].get(name_lower, 0) + duration

        if not success:
            continue
            
        # Place theory tasks
        random.shuffle(theory_tasks)
        
        for task in theory_tasks:
            sec = task["section"]
            t = task["teacher"]
            name_lower = task["name"].strip().lower()
            weekly = task["weekly_hours"]
            
            if weekly <= 5:
                max_daily = 1
            else:
                max_daily = max(2, (weekly + num_days - 1) // num_days)
                
            valid_positions = []
            for day in working_days:
                current_count = daily_subject_counts[sec][day].get(name_lower, 0)
                if current_count >= max_daily:
                    continue
                    
                for p in range(num_periods):
                    if timetables[sec][day][p] is not None:
                        continue
                    if t and teacher_timetables[t][day][p] is not None:
                        continue
                        
                    consecutive_violation = False
                    if p > 0:
                        prev_slot = timetables[sec][day][p - 1]
                        if prev_slot and prev_slot["subject"].strip().lower() == name_lower:
                            consecutive_violation = True
                    if p < num_periods - 1:
                        next_slot = timetables[sec][day][p + 1]
                        if next_slot and next_slot["subject"].strip().lower() == name_lower:
                            consecutive_violation = True
                            
                    if consecutive_violation:
                        continue
                        
                    valid_positions.append((day, p))
            
            if not valid_positions:
                success = False
                break
                
            day, p = random.choice(valid_positions)
            
            sub_info = {
                "subject": task["name"],
                "teacher": t,
                "is_lab": task["is_lab"],
                "continuous_hours": 1
            }
            timetables[sec][day][p] = sub_info
            if t:
                teacher_timetables[t][day][p] = {
                    "subject": task["name"],
                    "section": sec,
                    "is_lab": task["is_lab"],
                    "continuous_hours": 1
                }
            
            daily_subject_counts[sec][day][name_lower] = daily_subject_counts[sec][day].get(name_lower, 0) + 1
            
        if success:
            return timetables, teacher_timetables
            
    return None, None

@app.route('/api/generate', methods=['POST'])
def generate_timetable():
    data = request.json
    if not data:
        return jsonify({"success": False, "error": "No data provided"}), 400

    working_days = data.get("working_days", [])
    periods_per_day = data.get("periods_per_day", 0)
    sections = data.get("sections", [])
    subjects = data.get("subjects", [])

    num_days = len(working_days)
    num_periods = periods_per_day

    if not working_days or num_periods <= 0 or not sections or not subjects:
        return jsonify({"success": False, "error": "Missing required configuration fields."}), 400

    # Validate total hours per section
    for section in sections:
        sec_subjects = [s for s in subjects if s.get("section") == section]
        total_hours = sum(s.get("weekly_hours", 0) for s in sec_subjects)
        max_hours = num_days * num_periods
        if total_hours > max_hours:
            return jsonify({
                "success": False,
                "error": f"Section '{section}' has {total_hours} total hours assigned, but the week only has {max_hours} periods available."
            }), 400

    # Validate lab consecutive hours
    for s in subjects:
        if s.get("is_lab"):
            weekly = s.get("weekly_hours", 0)
            cont = s.get("continuous_hours", 1)
            if cont > num_periods:
                return jsonify({
                    "success": False,
                    "error": f"Lab subject '{s.get('name')}' for section '{s.get('section')}' requires {cont} continuous hours, which exceeds the {num_periods} periods per day."
                }), 400
            if weekly % cont != 0:
                return jsonify({
                    "success": False,
                    "error": f"Lab subject '{s.get('name')}' for section '{s.get('section')}' has {weekly} weekly hours, which is not a multiple of its continuous hours ({cont})."
                }), 400

    # Build CSP Model
    model = cp_model.CpModel()

    # Decision variables: X[sub_idx, day, period]
    X = {}
    for i, s in enumerate(subjects):
        for d in range(num_days):
            for p in range(num_periods):
                X[i, d, p] = model.NewBoolVar(f'X_{i}_{d}_{p}')

    # Lab block variables: Y[sub_idx, day, period]
    Y = {}
    for i, s in enumerate(subjects):
        if s.get("is_lab") and s.get("continuous_hours", 1) > 1:
            cont = s.get("continuous_hours", 1)
            for d in range(num_days):
                for p in range(num_periods - cont + 1):
                    Y[i, d, p] = model.NewBoolVar(f'Y_{i}_{d}_{p}')

    # Constraint 1: Weekly Hours for each subject
    for i, s in enumerate(subjects):
        weekly = s.get("weekly_hours", 0)
        model.Add(sum(X[i, d, p] for d in range(num_days) for p in range(num_periods)) == weekly)

    # Constraint 2: Lab blocks structure and non-overlapping
    for i, s in enumerate(subjects):
        if s.get("is_lab") and s.get("continuous_hours", 1) > 1:
            cont = s.get("continuous_hours", 1)
            weekly = s.get("weekly_hours", 0)
            num_blocks = weekly // cont

            # Sum of starting blocks must equal the number of blocks needed
            model.Add(sum(Y[i, d, p] for d in range(num_days) for p in range(num_periods - cont + 1)) == num_blocks)

            # Link starting block to actual scheduled periods
            for d in range(num_days):
                for p in range(num_periods - cont + 1):
                    for k in range(cont):
                        model.Add(X[i, d, p + k] >= Y[i, d, p])

                # Prevent overlapping blocks of the same lab on the same day
                for p in range(num_periods):
                    model.Add(sum(Y[i, d, p - k] for k in range(min(p + 1, cont)) if p - k <= num_periods - cont) <= 1)

    # Constraint 3: Section Slot Conflict (at most 1 subject per slot)
    for section in sections:
        sec_sub_indices = [i for i, s in enumerate(subjects) if s.get("section") == section]
        for d in range(num_days):
            for p in range(num_periods):
                model.Add(sum(X[i, d, p] for i in sec_sub_indices) <= 1)

    # Constraint 4: Teacher Slot Conflict (at most 1 subject per slot for each teacher)
    teachers = list(set(s.get("teacher") for s in subjects if s.get("teacher")))
    for teacher in teachers:
        teacher_sub_indices = [i for i, s in enumerate(subjects) if s.get("teacher") == teacher]
        for d in range(num_days):
            for p in range(num_periods):
                model.Add(sum(X[i, d, p] for i in teacher_sub_indices) <= 1)

    # Constraint 5: Daily Subject Limit (avoid scheduling too many hours of same subject in one day)
    for i, s in enumerate(subjects):
        weekly = s.get("weekly_hours", 0)
        # Labs already have blocks, but we shouldn't schedule multiple lab blocks on the same day unless necessary
        if s.get("is_lab"):
            cont = s.get("continuous_hours", 1)
            # Limit lab blocks per day to 1
            for d in range(num_days):
                if cont > 1:
                    model.Add(sum(Y[i, d, p] for p in range(num_periods - cont + 1)) <= 1)
                else:
                    max_daily = 1 if weekly <= 5 else 2
                    model.Add(sum(X[i, d, p] for p in range(num_periods)) <= max_daily)
        else:
            # For theory subjects, limit daily hours
            if weekly <= 5:
                max_daily = 1
            else:
                max_daily = max(2, (weekly + num_days - 1) // num_days)
            for d in range(num_days):
                model.Add(sum(X[i, d, p] for p in range(num_periods)) <= max_daily)

    # Constraint 6: No consecutive periods for the same subject name (unless it is a lab block)
    from collections import defaultdict
    for section in sections:
        sec_subjects = [(idx, s) for idx, s in enumerate(subjects) if s.get("section") == section]
        grouped_by_name = defaultdict(list)
        for idx, s in sec_subjects:
            if s.get("is_lab") and s.get("continuous_hours", 1) > 1:
                continue
            grouped_by_name[s.get("name", "").strip().lower()].append(idx)
        
        for name, indices in grouped_by_name.items():
            for d in range(num_days):
                for p in range(num_periods - 1):
                    model.Add(sum(X[i, d, p] for i in indices) + sum(X[i, d, p + 1] for i in indices) <= 1)

    # Objective Function: Minimize Teacher Gaps & Push Free Periods to the end
    # 1. Minimize Teacher Gaps
    teacher_gaps = []
    for teacher in teachers:
        teacher_sub_indices = [i for i, s in enumerate(subjects) if s.get("teacher") == teacher]
        for d in range(num_days):
            # teach_var is 1 if teacher teaches at period p on day d
            teach_var = {}
            for p in range(num_periods):
                teach_var[p] = model.NewBoolVar(f'teach_var_{teacher}_{d}_{p}')
                model.Add(teach_var[p] == sum(X[i, d, p] for i in teacher_sub_indices))

            # first_teach[p] is 1 if teacher teaches at or before p
            first_teach = {}
            for p in range(num_periods):
                first_teach[p] = model.NewBoolVar(f'first_teach_{teacher}_{d}_{p}')
                if p == 0:
                    model.Add(first_teach[p] == teach_var[p])
                else:
                    model.Add(first_teach[p] >= first_teach[p - 1])
                    model.Add(first_teach[p] >= teach_var[p])

            # last_teach[p] is 1 if teacher teaches at or after p
            last_teach = {}
            for p in range(num_periods - 1, -1, -1):
                last_teach[p] = model.NewBoolVar(f'last_teach_{teacher}_{d}_{p}')
                if p == num_periods - 1:
                    model.Add(last_teach[p] == teach_var[p])
                else:
                    model.Add(last_teach[p] >= last_teach[p + 1])
                    model.Add(last_teach[p] >= teach_var[p])

            # span[p] is 1 if p is within teaching span
            span = {}
            for p in range(num_periods):
                span[p] = model.NewBoolVar(f'span_{teacher}_{d}_{p}')
                model.Add(span[p] >= first_teach[p] + last_teach[p] - 1)

            # gap[p] is 1 if p is within span but teacher is not teaching
            for p in range(num_periods):
                gap = model.NewBoolVar(f'gap_{teacher}_{d}_{p}')
                model.Add(gap >= span[p] - teach_var[p])
                teacher_gaps.append(gap)

    # 2. Push Free Periods to the End of the Day for Sections
    # We penalize scheduling any subject in later periods of the day.
    # The weight increases quadratically with the period index.
    late_period_penalty = []
    for i, s in enumerate(subjects):
        for d in range(num_days):
            for p in range(num_periods):
                # Penalty is p * X[i, d, p]
                late_period_penalty.append(p * X[i, d, p])

    # Minimize: 20 * sum(teacher_gaps) + sum(late_period_penalty)
    model.Minimize(20 * sum(teacher_gaps) + sum(late_period_penalty))

    # Solver
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status = solver.Solve(model)

    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        # Construct output timetable
        # grid format: section -> day -> period -> subject info
        timetables = {sec: {day: [None] * num_periods for day in working_days} for sec in sections}
        teacher_timetables = {t: {day: [None] * num_periods for day in working_days} for t in teachers}

        for i, s in enumerate(subjects):
            sec = s.get("section")
            t = s.get("teacher")
            for d_idx, day in enumerate(working_days):
                for p in range(num_periods):
                    if solver.BooleanValue(X[i, d_idx, p]):
                        sub_info = {
                            "subject": s.get("name"),
                            "teacher": t,
                            "is_lab": s.get("is_lab"),
                            "continuous_hours": s.get("continuous_hours", 1)
                        }
                        timetables[sec][day][p] = sub_info
                        if t:
                            teacher_timetables[t][day][p] = {
                                "subject": s.get("name"),
                                "section": sec,
                                "is_lab": s.get("is_lab"),
                                "continuous_hours": s.get("continuous_hours", 1)
                            }

        return jsonify({
            "success": True,
            "timetables": timetables,
            "teacher_timetables": teacher_timetables,
            "working_days": working_days,
            "periods_per_day": num_periods
        })
    else:
        # Fallback: Try Randomized Heuristic Constraint Satisfaction Algorithm
        timetables, teacher_timetables = generate_timetable_heuristic(
            working_days, periods_per_day, sections, subjects
        )
        if timetables is not None:
            return jsonify({
                "success": True,
                "timetables": timetables,
                "teacher_timetables": teacher_timetables,
                "working_days": working_days,
                "periods_per_day": num_periods,
                "info": "Generated using Randomized Heuristic Constraint Satisfaction Algorithm (Fallback)"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Could not find a feasible timetable satisfying all constraints. Please verify teacher workloads or reduce the total weekly hours."
            })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
