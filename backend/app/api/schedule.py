"""Schedule entries — list, generate (AI + algorithmic hybrid), save, update."""

from __future__ import annotations

import json
import logging
import os
import re
import time
from collections import defaultdict

import requests as http_requests
from flask import jsonify, request

from ..core.security import jwt_required, require_role
from ..extensions import db
from ..models import (
    ClassGroup,
    Room,
    SavedSchedule,
    ScheduleEntry,
    SchoolSetting,
    Subject,
    Teacher,
    TeacherConstraint,
    TeacherWorkload,
)
from . import api_bp

logger = logging.getLogger(__name__)

DAYS = 5       # 0=Mon .. 4=Fri
PERIODS = 8    # 0..7
MAX_SAME_SUBJECT_PER_DAY = 2   # Hard limit

# Subject keywords → required room name keywords (case-insensitive matching)
# If a subject matches, ONLY those rooms will be considered.
SUBJECT_ROOM_RULES: list[tuple[list[str], list[str]]] = [
    # (subject keywords, room name keywords)
    (["Химия"],               ["Химии", "Химия"]),
    (["Биология", "Окр. мир"],(["Биологии", "Биология"])),
    (["Физика"],              ["Физики", "Физика"]),
    (["Информатика", "CS"],   ["Информатики", "Информатика"]),
    (["Физкультура"],         ["Спортзал", "Спорт"]),
]


# ═══════════════════════════════════════════════════════════════════════════
#  Occupancy Matrix
# ═══════════════════════════════════════════════════════════════════════════

class OccupancyMatrix:
    def __init__(self):
        self.teacher_slots: set[tuple[str, int, int]] = set()
        self.room_slots: set[tuple[str, int, int]] = set()
        self.class_slots: set[tuple[str, int, int]] = set()
        # Track room usage per class for variety
        self._class_room_counter: dict[tuple[str, str], int] = defaultdict(int)  # (class_id, room_id) → count

    def is_teacher_free(self, tid: str, day: int, period: int) -> bool:
        return (tid, day, period) not in self.teacher_slots

    def is_room_free(self, rid: str, day: int, period: int) -> bool:
        return (rid, day, period) not in self.room_slots

    def is_class_free(self, cid: str, day: int, period: int) -> bool:
        return (cid, day, period) not in self.class_slots

    def book(self, cid: str, tid: str, rid: str | None, day: int, period: int):
        self.teacher_slots.add((tid, day, period))
        self.class_slots.add((cid, day, period))
        if rid:
            self.room_slots.add((rid, day, period))
            self._class_room_counter[(cid, rid)] += 1

    def find_free_room(self, rooms: list[dict], day: int, period: int,
                       subject_name: str = "", class_id: str = "") -> str | None:
        """Smart room assignment:
        1. If subject requires a specialized room → use ONLY that type
        2. Otherwise → pick the LEAST-USED generic room (for variety)
        """
        required_keywords = _get_required_room_keywords(subject_name)

        if required_keywords:
            # Must use a specialized room matching the subject
            for r in rooms:
                rname = r["name"].lower()
                if any(kw.lower() in rname for kw in required_keywords):
                    if self.is_room_free(r["id"], day, period):
                        rid = r["id"]
                        if class_id:
                            self._class_room_counter[(class_id, rid)] += 1
                        return rid
            # Fallback: generic room (NEVER another specialized room like Gym for CS)
            return self._find_least_used_room(rooms, day, period, class_id, exclude_specialized=True)

        # Generic subject: exclude all specialized rooms
        return self._find_least_used_room(rooms, day, period, class_id, exclude_specialized=True)

    def _find_least_used_room(self, rooms: list[dict], day: int, period: int,
                               class_id: str, exclude_specialized: bool = False) -> str | None:
        """Pick the free room that this class has used the LEAST (for variety)."""
        import random
        candidates = []
        for r in rooms:
            if not self.is_room_free(r["id"], day, period):
                continue
            if exclude_specialized and _is_specialized_room(r["name"]):
                continue
            usage = self._class_room_counter.get((class_id, r["id"]), 0)
            candidates.append((usage, random.random(), r["id"]))  # random breaks ties

        if not candidates:
            if exclude_specialized:
                return self._find_least_used_room(rooms, day, period, class_id, exclude_specialized=False)
            return None

        candidates.sort()
        rid = candidates[0][2]
        if class_id:
            self._class_room_counter[(class_id, rid)] += 1
        return rid

    def get_teacher_busy_for(self, teacher_ids: set[str]) -> list[dict]:
        return [
            {"teacher_id": tid, "day": d, "period": p}
            for tid, d, p in self.teacher_slots if tid in teacher_ids
        ]

    def get_teacher_day_count(self, tid: str, day: int) -> int:
        return sum(1 for t, d, _ in self.teacher_slots if t == tid and d == day)


