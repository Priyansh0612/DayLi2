import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect, useRoute, usePreventRemove } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../config/supabase';
import { generateAvailability, minsToTimeStr, validateTargetHours, ClassSchedule, WorkPreferences } from '../services/availabilityEngine';
import { Mode, DatedTimeSlot } from '../types/worksDashboard';
import { formatDateSafely, getSmartMonday, calcDateForDay, timeStringToMins, minsToDbTime, cTime, DAYS_ORDER } from '../utils/worksDashboardUtils';

export const useWorksDashboard = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [mode, setMode] = useState<Mode>('shifts');

    const [classesList, setClassesList] = useState<ClassSchedule[]>([]);
    const [preferences, setPreferences] = useState<WorkPreferences | null>(null);
    const [schedule, setSchedule] = useState<DatedTimeSlot[]>([]);
    const [existingShifts, setExistingShifts] = useState<DatedTimeSlot[]>([]);
    const [availBlocks, setAvailBlocks] = useState<DatedTimeSlot[]>([]);
    const [availGenerated, setAvailGenerated] = useState(false);
    const [examList, setExamList] = useState<{ date: string, title: string, courseCode: string }[]>([]);

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editDates, setEditDates] = useState<string[]>([]);
    const [editStart, setEditStart] = useState(0);
    const [editEnd, setEditEnd] = useState(0);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const weekStart = useMemo(() => getSmartMonday(0), []);

    // Keep a fresh reference to actions to avoid re-binding beforeRemove every render
    const actionRef = useRef<any>(null);
    useEffect(() => {
        actionRef.current = { mode, handleSaveShifts, handleExportAvailability };
    });

    usePreventRemove(hasUnsavedChanges, (e: any) => {
        Alert.alert(
            'Unsaved Changes',
            'You have unsaved schedule adjustments. Do you want to save them before leaving?',
            [
                { 
                    text: actionRef.current?.mode === 'shifts' ? "Lock In Schedule" : "Save & Export PDF", 
                    onPress: async () => {
                        if (!actionRef.current) return;
                        const success = actionRef.current.mode === 'shifts' 
                            ? await actionRef.current.handleSaveShifts() 
                            : await actionRef.current.handleExportAvailability();
                        // Timeout allows the Alert modal to close cleanly before native transition
                        if (success) setTimeout(() => navigation.dispatch(e.data.action), 50);
                    } 
                },
                { text: "Keep Editing", style: 'cancel', onPress: () => {} },
                { text: "Discard", style: 'destructive', onPress: () => setTimeout(() => navigation.dispatch(e.data.action), 50) }
            ]
        );
    });

    useFocusEffect(useCallback(() => {
        setIsSuccess(false);
        fetchData();
    }, []));

    useEffect(() => {
        if (route.params?.autoTriggerAdd) {
            navigation.setParams({ autoTriggerAdd: undefined });
            handleAdd();
        }
    }, [route.params?.autoTriggerAdd, navigation]);

    useEffect(() => {
        if (mode === 'availability' && !availGenerated && preferences) {
            generateAvailSched();
        }
    }, [mode, preferences, availGenerated]);

    const generateAvailSched = () => {
        if (!preferences) return;
        const raw = generateAvailability(classesList, preferences);
        const all14: DatedTimeSlot[] = [];

        raw.forEach(s => {
            const d1 = calcDateForDay(weekStart, s.day);
            const w2Date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
            const d2 = calcDateForDay(w2Date, s.day);

            const hasExamW1 = examList.some(ex => ex.date === d1);
            const hasExamW2 = examList.some(ex => ex.date === d2);

            if (!hasExamW1) all14.push({ ...s, shift_date: d1 });
            if (!hasExamW2) all14.push({ ...s, shift_date: d2 });
        });

        setSchedule(all14);
        setAvailBlocks(all14);
        setAvailGenerated(true);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const d1 = formatDateSafely(weekStart);
            const d14 = formatDateSafely(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 13));

            const [profileRes, coursesRes, shiftsRes] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', user.id).single(),
                supabase.from('courses').select('name, code, classes(*), assessments(*)').eq('user_id', user.id),
                supabase.from('work_shifts').select('*').eq('user_id', user.id).eq('type', 'shift').gte('shift_date', d1).lte('shift_date', d14)
            ]);

            const profile = profileRes.data;
            const myCourses = coursesRes.data || [];
            const confirmed = shiftsRes.data || [];

            if (!profile) return;

            const prefs: WorkPreferences = {
                targetHours: profile.target_work_hours || 15,
                commuteMins: profile.commute_time_mins || 30,
                shiftLengthMins: (profile.preferred_shift_length || 4) * 60,
                daysOff: profile.days_off || [],
                isInternationalStudent: profile.is_international_student || false,
            };
            setPreferences(prefs);

            const cs: ClassSchedule[] = [];
            const exams: { date: string, title: string, courseCode: string }[] = [];

            myCourses.forEach(course => {
                course.classes?.forEach(cls => {
                    if (!cls.start_time || !cls.end_time) return;
                    if ((cls.type || '').toLowerCase().includes('office') || (cls.location || '').toLowerCase().includes('office')) return;
                    const d = cls.day_of_week.trim();
                    const fd = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
                    cs.push({ dayOfWeek: fd, startTime: timeStringToMins(cls.start_time), endTime: timeStringToMins(cls.end_time), courseCode: course.code || course.name || 'Class', location: cls.location || 'TBA' });
                });

                course.assessments?.forEach(ass => {
                    const type = (ass.type || '').toLowerCase();
                    if (ass.due_date && (type === 'exam' || type === 'midterm' || type === 'final' || type === 'test')) {
                        const ds = ass.due_date.split('T')[0];
                        exams.push({ date: ds, title: ass.title, courseCode: course.code || course.name || 'COURSE' });
                    }
                });
            });

            setClassesList(cs);
            setExamList(exams);

            const v = validateTargetHours(prefs);
            if (!v.isValid) {
                Alert.alert('Setup Required', v.error || '');
                navigation.replace('WorkSetup');
                return;
            }

            if (confirmed?.length) {
                const parsed = confirmed.map(s => ({ day: s.day_of_week, shift_date: s.shift_date, start: timeStringToMins(s.start_time), end: timeStringToMins(s.end_time) }));
                setExistingShifts(parsed);
                setSchedule(parsed);
            } else {
                setExistingShifts([]);
                setSchedule([]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const toggleEditDate = (dateStr: string) => {
        if (editingIndex !== -1) {
            setEditDates([dateStr]);
            return;
        }
        setEditDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
    };

    const handleAdd = () => {
        const todayStr = formatDateSafely(new Date()); let offset = 0;
        for (let i = 0; i < 14; i++) {
            const d = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i);
            const s = formatDateSafely(d);
            if (s >= todayStr && !schedule.some(sh => sh.shift_date === s)) { offset = i; break; }
        }
        const dateObj = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + offset);
        setEditDates([formatDateSafely(dateObj)]); setEditStart(12 * 60); setEditEnd(16 * 60); setEditingIndex(-1);
    };

    const handleSaveEdit = () => {
        if (editingIndex === null || editDates.length === 0) return;
        if (!preferences) return;
        const isNew = editingIndex === -1;
        let effectiveEnd = editEnd <= editStart ? editEnd + 1440 : editEnd;
        if (effectiveEnd - editStart < 240) { Alert.alert('Conflict', 'Shift must be at least 4 hours.'); return; }

        const newSlots: DatedTimeSlot[] = [];
        const todayStr = formatDateSafely(new Date());

        for (const date of editDates) {
            const dateObj = new Date(date + 'T12:00:00');
            const dayName = DAYS_ORDER[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];

            if (mode === 'shifts' && date < todayStr) { Alert.alert('Conflict', `Cannot schedule in the past (${date}).`); return; }
            if (schedule.some((s, i) => s.shift_date === date && (isNew || i !== editingIndex))) { Alert.alert('Conflict', `A block already exists on ${date}.`); return; }

            for (const cls of classesList.filter(c => c.dayOfWeek === dayName)) {
                if (editStart < cls.endTime + preferences.commuteMins && effectiveEnd > cls.startTime - preferences.commuteMins) {
                    Alert.alert('Conflict', `Conflicts with ${cls.courseCode} on ${date} (+${preferences.commuteMins}min buffer).`); return;
                }
            }
            newSlots.push({ day: dayName, shift_date: date, start: editStart, end: effectiveEnd });
        }

        if (isNew) setSchedule(p => [...p, ...newSlots]);
        else setSchedule(p => p.map((s, i) => i === editingIndex ? newSlots[0] : s));
        setEditingIndex(null);
        setHasUnsavedChanges(true);
    };

    const handleDelete = () => { setSchedule(p => p.filter((_, i) => i !== editingIndex)); setEditingIndex(null); setHasUnsavedChanges(true); };

    const handleCopy = () => {
        const w1s = formatDateSafely(weekStart), w1e = formatDateSafely(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6));
        const w1 = schedule.filter(s => s.shift_date >= w1s && s.shift_date <= w1e);
        if (!w1.length) return;
        const w2s = formatDateSafely(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7));
        const w2e = formatDateSafely(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 13));
        const w2 = w1.map(s => { const x = new Date(s.shift_date + 'T12:00:00'); x.setDate(x.getDate() + 7); return { ...s, shift_date: formatDateSafely(x) }; });
        setSchedule(p => [...p.filter(s => s.shift_date < w2s || s.shift_date > w2e), ...w2]);
        setHasUnsavedChanges(true);
    };

    const handleSaveShifts = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const d1 = formatDateSafely(weekStart);
            const d14 = formatDateSafely(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 13));
            const toSave = schedule.filter(s => s.shift_date >= d1 && s.shift_date <= d14).map(s => ({ user_id: user.id, day_of_week: s.day, shift_date: s.shift_date, start_time: minsToDbTime(s.start), end_time: minsToDbTime(s.end), is_generated: false, type: 'shift', status: 'confirmed' }));
            await supabase.from('work_shifts').delete().eq('user_id', user.id).eq('type', 'shift').gte('shift_date', d1).lte('shift_date', d14);
            const { error } = await supabase.from('work_shifts').insert(toSave);
            if (error) throw error;
            setExistingShifts([...schedule]); setIsSuccess(true);
            setHasUnsavedChanges(false);
            return true;
        } catch (e: any) { Alert.alert('Error', e.message); return false; } finally { setIsSaving(false); }
    };

    const handleExportAvailability = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const toSave = schedule.map(s => ({ user_id: user.id, day_of_week: s.day, shift_date: s.shift_date, start_time: minsToDbTime(s.start), end_time: minsToDbTime(s.end), is_generated: true, type: 'availability', status: 'pending' }));

            await supabase.from('work_shifts').delete().eq('user_id', user.id).eq('type', 'availability');
            const { error } = await supabase.from('work_shifts').insert(toSave);
            if (error) throw error;

            const endStartObj = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 13);
            const rangeStr = `${weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} to ${endStartObj.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;

            const html = `<!DOCTYPE html><html><head><style>body{font-family:system-ui;padding:40px;background:#fff;color:#1C1917}h1{font-size:30px;font-weight:800;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:28px}th{text-align:left;padding:11px 14px;background:#F7F5F0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#78716C}td{padding:13px 14px;border-bottom:1px solid #EAE6DF;font-size:14px}</style></head><body>
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px">
                    <div style="font-size:24px;font-weight:950;color:#4338CA;letter-spacing:-0.8px">DayLi</div>
                    <div style="text-align:right">
                        <h1 style="margin:0;font-size:24px">Availability Declaration</h1>
                        <p style="color:#78716C;font-size:13px;margin-top:4px">Generated: ${new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                </div>
                
                <p style="margin-top:18px;line-height:1.7;font-size:14px">Please schedule me within these windows.<br/><strong>Valid Date Range:</strong> ${rangeStr}<br/><strong>Weekly maximum:</strong> ${preferences?.targetHours || 20} hours.</p>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Day</th>
                            <th>Window</th>
                            <th>Max</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...schedule]
                    .sort((a, b) => a.shift_date.localeCompare(b.shift_date) || a.start - b.start)
                    .map(s => {
                        const shiftD = new Date(s.shift_date + 'T12:00:00');
                        const shortDate = shiftD.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

                        return `<tr>
                                    <td style="color:#78716C">${shortDate}</td>
                                    <td><strong>${s.day}</strong></td>
                                    <td style="color:#5B5BD6;font-weight:700">${cTime(s.start)} — ${cTime(s.end)}</td>
                                    <td>${((s.end - s.start) / 60).toFixed(1)}h</td>
                                </tr>`;
                    }).join('')}
                    </tbody>
                </table>
            </body></html>`;

            const { uri } = await Print.printToFileAsync({ html });
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share Availability' });
            setIsSuccess(true);
            setHasUnsavedChanges(false);
            return true;
        } catch (e: any) {
            Alert.alert('Error', e.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    return {
        // State
        loading,
        isSaving,
        isSuccess,
        setIsSuccess,
        mode,
        setMode,
        classesList,
        preferences,
        schedule,
        setSchedule,
        existingShifts,
        setExistingShifts,
        availBlocks,
        setAvailBlocks,
        examList,
        editingIndex,
        setEditingIndex,
        editDates,
        setEditDates,
        editStart,
        setEditStart,
        editEnd,
        setEditEnd,
        weekStart,
        
        // Actions
        toggleEditDate,
        handleAdd,
        handleSaveEdit,
        handleDelete,
        handleCopy,
        handleSaveShifts,
        handleExportAvailability
    };
};
