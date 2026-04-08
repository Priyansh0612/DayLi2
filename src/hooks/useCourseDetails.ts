import { useState, useCallback, useMemo } from 'react';
import { Alert, Linking, Keyboard } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { Assessment, Course, MergedClassSession, FormSession } from '../types/courseDetails';
import { getTheme, timeStringToMins, minsToTimeStr, toDBTime, processClasses } from '../utils/courseDetailsUtils';

export const useCourseDetails = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { courseId, initialCode, initialColor } = route.params;

    const [course, setCourse] = useState<Course | null>(null);
    const theme = useMemo(() => getTheme(course?.code || initialCode, course?.color || initialColor), [course?.code, course?.color, initialCode, initialColor]);

    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [classes, setClasses] = useState<MergedClassSession[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState('assessments');
    const [gradeModal, setGradeModal] = useState<Assessment | null>(null);
    const [scoreInput, setScoreInput] = useState('');
    const [totalInput, setTotalInput] = useState('');
    const [dateInput, setDateInput] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [manageScheduleVisible, setManageScheduleVisible] = useState(false);
    const [formSessions, setFormSessions] = useState<FormSession[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [pickerInfo, setPickerInfo] = useState<{ index: number, field: 'startTime' | 'endTime' } | null>(null);

    const [targetModalVisible, setTargetModalVisible] = useState(false);
    const [targetInput, setTargetInput] = useState('80');
    const [pdfModalVisible, setPdfModalVisible] = useState(false);

    useFocusEffect(useCallback(() => { fetchCourseDetails(); }, [courseId]));

    const fetchCourseDetails = async () => {
        setLoading(true);
        try {
            const { data: courseData, error: cErr } = await supabase.from('courses').select('*').eq('id', courseId).single();
            if (cErr) throw cErr;
            setCourse(courseData);

            const { data: assData, error: aErr } = await supabase.from('assessments').select('*').eq('course_id', courseId);
            if (aErr) throw aErr;

            const sortedAssessments = (assData || []).sort((a, b) => {
                if (a.due_date && b.due_date) {
                    const dA = new Date(a.due_date.includes('T') ? a.due_date : `${a.due_date}T12:00:00`).getTime();
                    const dB = new Date(b.due_date.includes('T') ? b.due_date : `${b.due_date}T12:00:00`).getTime();
                    return dA - dB;
                }
                if (a.due_date && !b.due_date) return -1;
                if (!a.due_date && b.due_date) return 1;
                return (b.weight || 0) - (a.weight || 0);
            });
            setAssessments(sortedAssessments);

            const { data: classData, error: clErr } = await supabase.from('classes').select('*').eq('course_id', courseId).order('day_of_week').order('start_time');
            if (clErr) throw clErr;
            setClasses(processClasses(classData || []));

        } catch (error: any) {
            Alert.alert("Error", error.message);
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const calcGrade = () => {
        let tw = 0, ws = 0;
        assessments.forEach(a => {
            if (a.is_completed && a.my_score !== null && a.total_marks) {
                ws += (a.my_score / a.total_marks) * a.weight; tw += a.weight;
            }
        });
        return tw === 0 ? null : Math.round((ws / tw) * 100);
    };

    const grade = calcGrade();
    const completedCount = assessments.filter(a => a.is_completed).length;
    const completedPct = assessments.length > 0 ? (completedCount / assessments.length) * 100 : 0;

    const getMotivation = () => {
        const target = course?.target_grade ?? 80;
        let cur = 0, rem = 0, remTasks = 0;
        assessments.forEach(a => {
            if (a.is_completed && a.my_score !== null && a.total_marks) {
                cur += (a.my_score / a.total_marks) * a.weight;
            } else {
                rem += a.weight;
                remTasks++;
            }
        });

        if (rem === 0) return { msg: "Course complete!", color: "#1C3326", bg: "#F2F7F4", border: "#E5EFEA" };
        const req = Math.round(((target - cur) / rem) * 100);
        const maxScore = Math.round(cur + rem);

        if (req > 100) return { msg: `Target ${target}% is out of reach. The maximum achievable grade is ${maxScore}%, assuming a perfect score on the remaining ${remTasks} task${remTasks === 1 ? '' : 's'}.`, color: "#4A252A", bg: "#FAF0F1", border: "#F5E1E3" };
        if (req <= 0) return { msg: "Target secured! Keep it up.", color: "#1C3326", bg: "#F2F7F4", border: "#E5EFEA" };

        const isHard = req > 85;
        return {
            msg: `Need ${req}% avg on remaining to hit ${target}%`,
            color: isHard ? "#4A2E15" : "#1C3326",
            bg: isHard ? "#FAF4EF" : "#F2F7F4",
            border: isHard ? "#F5E6DA" : "#E5EFEA"
        };
    };
    const motivation = getMotivation();

    const handleToggle = async (id: string, currentStatus: boolean | null) => {
        const newStatus = !(currentStatus || false);
        try {
            setAssessments(p => p.map(a => a.id === id ? { ...a, is_completed: newStatus } : a));
            await supabase.from('assessments').update({ is_completed: newStatus }).eq('id', id);
        } catch { fetchCourseDetails(); }
    };

    const handleSaveGrade = async () => {
        if (!gradeModal) return;
        const s = scoreInput.trim() !== '' ? parseFloat(scoreInput) : null;
        const t = totalInput.trim() !== '' ? parseFloat(totalInput) : null;

        if ((scoreInput.trim() !== '' || totalInput.trim() !== '') && (isNaN(s!) || isNaN(t!) || t! <= 0)) {
            return Alert.alert("Invalid Grade", "Please enter valid numbers for the score and total.");
        }

        const finalTotal = (s !== null && t === null) ? 100 : t;

        if (s !== null && s < 0) return Alert.alert("Invalid Score", "Your score cannot be negative.");
        if (s !== null && finalTotal !== null && s > finalTotal) {
            return Alert.alert("Invalid Score", "Your score cannot be greater than the total marks. Did you enter them backwards?");
        }

        try {
            const updates: any = {};
            if (s !== null) {
                updates.my_score = s;
                updates.total_marks = finalTotal ?? 100;
                updates.is_completed = true;
            } else {
                updates.my_score = null;
                updates.total_marks = null;
                updates.is_completed = false;
            }

            updates.due_date = dateInput ? dateInput.toISOString() : null;

            setAssessments(prev => prev.map(a => a.id === gradeModal.id ? { ...a, ...updates } : a));
            setGradeModal(null);

            const { error } = await supabase.from('assessments').update(updates).eq('id', gradeModal.id);
            if (error) throw error;
        } catch (e: any) {
            Alert.alert("Save Failed", e.message || "Unknown error");
            fetchCourseDetails();
        }
    };

    const openManageSchedule = () => {
        const initialForm = classes.map(c => {
            const [h, m] = c.start_time.split(':').map(Number);
            const [eh, em] = c.end_time.split(':').map(Number);
            const sd = new Date(); sd.setHours(h, m, 0, 0);
            const ed = new Date(); ed.setHours(eh, em, 0, 0);
            return { tempId: Math.random().toString(), type: c.type || 'Lecture', days: [...c.days], startTime: sd, endTime: ed, location: c.location || '' };
        });
        setFormSessions(initialForm);
        setManageScheduleVisible(true);
    };

    const toggleFormDay = (index: number, dayToToggle: string) => {
        const updated = [...formSessions];
        const currentDays = updated[index].days;
        if (currentDays.includes(dayToToggle)) updated[index].days = currentDays.filter(d => d !== dayToToggle);
        else updated[index].days = [...currentDays, dayToToggle];
        setFormSessions(updated);
    };

    const updateSession = (index: number, field: keyof FormSession, value: any) => {
        const updated = [...formSessions];
        (updated[index] as any)[field] = value;
        setFormSessions(updated);
    };

    const addNewSession = () => {
        const sd = new Date(); sd.setHours(10, 0, 0, 0);
        const ed = new Date(); ed.setHours(11, 30, 0, 0);
        setFormSessions(prev => [...prev, { tempId: Math.random().toString(), type: 'Lecture', days: ['Monday'], startTime: sd, endTime: ed, location: '' }]);
    };

    const saveCompleteSchedule = async () => {
        const inserts = formSessions.flatMap(session => {
            if (session.days.length === 0) return [];
            return session.days.map(day => ({
                course_id: courseId, type: session.type, day_of_week: day,
                start_time: toDBTime(session.startTime), end_time: toDBTime(session.endTime), location: session.location
            }));
        });

        try {
            for (const insert of inserts) {
                if (timeStringToMins(insert.start_time) >= timeStringToMins(insert.end_time)) {
                    Alert.alert("Invalid Time", `A session on ${insert.day_of_week} ends before it starts!`); return;
                }
            }

            for (let i = 0; i < inserts.length; i++) {
                for (let j = i + 1; j < inserts.length; j++) {
                    const a = inserts[i], b = inserts[j];
                    if (a.day_of_week === b.day_of_week) {
                        if (timeStringToMins(a.start_time) < timeStringToMins(b.end_time) && timeStringToMins(a.end_time) > timeStringToMins(b.start_time)) {
                            Alert.alert("Internal Conflict ", `You have overlapping sessions selected on ${a.day_of_week}. Please fix them before saving.`); return;
                        }
                    }
                }
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: otherCourses } = await supabase.from('courses').select('code, classes(*)').eq('user_id', user.id).neq('id', courseId);
                if (otherCourses) {
                    const occupiedSlots = otherCourses.flatMap(c => (c.classes || []).map(cls => ({ courseCode: c.code, day: cls.day_of_week, startMins: timeStringToMins(cls.start_time), endMins: timeStringToMins(cls.end_time) })));
                    for (const insert of inserts) {
                        const insertStart = timeStringToMins(insert.start_time), insertEnd = timeStringToMins(insert.end_time);
                        const conflict = occupiedSlots.find(slot => slot.day === insert.day_of_week && insertStart < slot.endMins && insertEnd > slot.startMins);
                        if (conflict) { Alert.alert("Schedule Conflict", `This session overlaps with ${conflict.courseCode} on ${insert.day_of_week} from ${minsToTimeStr(conflict.startMins)} to ${minsToTimeStr(conflict.endMins)}.`); return; }
                    }
                }
            }

            await supabase.from('classes').delete().eq('course_id', courseId);
            if (inserts.length > 0) {
                const { error } = await supabase.from('classes').insert(inserts);
                if (error) throw error;
            }
            setManageScheduleVisible(false);
            fetchCourseDetails();
        } catch (e: any) { Alert.alert("Error", e.message); }
    };

    const saveTarget = async () => {
        const newTarget = parseFloat(targetInput);
        if (isNaN(newTarget)) return Alert.alert("Invalid", "Please enter a valid number.");
        setCourse(p => p ? { ...p, target_grade: newTarget } : null);
        setTargetModalVisible(false);
        const { error } = await supabase.from('courses').update({ target_grade: newTarget }).eq('id', courseId);
        if (error) Alert.alert("Error", "Could not save target.");
    };

    const openEmail = () => course?.professor_email ? Linking.openURL(`mailto:${course.professor_email}`) : Alert.alert("No Email", "None saved.");
    const openSyllabus = () => {
        if (!course?.outline_url) return Alert.alert("No Syllabus", "None uploaded.");
        setPdfModalVisible(true);
    };

    return {
        // State Data
        course,
        courseId,
        theme,
        assessments,
        classes,
        loading,

        // Computed Values
        grade,
        completedCount,
        completedPct,
        motivation,

        // Modals & UI Toggles
        activeTab, setActiveTab,
        gradeModal, setGradeModal,
        scoreInput, setScoreInput,
        totalInput, setTotalInput,
        dateInput, setDateInput,
        showDatePicker, setShowDatePicker,
        manageScheduleVisible, setManageScheduleVisible,
        formSessions, setFormSessions,
        showPicker, setShowPicker,
        pickerInfo, setPickerInfo,
        targetModalVisible, setTargetModalVisible,
        targetInput, setTargetInput,
        pdfModalVisible, setPdfModalVisible,

        // Actions
        handleToggle,
        handleSaveGrade,
        openManageSchedule,
        toggleFormDay,
        updateSession,
        addNewSession,
        saveCompleteSchedule,
        saveTarget,
        openEmail,
        openSyllabus,
    };
};