def _get_required_room_keywords(subject_name: str) -> list[str]:
    """Return room keywords required for this subject, or [] if generic."""
    if not subject_name:
        return []
    sn_lower = subject_name.lower()
    for subj_keywords, room_keywords in SUBJECT_ROOM_RULES:
        if any(sk.lower() in sn_lower for sk in subj_keywords):
            return room_keywords
    return []


def _is_specialized_room(room_name: str) -> bool:
    """Check if a room is specialized (should not be used for generic subjects)."""
    rn = room_name.lower()
    all_room_keywords = set()
    for _, room_kws in SUBJECT_ROOM_RULES:
        for kw in room_kws:
            all_room_keywords.add(kw.lower())
    return any(kw in rn for kw in all_room_keywords)


# ═══════════════════════════════════════════════════════════════════════════
#  Bell Schedule (public for all authenticated users)
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route("/bell-schedule", methods=["GET"])
@jwt_required
def get_bell_schedule():
    """Return all bell schedules with computed period times (including big breaks).
    Any authenticated user can access this — students need it for their dashboard.
    """
    setting = SchoolSetting.query.filter_by(key="bell_schedule_config").first()
    if not setting:
        return jsonify([]), 200

    try:
        bells = json.loads(setting.value)
    except (json.JSONDecodeError, TypeError):
        return jsonify([]), 200

    result = []
    for b in bells:
        cfg = b.get("config", {})
        total_periods = cfg.get("totalPeriods", 8)
        start_time = cfg.get("startTime", "08:00")
        lesson_dur = cfg.get("lessonDuration", 40)
        default_break = cfg.get("breakDuration", 10)
        big_breaks = cfg.get("bigBreaks", [])

        # Build break map: afterPeriod → (name, duration)
        break_map: dict[int, tuple[str, int]] = {}
        for bb in big_breaks:
            ap = bb.get("afterPeriod")
            if ap is not None:
                break_map[ap] = (bb.get("name", "Перемена"), bb.get("duration", 15))

        # Calculate actual period times
        h, m = map(int, start_time.split(":"))
        current_min = h * 60 + m

        periods = []
        for p in range(total_periods):
            start_h, start_m = divmod(current_min, 60)
            end_min = current_min + lesson_dur
            end_h, end_m = divmod(end_min, 60)
            period_info: dict = {
                "period": p,
                "start": f"{start_h:02d}:{start_m:02d}",
                "end": f"{end_h:02d}:{end_m:02d}",
            }
            current_min = end_min

            # Break after this period
            period_num = p + 1
            if period_num in break_map:
                bname, bdur = break_map[period_num]
                period_info["break_after"] = {"name": bname, "duration": bdur}
                current_min += bdur
            elif p < total_periods - 1:
                if default_break:
                    period_info["break_after"] = {"name": "Перемена", "duration": default_break}
                    current_min += default_break

            periods.append(period_info)

        result.append({
            "id": b.get("id"),
            "name": b.get("name"),
            "periods": periods,
            "config": cfg,
        })

    return jsonify(result), 200


# ═══════════════════════════════════════════════════════════════════════════
#  List
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route("/schedule_entries", methods=["GET"])
@jwt_required
def list_schedule_entries():
    class_id = request.args.get("class_id")
    teacher_id = request.args.get("teacher_id")
    student_id = request.args.get("student_id")
    
    q = ScheduleEntry.query
    if student_id:
        from ..models import Student
        student = Student.query.get(student_id)
        if student and student.class_id:
            q = q.filter_by(class_id=student.class_id)
        else:
            return jsonify([]) # Student not found or has no class
    elif class_id:
        q = q.filter_by(class_id=class_id)
    if teacher_id:
        q = q.filter_by(teacher_id=teacher_id)
    return jsonify([r.to_dict() for r in q.all()])


# ═══════════════════════════════════════════════════════════════════════════
#  AI Generate
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route("/schedule/ai-generate", methods=["POST"])
@jwt_required
@require_role("admin")
def ai_generate_schedule():
    body = request.get_json(force=True, silent=True) or {}
    user_prompt = body.get("user_prompt", "")
    grade_levels = body.get("grade_levels", [])
    bell_schedule_id = body.get("bell_schedule_id", "")

    api_key = os.environ.get("VITE_OPENROUTER_API_KEY")
    model_name = os.environ.get("VITE_AI_MODEL", "google/gemini-3-flash-preview")

    if not api_key:
        return jsonify({"error": "AI API key not configured in .env"}), 500

    logger.info("═══ AI SCHEDULE GENERATION ═══")
    logger.info("  Model: %s | Grades: %s", model_name, grade_levels)

    # ── 1. Load data ─────────────────────────────────────────────────────

    classes_q = ClassGroup.query
    if grade_levels:
        classes_q = classes_q.filter(ClassGroup.grade_level.in_(grade_levels))
    classes = classes_q.order_by(ClassGroup.grade_level, ClassGroup.name).all()
    class_ids = [c.id for c in classes]

    if not class_ids:
        return jsonify({"error": "No classes found for selected grades."}), 400

    all_rooms = Room.query.all()
    room_list = [{"id": r.id, "name": r.name, "capacity": r.capacity} for r in all_rooms]
    all_constraints = {c.teacher_id: c for c in TeacherConstraint.query.all()}

    workloads = TeacherWorkload.query.filter(TeacherWorkload.class_id.in_(class_ids)).all()
    if not workloads:
        return jsonify({"error": "No workloads configured. Set up staffing first."}), 400

    wl_by_class: dict[str, list] = defaultdict(list)
    for w in workloads:
        wl_by_class[w.class_id].append(w)

    bell_text = _get_bell_text(bell_schedule_id)
    logger.info("  Classes: %d | Rooms: %d | Workloads: %d", len(classes), len(all_rooms), len(workloads))

    # ── 2. Generate per-class ────────────────────────────────────────────

    matrix = OccupancyMatrix()
    all_entries: list[dict] = []
    t0 = time.time()

    for cls in classes:
        cls_wl = wl_by_class.get(cls.id, [])
        if not cls_wl:
            continue

        total_hours = sum(w.hours_per_week for w in cls_wl)
        logger.info("  ── %s (grade %d, %d hrs) ──", cls.name, cls.grade_level, total_hours)

        ai_entries = _call_ai_for_class(
            api_key=api_key, model_name=model_name,
            cls=cls, cls_wl=cls_wl, total_hours=total_hours,
            matrix=matrix, bell_text=bell_text, user_prompt=user_prompt,
        )

        final = _postprocess_class(
            cls=cls, cls_wl=cls_wl, total_hours=total_hours,
            ai_entries=ai_entries, matrix=matrix,
            room_list=room_list, all_constraints=all_constraints,
        )

        for e in final:
            matrix.book(cls.id, e["teacher_id"], e.get("room_id"), e["day"], e["period"])
        all_entries.extend(final)
        logger.info("    ✓ %d/%d entries", len(final), total_hours)

    elapsed = time.time() - t0
    logger.info("═══ DONE: %d entries, %d classes, %.0fs ═══", len(all_entries), len(classes), elapsed)

    # ── 3. Save to DB ────────────────────────────────────────────────────

    ScheduleEntry.query.filter(ScheduleEntry.class_id.in_(class_ids)).delete(synchronize_session=False)
    db.session.flush()

    saved = []
    for e in all_entries:
        try:
            entry = ScheduleEntry(
                class_id=e["class_id"], subject_id=e["subject_id"],
                teacher_id=e["teacher_id"], room_id=e.get("room_id"),
                day=int(e["day"]), period=int(e["period"]), has_conflict=False,
            )
            saved.append(entry)
        except (KeyError, TypeError, ValueError):
            pass

    db.session.add_all(saved)
    db.session.commit()

    result = [s.to_dict() for s in saved]
    return jsonify({
        "message": f"Сгенерировано {len(result)} уроков для {len(classes)} классов за {elapsed:.0f}с",
        "total": len(result),
        "entries": result,
    }), 200


# ═══════════════════════════════════════════════════════════════════════════
#  Per-class AI call
# ═══════════════════════════════════════════════════════════════════════════

def _call_ai_for_class(*, api_key, model_name, cls, cls_wl, total_hours, matrix, bell_text, user_prompt):
    wl_lines = []
    for w in cls_wl:
        tname = w.teacher.name if w.teacher else "?"
        sname = w.subject.name if w.subject else "?"
        wl_lines.append(f"  {sname} | {tname} | {w.hours_per_week}h | tid={w.teacher_id} sid={w.subject_id}")

    teacher_ids = {w.teacher_id for w in cls_wl}
    busy = matrix.get_teacher_busy_for(teacher_ids)
    busy_text = "None"
    if busy:
        by_t: dict[str, list[str]] = defaultdict(list)
        for b in busy:
            by_t[b["teacher_id"]].append(f"d{b['day']}p{b['period']}")
        busy_text = "\n".join(f"  {tid[:8]}: {', '.join(sl)}" for tid, sl in by_t.items())

    per_day = total_hours // DAYS
    extra = total_hours % DAYS

    # Build per-subject distribution hint
    dist_hints = []
    for w in cls_wl:
        sname = w.subject.name if w.subject else "?"
        h = w.hours_per_week
        if h <= DAYS:
            dist_hints.append(f"  {sname}: {h}h → 1 lesson on {h} different days")
        else:
            d1 = h // DAYS
            d2 = h % DAYS
            dist_hints.append(f"  {sname}: {h}h → {d1} lessons/day, {d2} days get {d1+1}")

    system = f"""You are a school timetable optimization engine. Output ONLY valid JSON.

TASK: Create a weekly timetable for class "{cls.name}" (grade {cls.grade_level}).
GRID: 5 days (day 0=Mon to 4=Fri), {PERIODS} periods per day (period 0 to {PERIODS-1}).
{bell_text}
STRICT RULES — MUST FOLLOW ALL:

1. Output EXACTLY {total_hours} entries total.
2. Each workload row must appear EXACTLY its hours_per_week times.
3. Distribute ~{per_day}-{per_day+1} lessons per day. Days with lessons: fill periods 0,1,2... with NO GAPS.
4. MAXIMUM {MAX_SAME_SUBJECT_PER_DAY} lessons of the SAME SUBJECT per day. NEVER put 3+ of the same subject on one day.
5. Spread each subject EVENLY across the 5 days. Example: if a subject has 5h/week → 1 per day. If 3h → put on 3 different days.
6. NEVER place a teacher on a BUSY slot listed below.
7. Do NOT put the same subject in consecutive periods (e.g. Math period 2 then Math period 3 is BAD).
8. User wishes are SOFT preferences, not absolute commands. "Put math first" means prefer periods 0-1 for math WHEN POSSIBLE, NOT "put all math on day 0".

DISTRIBUTION GUIDE (follow this):
{chr(10).join(dist_hints)}

OUTPUT FORMAT — strict JSON, no markdown:
{{"entries":[{{"subject_id":"...","teacher_id":"...","day":0,"period":0}},...]}}

Do NOT include room_id or class_id."""

    user = f"""CLASS: {cls.name}

WORKLOADS ({total_hours} hrs total):
{chr(10).join(wl_lines)}

BUSY TEACHER SLOTS (CANNOT use these day+period for that teacher):
{busy_text}

{("SOFT PREFERENCES (apply when possible, do NOT break rules for these): " + user_prompt) if user_prompt else ""}

Generate exactly {total_hours} entries. Spread subjects evenly across 5 days. Max {MAX_SAME_SUBJECT_PER_DAY} of same subject per day."""

    logger.info("    → AI call for %s...", cls.name)
    t0 = time.time()

    try:
        resp = http_requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://smart-school-space.app",
                "X-Title": "SmartSchool Space",
            },
            json={
                "model": model_name,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
            timeout=90,
        )
        logger.info("    ← %d in %.1fs", resp.status_code, time.time() - t0)

        if resp.status_code != 200:
            logger.error("    Error: %s", resp.text[:300])
            return []

        rj = resp.json()
        usage = rj.get("usage", {})
        logger.info("    Tokens: %s/%s", usage.get("prompt_tokens", "?"), usage.get("completion_tokens", "?"))

        content = rj["choices"][0]["message"]["content"]
        data = _extract_json(content)
        # Handle AI returning bare list or dict
        if isinstance(data, list):
            raw = data
        else:
            raw = data.get("entries", data.get("schedule", []))
        logger.info("    Parsed %d entries", len(raw))
        return raw

    except Exception as exc:
        logger.exception("    AI failed: %s", exc)
        return []


# ═══════════════════════════════════════════════════════════════════════════
#  Post-process: validate + fill gaps + assign rooms
# ═══════════════════════════════════════════════════════════════════════════

def _postprocess_class(*, cls, cls_wl, total_hours, ai_entries, matrix, room_list, all_constraints):
    # Build workload quotas and subject name map
    quota: dict[tuple[str, str], int] = {}
    sid_to_name: dict[str, str] = {}
    for w in cls_wl:
        quota[(w.teacher_id, w.subject_id)] = w.hours_per_week
        sid_to_name[w.subject_id] = w.subject.name if w.subject else ""

    remaining = dict(quota)
    used_slots: set[tuple[int, int]] = set()
    final: list[dict] = []

    # Track subject-per-day count for this class
    subject_day_count: dict[tuple[str, int], int] = defaultdict(int)  # (subject_id, day) → count
    local_teacher_day: dict[tuple[str, int], int] = defaultdict(int)

    def _can_place(tid: str, sid: str, day: int, period: int) -> bool:
        """Check all constraints for placing a lesson."""
        if (day, period) in used_slots:
            return False
        if not matrix.is_teacher_free(tid, day, period):
            return False
        # Max same subject per day
        if subject_day_count[(sid, day)] >= MAX_SAME_SUBJECT_PER_DAY:
            return False
        # Max teacher hours per day
        c = all_constraints.get(tid)
        if c and c.max_hours_per_day:
            gd = matrix.get_teacher_day_count(tid, day)
            ld = local_teacher_day.get((tid, day), 0)
            if gd + ld >= c.max_hours_per_day:
                return False
        return True

    def _place(tid: str, sid: str, day: int, period: int):
        """Place a lesson and update all tracking."""
        sname = sid_to_name.get(sid, "")
        room_id = matrix.find_free_room(room_list, day, period, subject_name=sname, class_id=cls.id)
        final.append({
            "class_id": cls.id, "subject_id": sid, "teacher_id": tid,
            "room_id": room_id, "day": day, "period": period,
        })
        used_slots.add((day, period))
        subject_day_count[(sid, day)] += 1
        local_teacher_day[(tid, day)] += 1
        key = (tid, sid)
        if key in remaining:
            remaining[key] -= 1
        # Temporarily book teacher
        matrix.teacher_slots.add((tid, day, period))
        if room_id:
            matrix.room_slots.add((room_id, day, period))

    # ── Phase 1: Accept valid AI entries ──

    for item in ai_entries:
        day = item.get("day")
        period = item.get("period")
        tid = item.get("teacher_id")
        sid = item.get("subject_id")

        if day is None or period is None or not tid or not sid:
            continue
        day, period = int(day), int(period)
        if not (0 <= day < DAYS and 0 <= period < PERIODS):
            continue

        key = (tid, sid)
        if key not in remaining or remaining[key] <= 0:
            continue
        if not _can_place(tid, sid, day, period):
            continue

        _place(tid, sid, day, period)

    ai_accepted = len(final)

    # ── Phase 2: Fill gaps with multi-pass algorithm ──

    unfilled_total = sum(v for v in remaining.values() if v > 0)
    if unfilled_total > 0:
        logger.info("    ⚠ AI: %d accepted, %d missing → filling...", ai_accepted, unfilled_total)

        # Multi-pass: try up to 3 passes to fill all gaps
        for pass_num in range(3):
            unfilled = [(k, v) for k, v in remaining.items() if v > 0]
            if not unfilled:
                break

            unfilled.sort(key=lambda x: -x[1])

            for (tid, sid), need in unfilled:
                if need <= 0:
                    continue

                candidates = []
                for d in range(DAYS):
                    for p in range(PERIODS):
                        if _can_place(tid, sid, d, p):
                            subj_count_on_day = subject_day_count[(sid, d)]
                            score = subj_count_on_day * 100 + p
                            candidates.append((score, d, p))

                candidates.sort()
                placed = 0
                for _, d, p in candidates:
                    if placed >= need:
                        break
                    if not _can_place(tid, sid, d, p):
                        continue
                    _place(tid, sid, d, p)
                    placed += 1

                if placed < need:
                    sn = next((w.subject.name for w in cls_wl if w.subject_id == sid), "?")
                    logger.warning("    ⚠ %s: pass %d, placed %d/%d for %s",
                                   cls.name, pass_num + 1, placed, need, sn)

    # ── Phase 2b: Swap algorithm for deadlocked lessons ──
    # If a lesson can't be placed because all class-free slots have the
    # teacher busy, try to SWAP an existing lesson out of a slot where
    # the unplaced teacher IS free, moving the existing lesson elsewhere.

    still_unfilled = [(k, v) for k, v in remaining.items() if v > 0]
    if still_unfilled:
        total_still = sum(v for _, v in still_unfilled)
        logger.info("    🔄 %d still unplaced → trying swaps...", total_still)

        for (need_tid, need_sid), need in still_unfilled:
            for _ in range(need):
                if remaining.get((need_tid, need_sid), 0) <= 0:
                    break
                swapped = _try_swap(
                    need_tid=need_tid, need_sid=need_sid,
                    final=final, used_slots=used_slots,
                    subject_day_count=subject_day_count,
                    local_teacher_day=local_teacher_day,
                    matrix=matrix, room_list=room_list,
                    cls=cls, remaining=remaining,
                    all_constraints=all_constraints,
                    sid_to_name=sid_to_name,
                )
                if not swapped:
                    sn = next((w.subject.name for w in cls_wl if w.subject_id == need_sid), "?")
                    logger.warning("    ⚠ %s: swap failed for %s", cls.name, sn)
                    break

    # Remove temporary bookings (caller re-books via matrix.book)
    for e in final:
        matrix.teacher_slots.discard((e["teacher_id"], e["day"], e["period"]))
        if e.get("room_id"):
            matrix.room_slots.discard((e["room_id"], e["day"], e["period"]))

    # ── Phase 3: Compact gaps — shift lessons up so no empty periods between them ──

    final = _compact_gaps(final, cls.id, matrix, room_list, sid_to_name=sid_to_name)

    # ── Phase 4: Ensure all entries have rooms ──

    for e in final:
        if not e.get("room_id"):
            sname = sid_to_name.get(e.get("subject_id", ""), "")
            e["room_id"] = matrix.find_free_room(room_list, e["day"], e["period"], subject_name=sname, class_id=cls.id)

    return final


def _try_swap(*, need_tid, need_sid, final, used_slots, subject_day_count,
              local_teacher_day, matrix, room_list, cls, remaining, all_constraints, sid_to_name=None):
    """Try to swap an existing lesson out of a slot where need_tid is free.

    Finds a slot (d,p) where:
      - need_tid (the unplaced teacher) IS free
      - An existing lesson 'victim' occupies that slot
      - The victim's teacher has a free slot elsewhere to move to
    """
    for existing in list(final):
        d, p = existing["day"], existing["period"]
        e_tid = existing["teacher_id"]
        e_sid = existing["subject_id"]

        if not matrix.is_teacher_free(need_tid, d, p):
            continue

        new_subj_count = subject_day_count.get((need_sid, d), 0)
        if new_subj_count >= MAX_SAME_SUBJECT_PER_DAY:
            continue

        for alt_d in range(DAYS):
            for alt_p in range(PERIODS):
                if (alt_d, alt_p) in used_slots:
                    continue
                if not matrix.is_teacher_free(e_tid, alt_d, alt_p):
                    continue
                alt_subj_count = subject_day_count.get((e_sid, alt_d), 0)
                if alt_subj_count >= MAX_SAME_SUBJECT_PER_DAY:
                    continue

                c = all_constraints.get(e_tid)
                if c and c.max_hours_per_day and alt_d != d:
                    gd = matrix.get_teacher_day_count(e_tid, alt_d)
                    ld = local_teacher_day.get((e_tid, alt_d), 0)
                    if gd + ld >= c.max_hours_per_day:
                        continue

                # ✓ Swap is valid — execute it

                # 1. Unbook existing lesson from (d, p)
                used_slots.discard((d, p))
                subject_day_count[(e_sid, d)] -= 1
                local_teacher_day[(e_tid, d)] -= 1
                matrix.teacher_slots.discard((e_tid, d, p))
                if existing.get("room_id"):
                    matrix.room_slots.discard((existing["room_id"], d, p))

                # 2. Move existing → (alt_d, alt_p)
                existing["day"] = alt_d
                existing["period"] = alt_p
                e_sname = (sid_to_name or {}).get(e_sid, "")
                existing["room_id"] = matrix.find_free_room(room_list, alt_d, alt_p, subject_name=e_sname, class_id=cls.id)
                used_slots.add((alt_d, alt_p))
                subject_day_count[(e_sid, alt_d)] += 1
                local_teacher_day[(e_tid, alt_d)] += 1
                matrix.teacher_slots.add((e_tid, alt_d, alt_p))
                if existing.get("room_id"):
                    matrix.room_slots.add((existing["room_id"], alt_d, alt_p))

                # 3. Place needed lesson → freed slot (d, p)
                need_sname = (sid_to_name or {}).get(need_sid, "")
                room_id = matrix.find_free_room(room_list, d, p, subject_name=need_sname, class_id=cls.id)
                final.append({
                    "class_id": cls.id, "subject_id": need_sid, "teacher_id": need_tid,
                    "room_id": room_id, "day": d, "period": p,
                })
                used_slots.add((d, p))
                subject_day_count[(need_sid, d)] += 1
                local_teacher_day[(need_tid, d)] += 1
                remaining[(need_tid, need_sid)] -= 1
                matrix.teacher_slots.add((need_tid, d, p))
                if room_id:
                    matrix.room_slots.add((room_id, d, p))

                logger.info("    🔄 Swapped %s d%dp%d→d%dp%d, placed %s",
                            e_sid[:12], d, p, alt_d, alt_p, need_sid[:12])
                return True

    return False


def _compact_gaps(entries: list[dict], class_id: str, matrix: OccupancyMatrix, room_list: list[dict], sid_to_name: dict | None = None) -> list[dict]:
    """Remove gaps within each day — shift lessons to fill from period 0 up.
    
    Only shifts if the teacher is free at the new period (in the global matrix,
    meaning other classes' bookings are respected).
    """
    by_day: dict[int, list[dict]] = defaultdict(list)
    for e in entries:
        by_day[e["day"]].append(e)

    compacted = []
    for day in range(DAYS):
        day_entries = sorted(by_day.get(day, []), key=lambda e: e["period"])
        
        # Greedily assign earliest available period per entry
        taken_periods: set[int] = set()
        for e in day_entries:
            tid = e["teacher_id"]
            # Try periods from 0 upward
            assigned = False
            for p in range(PERIODS):
                if p in taken_periods:
                    continue
                if matrix.is_teacher_free(tid, day, p):
                    e["period"] = p
                    sn = (sid_to_name or {}).get(e.get("subject_id", ""), "")
                    e["room_id"] = matrix.find_free_room(room_list, day, p, subject_name=sn, class_id=class_id)
                    taken_periods.add(p)
                    assigned = True
                    break
            if not assigned:
                # Keep original period as last resort
                taken_periods.add(e["period"])
        
        compacted.extend(day_entries)

    return compacted


# ═══════════════════════════════════════════════════════════════════════════
#  Saved Schedules CRUD
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route("/saved-schedules", methods=["GET"])
@jwt_required
def list_saved_schedules():
    rows = SavedSchedule.query.order_by(SavedSchedule.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])


@api_bp.route("/saved-schedules", methods=["POST"])
@jwt_required
@require_role("admin")
def save_schedule():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    entries = data.get("entries", [])
    grade_levels = data.get("grade_levels", [])
    class_ids = list(set(e.get("class_id") for e in entries if e.get("class_id")))

    saved = SavedSchedule(
        name=name,
        grade_levels=json.dumps(grade_levels),
        total_entries=len(entries),
        total_classes=len(class_ids),
        entries_json=json.dumps(entries, ensure_ascii=False),
    )
    db.session.add(saved)
    db.session.commit()
    return jsonify(saved.to_dict()), 201


@api_bp.route("/saved-schedules/<sid>", methods=["GET"])
@jwt_required
def get_saved_schedule(sid):
    s = db.session.get(SavedSchedule, sid)
    if not s:
        return jsonify({"error": "Not found"}), 404
    result = s.to_dict()
    result["entries"] = json.loads(s.entries_json)
    return jsonify(result)


@api_bp.route("/saved-schedules/<sid>", methods=["DELETE"])
@jwt_required
@require_role("admin")
def delete_saved_schedule(sid):
    s = db.session.get(SavedSchedule, sid)
    if not s:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(s)
    db.session.commit()
    return "", 204


@api_bp.route("/saved-schedules/<sid>/apply", methods=["POST"])
@jwt_required
@require_role("admin")
def apply_saved_schedule(sid):
    """Apply a saved schedule: replace current schedule_entries with the saved ones."""
    s = db.session.get(SavedSchedule, sid)
    if not s:
        return jsonify({"error": "Not found"}), 404

    try:
        entries = json.loads(s.entries_json)
    except (json.JSONDecodeError, TypeError):
        return jsonify({"error": "Invalid entries"}), 400

    # Find all class IDs in this saved schedule
    class_ids = set(e.get("class_id") for e in entries if e.get("class_id"))

    # Delete old entries for these classes
    if class_ids:
        ScheduleEntry.query.filter(ScheduleEntry.class_id.in_(class_ids)).delete(synchronize_session=False)

    # Insert new entries
    for e in entries:
        entry = ScheduleEntry(
            class_id=e.get("class_id"),
            subject_id=e.get("subject_id"),
            teacher_id=e.get("teacher_id"),
            room_id=e.get("room_id"),
            day=int(e.get("day", 0)),
            period=int(e.get("period", 0)),
            has_conflict=False,
        )
        db.session.add(entry)

    # Mark this schedule as the active one
    s.is_active = True
    # Deactivate all others
    SavedSchedule.query.filter(SavedSchedule.id != s.id).update({"is_active": False}, synchronize_session=False)

    db.session.commit()
    logger.info("Applied saved schedule '%s' (%d entries, %d classes)", s.name, len(entries), len(class_ids))

    return jsonify({"message": f"Расписание '{s.name}' применено", "total": len(entries), "classes": len(class_ids)}), 200


# ═══════════════════════════════════════════════════════════════════════════
#  Update entry
# ═══════════════════════════════════════════════════════════════════════════

@api_bp.route("/schedule_entries/<id>", methods=["PUT"])
@jwt_required
@require_role("admin")
def update_schedule_entry(id):
    entry = db.session.get(ScheduleEntry, id)
    if not entry:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json(force=True)
    if "day" in data:
        entry.day = int(data["day"])
    if "period" in data:
        entry.period = int(data["period"])
    if "room_id" in data:
        entry.room_id = data["room_id"]
    if "teacher_id" in data:
        entry.teacher_id = data["teacher_id"]
    if "subject_id" in data:
        entry.subject_id = data["subject_id"]
    entry.has_conflict = False
    db.session.commit()
    return jsonify(entry.to_dict()), 200


# ═══════════════════════════════════════════════════════════════════════════
#  Helpers
# ═══════════════════════════════════════════════════════════════════════════

def _get_bell_text(bell_id: str) -> str:
    """Build a detailed bell schedule string for the AI prompt, including big breaks."""
    if not bell_id:
        return ""
    setting = SchoolSetting.query.filter_by(key="bell_schedule_config").first()
    if not setting:
        return ""
    try:
        bells = json.loads(setting.value)
    except (json.JSONDecodeError, TypeError):
        return ""

    for b in bells:
        if b.get("id") != bell_id:
            continue

        cfg = b.get("config", {})
        total_periods = cfg.get("totalPeriods", 8)
        start_time = cfg.get("startTime", "08:00")
        lesson_dur = cfg.get("lessonDuration", 40)
        default_break = cfg.get("breakDuration", 10)
        big_breaks = cfg.get("bigBreaks", [])

        # Build break map: afterPeriod → (name, duration)
        break_map: dict[int, tuple[str, int]] = {}
        for bb in big_breaks:
            ap = bb.get("afterPeriod")
            if ap is not None:
                break_map[ap] = (bb.get("name", "Перемена"), bb.get("duration", 15))

        # Calculate actual times
        h, m = map(int, start_time.split(":"))
        current_min = h * 60 + m

        lines = [f'BELL SCHEDULE: "{b["name"]}" — {total_periods} periods, {lesson_dur}min lessons.\n']
        lines.append("DAILY TIMELINE:")

        for p in range(total_periods):
            start_h, start_m = divmod(current_min, 60)
            end_min = current_min + lesson_dur
            end_h, end_m = divmod(end_min, 60)
            lines.append(f"  Period {p} (#{p+1}): {start_h:02d}:{start_m:02d}–{end_h:02d}:{end_m:02d}")
            current_min = end_min

            # Add break after this period
            period_num = p + 1  # 1-based for matching bigBreaks.afterPeriod
            if period_num in break_map:
                bname, bdur = break_map[period_num]
                lines.append(f"    ↓ {bname} ({bdur} min)")
                current_min += bdur
            elif p < total_periods - 1:
                if default_break:
                    lines.append(f"    ↓ перемена ({default_break} min)")
                    current_min += default_break

        lines.append("")
        lines.append("SCHEDULING GUIDANCE based on breaks:")
        lines.append("  - After long breaks (breakfast/lunch), students are refreshed → place demanding subjects (Math, Physics, Chemistry) there.")
        lines.append("  - Before long breaks, place lighter subjects or creative ones (Art, Music, PE).")
        lines.append("")

        return "\n".join(lines) + "\n"

    return ""


def _extract_json(text: str) -> dict | list:
    """Extract JSON from AI response. Handles dicts, lists, markdown blocks, and truncated output."""
    text = text.strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try inside markdown code block
    m = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # Try extracting {..} or [..]
    for open_ch, close_ch in [("{", "}"), ("[", "]")]:
        s = text.find(open_ch)
        e = text.rfind(close_ch)
        if s != -1 and e > s:
            try:
                return json.loads(text[s:e + 1])
            except json.JSONDecodeError:
                pass

    # Try to recover TRUNCATED JSON by closing open brackets
    for open_ch, close_ch in [("{", "}"), ("[", "]")]:
        s = text.find(open_ch)
        if s != -1:
            fragment = text[s:]
            # Find last complete entry (ends with })
            last_brace = fragment.rfind("}")
            if last_brace > 0:
                truncated = fragment[:last_brace + 1]
                # Close any open brackets
                open_sq = truncated.count("[") - truncated.count("]")
                open_curly = truncated.count("{") - truncated.count("}")
                truncated += "}" * open_curly + "]" * open_sq
                try:
                    result = json.loads(truncated)
                    logger.warning("    ⚠ Recovered truncated JSON (%d chars)", len(truncated))
                    return result
                except json.JSONDecodeError:
                    pass

    logger.error("Cannot parse AI JSON: %s", text[:300])
    return {"entries": []}
