import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Platform,
    Alert,
    RefreshControl,
    AppState,
    BackHandler,
    Animated
} from 'react-native';
import Reanimated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Home, BookOpen, Briefcase, Utensils, Wallet, Plus,
    FileText, FileUp, ShoppingCart, CloudSun, Camera,
    ArrowRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { supabase } from '../config/supabase';
import { useLiveTime } from '../hooks/useLiveTime';
import { expenseService } from '../services/expenseService';

// ─── Home Components ──────────────────────────────────────────
import { C, glass, titaniumCard, getFormattedDate, calculateAcademicWeek, formatTo12h, getWeekStartString } from '../components/Home/homeTokens';
import ProgressRing from '../components/Home/ProgressRing';
import SectionHeader from '../components/Home/SectionHeader';
import ScheduleItem from '../components/Home/ScheduleItem';
import { SchedType } from '../components/Home/ScheduleItem';
import QuickTile from '../components/Home/QuickTile';
import EditProfileSheet from '../components/Home/EditProfileSheet';
import ProfileSheet from '../components/Home/ProfileSheet';
import MealActionSheet from '../components/Home/MealActionSheet';
import CustomEventEditSheet from '../components/Home/CustomEventEditSheet';
import GapActionSheet from '../components/Home/GapActionSheet';
import { OnboardingGreeting, SetupChecklist, GhostDashboard } from '../components/Home/FTUEComponents';





const HomeScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { now, greeting } = useLiveTime();
    const scrollY = useRef(new Animated.Value(0)).current;

    // Breathing Animation for Background Orbs
    const breath = useSharedValue(0);

    useEffect(() => {
        breath.value = withRepeat(
            withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
            -1,
            true
        );
    }, []);

    const orb1Style = useAnimatedStyle(() => ({
        transform: [{ scale: 1 + (breath.value * 0.08) }],
        opacity: 0.8 + (breath.value * 0.2),
    }));

    const orb2Style = useAnimatedStyle(() => ({
        transform: [{ scale: 1.05 - (breath.value * 0.05) }],
        opacity: 1 - (breath.value * 0.2),
    }));

    // 🟢 Grab the exact height of the user's notch/island
    const insets = useSafeAreaInsets();

    const [viewOffset, setViewOffset] = useState<0 | 1>(0);
    const [username, setUsername] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [commuteMins, setCommuteMins] = useState<number>(15);
    const [showProfile, setShowProfile] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [fullProfileInfo, setFullProfileInfo] = useState<any>(null);
    const [selectedGap, setSelectedGap] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    const [semesterName, setSemesterName] = useState<string>('Winter 2026');
    const [academicWeek, setAcademicWeek] = useState<number | null>(null);
    const [uniName, setUniName] = useState<string>('Campus');
    const [weather, setWeather] = useState<{ temp: string | null; cond: string }>({ temp: null, cond: 'Loading' });
    const [skippedMeals, setSkippedMeals] = useState<string[]>([]);
    const [expenseData, setExpenseData] = useState({ spent: 0, budget: 250, safeAllowance: 250 });
    const [weeklyMealPlan, setWeeklyMealPlan] = useState<any>(null);
    const [currentWeekStart, setCurrentWeekStart] = useState<string>('');
    const [weeklyWorkHrs, setWeeklyWorkHrs] = useState<number>(0);
    const [weeklyWorkTarget, setWeeklyWorkTarget] = useState<number>(20); // Default to 20 hours

    const [userId, setUserId] = useState<string | null>(null);
    const [todayClasses, setTodayClasses] = useState<any[]>([]);
    const [todayMeals, setTodayMeals] = useState<any[]>([]);
    const [todayWork, setTodayWork] = useState<any[]>([]);
    const [customEvents, setCustomEvents] = useState<any[]>([]);
    const [urgentAssessments, setUrgentAssessments] = useState<any[]>([]);
    const [tomorrowEarliest, setTomorrowEarliest] = useState<Date | null>(null);

    // ✏️ Custom Event Editing State
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editStartTime, setEditStartTime] = useState('');
    const [editDuration, setEditDuration] = useState('1.5');
    const [isSaving, setIsSaving] = useState(false);

    // 🟢 PULL TO REFRESH HANDLER
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // 🛡️ Reset session overrides
        setSkippedMeals([]);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Fire all fetches at the exact same time
                await Promise.all([
                    fetchSchedule(user.id, viewOffset),
                    fetchExpenses(user.id),
                    fetchWeeklyWork(user.id),
                    fetchWeather(),
                    fetchSetupFlags(user.id)
                ]);
            }
        } catch (error) {
            console.error("Error refreshing:", error);
        } finally {
            setRefreshing(false);
        }
    }, [viewOffset]);
    const [selectedMeal, setSelectedMeal] = useState<any>(null);
    const [isNewEvent, setIsNewEvent] = useState(false); // 🔴 Toggle between Create/Edit
    const [isScheduleLoading, setIsScheduleLoading] = useState(true); // 🟢 MUST BE TRUE
    const isFirstLoad = useRef(true); // 🟢 ADD THIS REF

    // 🟢 The Master Setup Switches
    const [hasAnyCourses, setHasAnyCourses] = useState(false);
    const [hasFinanceSetup, setHasFinanceSetup] = useState(false);
    const [hasWorkSetup, setHasWorkSetup] = useState(false);
    const [hasMealSetup, setHasMealSetup] = useState(false);

    const fetchWeather = async () => {
        try {
            // 1. Ask for permission
            let { status } = await Location.requestForegroundPermissionsAsync();

            // Fallback coordinates used when the user denies location permission.
            // Defaults to Thunder Bay, ON — the original development user's city.
            let lat = 48.3822;
            let lon = -89.2461;

            if (status === 'granted') {
                // Use Balanced accuracy for faster/more reliable result on simulators
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced
                });
                lat = location.coords.latitude;
                lon = location.coords.longitude;
            }

            // 2. Fetch with a timeout to prevent hanging
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 8000); // 8s timeout

            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

            let data;
            try {
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: { 'Accept': 'application/json' }
                });
                data = await response.json();
            } finally {
                clearTimeout(id);
            }

            if (data && data.current_weather) {
                const temp = Math.round(data.current_weather.temperature);
                const code = data.current_weather.weathercode;

                let cond = 'Clear';
                if (code === 0) cond = 'Clear';
                else if (code >= 1 && code <= 3) cond = 'Cloudy';
                else if (code >= 45 && code <= 67) cond = 'Rain';
                else if (code >= 71 && code <= 86) cond = 'Snow';
                else if (code >= 95) cond = 'Storm';

                setWeather({ temp: `${temp}°C`, cond });
            }
        } catch (error: any) {
            setWeather({ temp: '--°C', cond: 'Offline' });
        }
    };

    const fetchSchedule = async (userId: string, offset: number) => {
        // 🟢 ONLY show the skeleton if it's the very first time opening the app
        if (isFirstLoad.current) setIsScheduleLoading(true);

        try {
            // 1. Establish the Target Date (Today + Offset)
            const targetDateObj = new Date();
            targetDateObj.setDate(targetDateObj.getDate() + offset);

            const targetWeekday = targetDateObj.toLocaleDateString('en-US', { weekday: 'long' });

            const year = targetDateObj.getFullYear();
            const month = String(targetDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(targetDateObj.getDate()).padStart(2, '0');
            const targetDateString = `${year}-${month}-${day}`; // Safe local date!

            // 🔴 NEW: Calculate Tomorrow's Date for Bedtime Math
            const tomorrowDateObj = new Date(targetDateObj);
            tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
            const tomorrowDateString = `${tomorrowDateObj.getFullYear()}-${String(tomorrowDateObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowDateObj.getDate()).padStart(2, '0')}`;
            const tomorrowWeekday = tomorrowDateObj.toLocaleDateString('en-US', { weekday: 'long' });

            // 🛡️ Safe local date split (Avoids UTC shift issues)
            const weekStartString = getWeekStartString(targetDateObj);

            // 🔴 NEW: Fetch Current Semester Name
            const { data: semesterData } = await supabase
                .from('semesters')
                .select('name')
                .eq('user_id', userId)
                .eq('is_current', true)
                .maybeSingle();
            if (semesterData) setSemesterName(semesterData.name);

            // 2. Fetch the EXACT data for the target date
            const { data: coursesData } = await supabase.from('courses').select('name, classes(*)').eq('user_id', userId);

            // 🟢 If they have courses saved, they aren't new!
            setHasAnyCourses(!!(coursesData && coursesData.length > 0));

            const { data: workData } = await supabase.from('work_shifts').select('*').eq('user_id', userId).eq('type', 'shift').eq('shift_date', targetDateString).order('start_time', { ascending: true });

            // 🔴 NEW: Fetch Work for Tomorrow to find earliest start
            const { data: tomorrowWork } = await supabase.from('work_shifts').select('start_time').eq('user_id', userId).eq('type', 'shift').eq('shift_date', tomorrowDateString).order('start_time', { ascending: true }).limit(1);

            const { data: mealPlan } = await supabase
                .from('weekly_meal_plans')
                .select('plan_data')
                .eq('user_id', userId)
                .eq('week_start_date', weekStartString)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            // 4. Fetch Assessments (Pulling top 10 to give the AI options)
            const { data: assessmentsData } = await supabase
                .from('assessments')
                .select('id, title, due_date, type, weight, courses!inner(name, user_id)') // 🔴 Added id, type, weight
                .eq('courses.user_id', userId)
                .eq('is_completed', false)
                .gte('due_date', targetDateString)
                .order('due_date', { ascending: true })
                .limit(10); // 🔴 Increased limit so AI can see next week!
            const { data: customData } = await supabase.from('custom_events').select('*').eq('user_id', userId).eq('event_date', targetDateString);

            if (assessmentsData) setUrgentAssessments(assessmentsData);

            // 3. Process Classes
            let tempClasses: any[] = [];
            if (coursesData) {
                tempClasses = coursesData.flatMap(course =>
                    (course.classes || [])
                        .filter((c: any) => c.day_of_week === targetWeekday && !((c.type || '').toLowerCase().includes('office') || (c.type || '').toLowerCase().includes('hour')))
                        .map((c: any) => {
                            const start = parseTimeToTargetDate(c.start_time, targetDateObj).getTime();
                            const end = parseTimeToTargetDate(c.end_time || c.start_time, targetDateObj).getTime() + (c.end_time ? 0 : 90 * 60 * 1000);
                            return {
                                id: `class-${c.id}`, type: 'academic',
                                title: (c.type || '').toLowerCase().includes('exam') ? `EXAM: ${course.name}` : course.name,
                                subtitle: `${c.location || 'TBD'} · ${formatTo12h(c.start_time)}`,
                                time: formatTo12h(c.start_time), dateObj: start, endDateObj: end
                            };
                        })
                );
                setTodayClasses(tempClasses);
            }

            // 4. Process Work
            let tempWork: any[] = [];
            if (workData) {
                tempWork = workData.map(w => {
                    const start = parseTimeToTargetDate(w.start_time, targetDateObj).getTime();
                    let end = parseTimeToTargetDate(w.end_time || w.start_time, targetDateObj).getTime();
                    if (end < start) end += 24 * 60 * 60 * 1000;
                    const durationHrs = Math.round(((end - start) / (1000 * 60 * 60)) * 100) / 100;
                    return {
                        id: `work-${w.id}`, type: 'work', title: 'Work Shift',
                        subtitle: `${durationHrs} hr shift`, time: formatTo12h(w.start_time),
                        dateObj: start, endDateObj: end
                    };
                });
                setTodayWork(tempWork);
            } else { setTodayWork([]); }

            // 5. Process Custom Events
            let processedCustom: any[] = [];
            if (customData) {
                processedCustom = customData.map(c => {
                    const start = parseTimeToTargetDate(c.start_time, targetDateObj).getTime();
                    return {
                        id: `custom-${c.id}`, rawId: c.id,
                        type: c.category === 'academic' ? 'academic' : (c.category === 'meal' ? 'meal' : 'work'),
                        title: c.title,
                        subtitle: c.category === 'meal' ? 'Planned meal' : 'Custom block',
                        time: formatTo12h(c.start_time),
                        dateObj: start, endDateObj: start + (c.duration_hours || 1.5) * 60 * 60 * 1000,
                        durationHours: c.duration_hours || 1.5, rawStartTime: c.start_time,
                        category: c.category,
                        isCustom: true // ✏️ Mark as editable!
                    };
                });

                // 🔴 NEW: Filter orphaned meal overrides if the meal doesn't exist in the plan
                if (mealPlan?.plan_data && mealPlan.plan_data[targetWeekday]) {
                    const dailyPlan = mealPlan.plan_data[targetWeekday];
                    processedCustom = processedCustom.filter(e => {
                        if (e.category !== 'meal') return true;
                        const lowerTitle = e.title.toLowerCase();
                        if (lowerTitle.includes('breakfast') && !dailyPlan.Breakfast) return false;
                        if (lowerTitle.includes('lunch') && !dailyPlan.Lunch) return false;
                        if (lowerTitle.includes('dinner') && !dailyPlan.Dinner) return false;
                        return true;
                    });
                } else {
                    // No meal plan at all today -> no meal overrides should be shown
                    processedCustom = processedCustom.filter(e => e.category !== 'meal');
                }

                setCustomEvents(processedCustom);
            } else { setCustomEvents([]); }

            // 🔴 6. Calculate Tomorrow's Earliest Start (for Bedtime Math)
            let earliestMs = Infinity;
            if (coursesData) {
                coursesData.forEach(course => {
                    (course.classes || []).forEach((c: any) => {
                        if (c.day_of_week === tomorrowWeekday && !((c.type || '').toLowerCase().includes('office') || (c.type || '').toLowerCase().includes('hour'))) {
                            const start = parseTimeToTargetDate(c.start_time, tomorrowDateObj).getTime();
                            if (start < earliestMs) earliestMs = start;
                        }
                    });
                });
            }
            if (tomorrowWork && tomorrowWork.length > 0) {
                const start = parseTimeToTargetDate(tomorrowWork[0].start_time, tomorrowDateObj).getTime();
                if (start < earliestMs) earliestMs = start;
            }
            setTomorrowEarliest(earliestMs === Infinity ? null : new Date(earliestMs));

            // 7. Process Meals (Now Powered by the AI Anchor Engine)
            if (mealPlan?.plan_data) {
                setWeeklyMealPlan(mealPlan.plan_data);
                setCurrentWeekStart(weekStartString);

                if (mealPlan.plan_data[targetWeekday]) {
                    // Feed the daily plan, classes, work, AND overrides into our smart generator!
                    const smartMeals = generateSmartMeals(targetDateObj, mealPlan.plan_data[targetWeekday], tempClasses, tempWork, processedCustom);
                    setTodayMeals(smartMeals);
                } else { setTodayMeals([]); }
            } else {
                setTodayMeals([]);
                setWeeklyMealPlan(null);
                setCurrentWeekStart('');
            }

        } catch (error) {
            console.error("Error fetching schedule:", error);
            // 🛡️ Clear state so ghost data doesn't persist on errors
            setTodayClasses([]);
            setTodayWork([]);
            setTodayMeals([]);
            setCustomEvents([]);
        } finally {
            setIsScheduleLoading(false);
            if (isFirstLoad.current) isFirstLoad.current = false;
        }
    };

    const handleFillGap = (gapItem: any) => {
        setSelectedGap(gapItem);
    };

    const handleAddCustomEvent = async (actionType: 'smart' | 'study' | 'personal', customTitle?: string) => {
        if (!selectedGap) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get precise LOCAL date and time
        const gapDate = new Date(selectedGap.dateObj);

        const year = gapDate.getFullYear();
        const month = String(gapDate.getMonth() + 1).padStart(2, '0');
        const day = String(gapDate.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`; // Safe local date!

        const formattedTime = `${gapDate.getHours().toString().padStart(2, '0')}:${gapDate.getMinutes().toString().padStart(2, '0')}:00`;

        if (actionType === 'study' || actionType === 'personal') {
            // 🔴 NEW UX: Don't save yet! Open the editor instead.
            setEditTitle(actionType === 'study' ? 'Custom Study Block' : 'Personal Time');
            setEditStartTime(selectedGap.time);
            setEditDuration('1.5');
            setIsNewEvent(true);
            setEditingEvent({ ...selectedGap, category: actionType === 'study' ? 'academic' : 'personal' });
            setSelectedGap(null); // Close the GapActionSheet
            setIsEditModalVisible(true);
            return;
        }

        if (actionType === 'smart') {
            try {
                const eventTitle = customTitle ? customTitle : (urgentAssessments[0]?.title || 'Assignment');
                const eventCategory = 'academic';

                const { error } = await supabase
                    .from('custom_events')
                    .insert([{
                        user_id: user.id,
                        title: eventTitle,
                        category: eventCategory,
                        event_date: formattedDate,
                        start_time: formattedTime,
                        duration_hours: 1.5
                    }]);

                if (error) throw error;
                setSelectedGap(null);
                fetchSchedule(user.id, viewOffset);
            } catch (error) {
                console.error("Error inserting custom event:", error);
                Alert.alert("Error", "Could not add event.");
            }
        }
    };

    const handleMarkAssessmentDone = async (assessmentId: string) => {
        try {
            const { error } = await supabase
                .from('assessments')
                .update({ is_completed: true })
                .eq('id', assessmentId);

            if (error) throw error;

            // Close the sheet and instantly refresh! The AI will recalculate the gaps.
            setSelectedGap(null);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) fetchSchedule(user.id, viewOffset);

        } catch (error) {
            console.error("Error marking done:", error);
            alert("Could not update task.");
        }
    };


    const aHero = useRef(new Animated.Value(0)).current;
    const aStreak = useRef(new Animated.Value(0)).current;
    const aSched = useRef(new Animated.Value(0)).current;
    const aBento = useRef(new Animated.Value(0)).current;
    const aQuick = useRef(new Animated.Value(0)).current;
    const checkCollisions = (startTimeStr: string, durationHours: number, targetDay: Date, excludeId?: string) => {
        const proposedStart = parseTimeToTargetDate(startTimeStr, targetDay).getTime();
        const proposedEnd = proposedStart + (durationHours * 60 * 60 * 1000);

        // 🛡️ 1. Check Hard Collisions (Classes & Work)
        const fixedPillars = [...todayClasses, ...todayWork];
        for (const pillar of fixedPillars) {
            if (pillar.id === excludeId) continue;
            const hasOverlap = proposedStart < pillar.endDateObj && proposedEnd > pillar.dateObj;
            if (hasOverlap) {
                return { type: 'hard', title: pillar.title };
            }
        }

        // 🛡️ 2. Check Soft Collisions (Custom Events & Meals)
        const fluidBlocks = [...customEvents, ...todayMeals];
        for (const block of fluidBlocks) {
            if (block.id === excludeId || block.rawId === excludeId) continue;
            const hasOverlap = proposedStart < block.endDateObj && proposedEnd > block.dateObj;
            if (hasOverlap) {
                return { type: 'soft', title: block.title.split(' — ')[0] }; // Clean title for meals
            }
        }

        return null; // All clear!
    };

    const handleSaveNewCustomEvent = async () => {
        if (!editingEvent || !editTitle.trim()) return;
        setIsSaving(true);
        try {
            const parsedDuration = parseFloat(editDuration);
            if (isNaN(parsedDuration) || parsedDuration <= 0) {
                Alert.alert("Invalid Duration", "Please enter a valid number of hours (e.g. 1.5).");
                setIsSaving(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get precise LOCAL date from the selected gap (stored in editingEvent)
            const gapDate = new Date(editingEvent.dateObj);
            const year = gapDate.getFullYear();
            const month = String(gapDate.getMonth() + 1).padStart(2, '0');
            const day = String(gapDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            // 🛡️ CHECK COLLISIONS FIRST
            const collision = checkCollisions(editStartTime, parsedDuration, gapDate);
            if (collision) {
                if (collision.type === 'hard') {
                    Alert.alert("Cannot move", `You have ${collision.title} at that time.`);
                } else {
                    Alert.alert("Overlap Detected", `This overlaps with ${collision.title}. Please adjust ${collision.title} first.`);
                }
                setIsSaving(false);
                return;
            }

            const hms = parseTimeToTargetDate(editStartTime, gapDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ":00";

            const { error } = await supabase
                .from('custom_events')
                .insert([{
                    user_id: user.id,
                    title: editTitle,
                    category: editingEvent.category,
                    event_date: formattedDate,
                    start_time: hms,
                    duration_hours: parsedDuration
                }]);

            if (error) throw error;
            setIsEditModalVisible(false);
            fetchSchedule(user.id, viewOffset);
        } catch (err) {
            Alert.alert("Save Failed", "Could not create the custom block.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateCustomEvent = async () => {
        if (!editingEvent || !editTitle.trim()) return;
        setIsSaving(true);
        const gapDate = new Date(editingEvent.dateObj);

        const parsedDuration = parseFloat(editDuration);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
            Alert.alert("Invalid Duration", "Please enter a valid number of hours (e.g. 1.5).");
            setIsSaving(false);
            return;
        }

        // 🛡️ CHECK COLLISIONS FIRST
        const collision = checkCollisions(editStartTime, parsedDuration, gapDate, editingEvent.id || editingEvent.rawId);
        if (collision) {
            if (collision.type === 'hard') {
                Alert.alert("Cannot move", `You have ${collision.title} at that time.`);
            } else {
                Alert.alert("Overlap Detected", `This overlaps with ${collision.title}. Please adjust ${collision.title} first.`);
            }
            setIsSaving(false);
            return;
        }

        try {
            const hms = parseTimeToTargetDate(editStartTime, gapDate).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ":00";

            const { error } = await supabase
                .from('custom_events')
                .update({
                    title: editTitle,
                    start_time: hms,
                    duration_hours: parsedDuration
                })
                .eq('id', editingEvent.rawId);

            if (error) throw error;
            setIsEditModalVisible(false);
            fetchSchedule(userId!, viewOffset);
        } catch (err) {
            Alert.alert("Update Failed", "Could not save changes to the block.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCustomEvent = async () => {
        if (!editingEvent) return;
        Alert.alert(
            "Delete Block?",
            `Are you sure you want to remove this ${editingEvent.category === 'meal' ? 'meal' : 'study/personal block'}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('custom_events')
                                .delete()
                                .eq('id', editingEvent.rawId);
                            if (error) throw error;
                            setIsEditModalVisible(false);
                            fetchSchedule(userId!, viewOffset);
                        } catch (err) {
                            Alert.alert("Error", "Could not delete the block.");
                        }
                    }
                }
            ]
        );
    };

    const progressWidth = useRef(new Animated.Value(0)).current;
    const [pctDisplay, setPctDisplay] = useState(0);


    // Helper function that respects if we are looking at Today OR Tomorrow!
    const parseTimeToTargetDate = (timeStr: string, targetDateObj: Date) => {
        if (!timeStr) return new Date(targetDateObj);

        let hours = 0;
        let minutes = 0;

        try {
            if (timeStr.includes('AM') || timeStr.includes('PM')) {
                const parts = timeStr.split(' ');
                if (parts.length < 2) throw new Error("Invalid PM/AM format");
                const [time, modifier] = parts;
                const [hStr, mStr] = time.split(':');
                hours = parseInt(hStr, 10);
                minutes = mStr ? parseInt(mStr, 10) : 0;

                if (modifier === 'PM' && hours < 12) hours += 12;
                if (modifier === 'AM' && hours === 12) hours = 0;
            } else {
                const parts = timeStr.split(':');
                hours = parseInt(parts[0], 10);
                minutes = parts[1] ? parseInt(parts[1], 10) : 0;
            }
        } catch (e) {
            console.error("Time parsing failed for:", timeStr);
            return new Date(targetDateObj);
        }

        // 🛡️ Final sanity check for NaN
        if (isNaN(hours) || isNaN(minutes)) return new Date(targetDateObj);

        const d = new Date(targetDateObj); // 🔴 CRITICAL: Uses the specific day we are viewing
        d.setHours(hours, minutes, 0, 0);
        return d;
    };

    // 🧠 AI MEAL ANCHOR ENGINE
    const generateSmartMeals = (targetDateObj: Date, dayMeals: any, classes: any[], work: any[], overrides: any[] = []) => {
        const smartMeals: any[] = [];
        const events = [...classes, ...work].sort((a, b) => a.dateObj - b.dateObj);

        // 1. 🥑 BREAKFAST (Tied to Wake-Up Time)
        const hasBreakfastOverride = overrides.some(o => o.title.toLowerCase().includes('breakfast')) || skippedMeals.includes('Breakfast');
        if (dayMeals.Breakfast && !hasBreakfastOverride) {
            let breakfastMs = new Date(targetDateObj).setHours(10, 0, 0, 0); // Default to Lazy 10:00 AM
            let mealTitle = `Breakfast — ${dayMeals.Breakfast.dish_name || dayMeals.Breakfast}`;

            if (events.length > 0) {
                const firstStart = new Date(events[0].dateObj);
                if (firstStart.getHours() < 12) {
                    // Math: Earliest event - Commute - 60 min Prep/Snooze + 20 mins to get to kitchen
                    breakfastMs = events[0].dateObj - ((commuteMins + 60) * 60 * 1000) + (20 * 60 * 1000);
                }
            }

            smartMeals.push({
                id: 'meal-breakfast', type: 'meal', title: mealTitle, subtitle: 'Planned meal',
                time: formatTo12h(new Date(breakfastMs).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })),
                dateObj: breakfastMs, endDateObj: breakfastMs + 30 * 60 * 1000
            });
        }

        // 2. 🥪 LUNCH (Tied to Mid-Day Gaps)
        const hasLunchOverride = overrides.some(o => o.title.toLowerCase().includes('lunch')) || skippedMeals.includes('Lunch');
        if (dayMeals.Lunch && !hasLunchOverride) {
            const lunchStartMs = new Date(targetDateObj).setHours(11, 30, 0, 0);
            const lunchEndMs = new Date(targetDateObj).setHours(14, 30, 0, 0);
            let lunchMs = new Date(targetDateObj).setHours(12, 30, 0, 0); // Default 12:30 PM
            let mealTitle = `Lunch — ${dayMeals.Lunch.dish_name || dayMeals.Lunch}`;
            let duration = 45;

            const lunchConflicts = events.filter(e => e.dateObj < lunchEndMs && e.endDateObj > lunchStartMs);

            if (lunchConflicts.length === 1) {
                // Push lunch after class if class ends before 2:30 PM
                lunchMs = lunchConflicts[0].endDateObj < lunchEndMs
                    ? lunchConflicts[0].endDateObj + (10 * 60 * 1000)
                    : lunchConflicts[0].dateObj - (50 * 60 * 1000);
            } else if (lunchConflicts.length > 1) {
                // Back-to-back classes: Squeeze a quick bite!
                mealTitle = `Quick Bite — ${dayMeals.Lunch.dish_name || dayMeals.Lunch}`;
                duration = 15;
                lunchMs = lunchConflicts[0].endDateObj;
            }

            smartMeals.push({
                id: 'meal-lunch', type: 'meal', title: mealTitle, subtitle: duration === 15 ? 'Squeezed between classes' : 'Planned meal',
                time: formatTo12h(new Date(lunchMs).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })),
                dateObj: lunchMs, endDateObj: lunchMs + duration * 60 * 1000
            });
        }

        // 3. 🍝 DINNER (Tied to Evening & Work Shifts)
        const hasDinnerOverride = overrides.some(o => o.title.toLowerCase().includes('dinner')) || skippedMeals.includes('Dinner');
        if (dayMeals.Dinner && !hasDinnerOverride) {
            let dinnerMs = new Date(targetDateObj).setHours(20, 0, 0, 0); // 🔴 THE FIX: Default to 8:00 PM for students!
            let mealTitle = `Dinner — ${dayMeals.Dinner.dish_name || dayMeals.Dinner}`;
            let subtitle = 'Planned meal';

            const dinnerStartMs = new Date(targetDateObj).setHours(17, 0, 0, 0);
            const dinnerEndMs = new Date(targetDateObj).setHours(21, 0, 0, 0);
            const dinnerConflicts = events.filter(e => e.dateObj < dinnerEndMs && e.endDateObj > dinnerStartMs);

            if (dinnerConflicts.length > 0) {
                const mainConflict = dinnerConflicts.sort((a, b) => (b.endDateObj - b.dateObj) - (a.endDateObj - a.dateObj))[0];
                const durationHrs = (mainConflict.endDateObj - mainConflict.dateObj) / (1000 * 60 * 60);

                if (durationHrs >= 4) {
                    // 🔴 THE FIX: Work Break Logic! Placed in the middle of a long shift.
                    const middleMs = mainConflict.dateObj + ((mainConflict.endDateObj - mainConflict.dateObj) / 2);
                    dinnerMs = middleMs - (15 * 60 * 1000);
                    mealTitle = `Break (Dinner) — ${dayMeals.Dinner.dish_name || dayMeals.Dinner}`;
                    subtitle = 'During your shift';
                } else if (mainConflict.endDateObj <= new Date(targetDateObj).setHours(22, 0, 0, 0)) {
                    // Shift ends by 10 PM? Eat when you get home.
                    dinnerMs = mainConflict.endDateObj + (20 * 60 * 1000);
                    subtitle = 'Late Dinner';
                } else {
                    // Shift goes super late? Eat early before you leave.
                    dinnerMs = mainConflict.dateObj - (45 * 60 * 1000);
                    subtitle = 'Early Dinner';
                }
            }

            smartMeals.push({
                id: 'meal-dinner', type: 'meal', title: mealTitle, subtitle: subtitle,
                time: formatTo12h(new Date(dinnerMs).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })),
                dateObj: dinnerMs, endDateObj: dinnerMs + 45 * 60 * 1000
            });
        }

        return smartMeals;
    };

    const fetchExpenses = async (userId: string) => {
        try {
            // 1. Get the 1st day of the current month
            const today = new Date();
            const firstDayOfMonth = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)).toISOString();

            // 2. Fetch budget from user_budgets (Fallback to 250 if not set yet)
            const budgetData = await expenseService.fetchUserBudget();

            const budget = budgetData?.monthly_income || 250;
            const safeAllowance = budgetData?.safe_allowance || budget;

            // 🟢 If they have a budget saved, they aren't new!
            setHasFinanceSetup(!!budgetData);

            // 3. Fetch all transactions for this month
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', userId)
                .gte('date', firstDayOfMonth);

            // 4. Add them up!
            const totalSpent = transactions?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

            setExpenseData({ spent: totalSpent, budget: budget, safeAllowance: safeAllowance });
        } catch (error) {
            console.error("Error fetching expenses:", error);
        }
    };

    const fetchWeeklyWork = async (userId: string) => {
        try {
            // 1. Calculate Monday and Sunday of the current week
            const today = new Date();
            const dayOfWeek = today.getDay();
            const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

            const monday = new Date(today);
            monday.setDate(diffToMonday);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            // 2. Format them to YYYY-MM-DD
            const formatYMD = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const startOfWeek = formatYMD(monday);
            const endOfWeek = formatYMD(sunday);

            // 3. Fetch all work shifts for this specific week
            const { data } = await supabase
                .from('work_shifts')
                .select('start_time, end_time')
                .eq('user_id', userId)
                .eq('type', 'shift') // Filter for logged shifts only
                .gte('shift_date', startOfWeek)
                .lte('shift_date', endOfWeek);

            // 4. Add up the exact duration of every shift
            if (data) {
                let totalMs = 0;
                data.forEach(shift => {
                    const start = parseTimeToTargetDate(shift.start_time, today).getTime();
                    let end = parseTimeToTargetDate(shift.end_time || shift.start_time, today).getTime();

                    // If a shift goes past midnight (e.g., 10 PM to 2 AM)
                    if (end < start) end += 24 * 60 * 60 * 1000;

                    totalMs += (end - start);
                });

                const totalHrs = totalMs / (1000 * 60 * 60);
                setWeeklyWorkHrs(Math.round(totalHrs * 10) / 10); // Round to 1 decimal place (e.g., 12.5)
            }
        } catch (error) {
            console.error("Error fetching weekly work:", error);
        }
    };

    // 🟢 NEW: Fetches the profile setup flags instantly
    const fetchSetupFlags = async (userId: string) => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('diet_type, is_work_setup_complete')
                .eq('id', userId)
                .single();

            if (data) {
                setHasMealSetup(data.diet_type !== null && data.diet_type !== undefined);
                setHasWorkSetup(data.is_work_setup_complete === true);
            }
        } catch (error) {
            console.error("Error fetching setup flags:", error);
        }
    };

    // ─── 1. MOUNT-ONLY LOGIC (Profile & Entry Animations) ───
    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data } = await supabase
                    .from('profiles')
                    // 🔴 Ensure diet_type and is_work_setup_complete are in this select!
                    .select('username, avatar_url, commute_time_mins, institution, campus, program, target_work_hours, diet_type, is_work_setup_complete, academic_terms(start_date, reading_week_start)')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setUsername(data.username);
                    setAvatarUrl(data.avatar_url);
                    setFullProfileInfo(data);
                    if (data.commute_time_mins) setCommuteMins(data.commute_time_mins);
                    if (data.target_work_hours) setWeeklyWorkTarget(data.target_work_hours);

                    // 🟢 Flip the switches!
                    setHasMealSetup(data.diet_type !== null && data.diet_type !== undefined);
                    setHasWorkSetup(data.is_work_setup_complete === true);

                    if (data.institution) setUniName(data.institution.split(' ')[0]); // e.g. "Lakehead"

                    if (data.academic_terms) {
                        const term = data.academic_terms as any;
                        if (Array.isArray(term) && term.length > 0) {
                            const actualTerm = term[0];
                            if (actualTerm.start_date) setAcademicWeek(calculateAcademicWeek(actualTerm.start_date, actualTerm.reading_week_start));
                        } else if (term.start_date) {
                            setAcademicWeek(calculateAcademicWeek(term.start_date, term.reading_week_start));
                        }
                    }
                }
                fetchSchedule(user.id, viewOffset);
                fetchExpenses(user.id);
                fetchWeeklyWork(user.id);
                fetchSetupFlags(user.id);
            }
        };
        getProfile();
        fetchWeather();

        const entry = (a: Animated.Value, delay: number) =>
            Animated.timing(a, { toValue: 1, duration: 440, delay, useNativeDriver: true });

        Animated.stagger(70, [
            entry(aHero, 80), entry(aStreak, 0),
            entry(aSched, 0), entry(aBento, 0),
            entry(aQuick, 0),
        ]).start();

        let counter: any;
        const timer = setTimeout(() => {
            Animated.timing(progressWidth, { toValue: 30, duration: 1400, useNativeDriver: false }).start();
            let c = 0;
            counter = setInterval(() => { c++; setPctDisplay(c); if (c >= 30) clearInterval(counter); }, 1400 / 30);
        }, 700);

        return () => {
            clearTimeout(timer);
            if (counter) clearInterval(counter);
        };
    }, []);

    // ─── 2. DATA-DEPENDENT LOGIC (Schedule Refetching) ───
    useFocusEffect(
        useCallback(() => {
            const loadSchedule = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    fetchSchedule(user.id, viewOffset);
                    fetchExpenses(user.id);
                    fetchWeeklyWork(user.id);
                    fetchSetupFlags(user.id);
                }
            };
            loadSchedule();
        }, [viewOffset])
    );

    // ─── 3. BACKGROUND TO FOREGROUND REFRESH (App State) ───
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            // 🟢 If the app just came back to the foreground (user unlocked phone or switched back)
            if (nextAppState === 'active') {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // Silently grab the freshest data
                    fetchSchedule(user.id, viewOffset);
                    fetchExpenses(user.id);
                    fetchWeeklyWork(user.id);
                    fetchSetupFlags(user.id);
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [viewOffset]); // Re-bind if the user is looking at Tomorrow instead of Today

    // ─── 4. ANDROID HARDWARE BACK BUTTON HIJACKER ───
    useEffect(() => {
        const backAction = () => {
            // If ANY custom sheet is open, close it and STOP the app from going back.
            if (showEditProfile) { setShowEditProfile(false); return true; }
            if (showProfile) { setShowProfile(false); return true; }
            if (isEditModalVisible) { setIsEditModalVisible(false); return true; }
            if (selectedGap) { setSelectedGap(null); return true; }
            if (selectedMeal) { setSelectedMeal(null); return true; }

            return false; // If nothing is open, let Android do its normal back action
        };

        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [showProfile, showEditProfile, isEditModalVisible, selectedGap, selectedMeal]);

    const handleLogout = async () => { setShowProfile(false); await supabase.auth.signOut(); };
    const handleMealsPress = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('diet_type').eq('id', user.id).single();
            navigation.navigate(data?.diet_type ? 'MealDashboard' : 'MealOnboarding');
        }
    };
    const handleWorksPress = async (autoTriggerAdd = false) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('is_work_setup_complete').eq('id', user.id).single();
            if (data?.is_work_setup_complete) {
                navigation.navigate('WorksDashboard', { autoTriggerAdd });
            } else {
                navigation.navigate('WorkSetup');
            }
        }
    };
    const handleFinancePress = async (params = {}) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const budgetData = await expenseService.fetchUserBudget();
            if (budgetData?.is_setup_complete) {
                navigation.navigate('ExpenseDashboard', params);
            } else {
                navigation.navigate('ExpenseSetup');
            }
        }
    };

    const animStyle = (a: Animated.Value) => ({
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
    });

    const displayName = username ? username.split(' ')[0] : null;

    // ─── DYNAMIC MINDSET SUBTITLE ───
    let vibe = '';
    const hr = now.getHours();
    if (viewOffset > 0) {
        vibe = viewOffset === 1 ? "Planning ahead for tomorrow. Stay prepared." : `Looking ${viewOffset} days ahead. Precision is key.`;
    } else {
        if (hr < 5) {
            vibe = "You should really be asleep right now.";
        } else if (hr < 12) {
            vibe = "Clean slate. Let's make today a productive one.";
        } else if (hr < 17) {
            vibe = "Keep the momentum going. You got this.";
        } else if (hr < 22) {
            vibe = "Wrap up your grind and take some time for yourself.";
        } else {
            vibe = "Late night. Time to wind down and recharge.";
        }
    }

    const AURA =
        now.getHours() < 12 ? { c1: 'rgba(254,215,170,0.25)', c2: 'rgba(253,242,158,0.20)', c3: 'rgba(186,230,253,0.18)' } : // Dawn
            now.getHours() < 17 ? { c1: 'rgba(251,191,36,0.22)', c2: 'rgba(56,189,248,0.18)', c3: 'rgba(99,102,241,0.15)' } : // Midday
                { c1: 'rgba(79,70,229,0.20)', c2: 'rgba(124,58,237,0.18)', c3: 'rgba(148,163,184,0.14)' }; // Twilight

    // 🧠 ADVANCED AI SUGGESTION ENGINE (Now with Workload Distribution)
    const getSmartSuggestion = (isCurrentTime: boolean, gapMs: number, gapIndex: number = 0) => {
        const currentHour = now.getHours();
        const isLateNight = currentHour >= 23 || currentHour < 5;

        // 1. Burnout Protector (Plain English)
        if (isLateNight && isCurrentTime && viewOffset === 0) {
            return {
                action: 'personal', title: "Go to sleep", subtitle: "It's late. Get some rest.",
                color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)', icon: 'moon'
            };
        }

        if (!urgentAssessments || urgentAssessments.length === 0) return null;

        // 🔴 REAL-TIME MATH: Exact minute countdown (no more awkward rounding)
        const rawMinutes = Math.floor(gapMs / (60 * 1000));

        const displayHours = Math.floor(rawMinutes / 60);
        const displayMins = rawMinutes % 60;

        // Build the clean string (e.g., "2h 34m" or just "45m")
        let timeString = '';
        if (displayHours > 0) timeString += `${displayHours}h `;
        if (displayMins > 0) timeString += `${displayMins}m`;
        timeString = timeString.trim();

        // For the AI's internal logic (deciding if it's a massive gap)
        const logicalHrs = rawMinutes / 60;

        // 2. Separate into "This Week" and "Future"
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        const thisWeekTasks = urgentAssessments.filter((a: any) => new Date(a.due_date) <= oneWeekFromNow);
        const futureTasks = urgentAssessments.filter((a: any) => new Date(a.due_date) > oneWeekFromNow);

        // If nothing due this week, look at next week!
        let candidates = thisWeekTasks.length > 0 ? [...thisWeekTasks] : [...futureTasks];

        // 3. The Sorting Algorithm (Weight & Exams vs Gap Size)
        candidates.sort((a, b) => {
            const aIsExam = (a.type || '').toLowerCase().includes('exam') || (a.type || '').toLowerCase().includes('midterm');
            const bIsExam = (b.type || '').toLowerCase().includes('exam') || (b.type || '').toLowerCase().includes('midterm');

            if (logicalHrs >= 3) {
                // MASSIVE GAP: Prioritize Exams, then Heavy Weight tasks.
                if (aIsExam && !bIsExam) return -1;
                if (!aIsExam && bIsExam) return 1;
                return (b.weight || 0) - (a.weight || 0); // Highest weight first
            } else {
                // SMALL GAP (<3 hrs): Just prioritize what is due closest.
                return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            }
        });

        // 🔴 4. THE DISTRIBUTION MAGIC
        const taskIndex = gapIndex % candidates.length;
        const bestTask = candidates[taskIndex];

        // Safely extract the course name from Supabase's nested object
        const bestCourseName = bestTask.courses?.name || 'Class';
        const bestFullTitle = `${bestTask.title} (${bestCourseName})`; // e.g. "Proposal (BUSI 3255)"

        // 🔴 NEW: Determine if this specific task is an exam
        const isExamTask = (bestTask.type || '').toLowerCase().includes('exam') ||
            (bestTask.type || '').toLowerCase().includes('midterm') ||
            (bestTask.type || '').toLowerCase().includes('test');

        // Map the alternatives to also include their course names
        const otherTasks = candidates.filter(t => t.id !== bestTask.id).slice(0, 2).map(t => {
            const altCourseName = t.courses?.name || 'Class';
            return {
                ...t,
                fullTitle: `${t.title} (${altCourseName})`
            };
        });

        // 6. Return the calculated data (3-Tier Smart System)
        return {
            action: 'smart',
            assessmentId: bestTask.id,
            taskTitle: bestFullTitle,
            isExam: isExamTask, // 🔴 Pass the flag to the UI
            // 🔴 AI changes its advice based on the exact time available!
            title: logicalHrs >= 1.5
                ? `Deep Dive: ${bestTask.title}`
                : logicalHrs >= 1
                    ? `Work on: ${bestTask.title}`
                    : `Micro-study: ${bestTask.title}`,

            subtitle: logicalHrs >= 1.5
                ? `You have ${timeString}. Perfect for deep focus on ${bestCourseName}.`
                : logicalHrs >= 1
                    ? `You have ${timeString}. Good time to chip away at ${bestCourseName}.`
                    : `Only ${timeString}. Review notes or outline for ${bestCourseName}.`,

            color: C.academic, bg: C.academicL, border: C.academicM, icon: 'book',
            alternatives: otherTasks
        };
    };
    const buildTimeline = useCallback(() => {
        if (isScheduleLoading) return [];

        let realEvents: any[] = [...todayClasses, ...todayWork, ...customEvents, ...todayMeals];
        realEvents.sort((a, b) => a.dateObj - b.dateObj);

        const nowMs = now.getTime();
        const gapThreshold = 30 * 60 * 1000; // 🔴 Lowered to 30 minutes!

        // 🟢 1. DATE HELPERS & TARGETS
        const getLocalYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + viewOffset);
        const targetDayStr = getLocalYMD(targetDate);

        const nextDate = new Date(targetDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDayStr = getLocalYMD(nextDate);

        // 🔴 2. DYNAMIC CRUNCH LOGIC (Academic Buckets)
        let isCrunchTime = false;
        let crunchTitle = "";
        let crunchSubtitle = "";
        let tomorrowCrunchSubtitle = "";
        let windDownMessage = "Battery saver mode. The day is officially done.";
        let windDownTomorrowMessage = "Plan complete. Finish the night your way.";

        // Find the exact task causing the alert
        const urgentTask = urgentAssessments.find(a => a.due_date.startsWith(targetDayStr) || a.due_date.startsWith(nextDayStr));

        if (urgentTask) {
            isCrunchTime = true; // Ignore sleep rules, extend to 11:59 PM

            const taskType = (urgentTask.type || '').toLowerCase();
            const taskName = (urgentTask.title || '').toLowerCase();

            // Bucket 1: Exams & Tests
            if (taskType.includes('exam') || taskType.includes('midterm') || taskType.includes('test') || taskName.includes('exam') || taskName.includes('test')) {
                crunchTitle = "Final Review";
                crunchSubtitle = `${urgentTask.title} tomorrow. Dedicated time to study +`;
                tomorrowCrunchSubtitle = `Major exam coming up. Start prep for ${urgentTask.title} +`;
                windDownMessage = "Priority override active. Rest your mind before the exam.";
                windDownTomorrowMessage = "Next day is a big one. Rest up when ready.";
            }
            // Bucket 2: Essays, Papers & Reports
            else if (taskType.includes('essay') || taskType.includes('paper') || taskType.includes('report') || taskName.includes('essay') || taskName.includes('paper')) {
                crunchTitle = "Writing Sprint";
                crunchSubtitle = `${urgentTask.title} due tomorrow. Time to finalize your draft +`;
                tomorrowCrunchSubtitle = `Major paper due soon. Dedicate time to write +`;
                windDownMessage = "Priority override active. Step away from the screen and rest.";
                windDownTomorrowMessage = "Big writing day tomorrow. Get some rest.";
            }
            // Bucket 3: Projects & Presentations
            else if (taskType.includes('project') || taskType.includes('presentation') || taskName.includes('project')) {
                crunchTitle = "Final Polish";
                crunchSubtitle = `${urgentTask.title} due tomorrow. Review your deliverables +`;
                tomorrowCrunchSubtitle = `Project deadline approaching. Focus on execution +`;
                windDownMessage = "Priority override active. Great work today, now rest.";
                windDownTomorrowMessage = "Big project day tomorrow. Rest up.";
            }
            // Bucket 4: Standard Assignments (Catch-all)
            else {
                crunchTitle = "Priority Focus";
                crunchSubtitle = `${urgentTask.title} due tomorrow. Time to wrap up +`;
                tomorrowCrunchSubtitle = `${urgentTask.title} due soon. Stay focused on your work +`;
                windDownMessage = "Priority override active. Get some sleep once it's submitted.";
                windDownTomorrowMessage = "Big deadline approaching. Rest up when ready.";
            }
        }

        // 🔴 3. The Prep & Commute Math
        const READY_TIME_MINS = 15;
        const totalBufferMins = commuteMins + READY_TIME_MINS;
        const TRANSITION_BUFFER = totalBufferMins * 60 * 1000;

        let timeline: any[] = [];

        // 🟢 4. DYNAMIC BEDTIME CALCULATOR
        const endOfDay = new Date(targetDate);
        let cutoffHours = 23;
        let cutoffMins = 59;

        if (!isCrunchTime && tomorrowEarliest) {
            // The Real-Life Morning Math:
            const SNOOZE_BUFFER = 15;
            const PREP_TIME = 45;
            const totalMorningMins = SNOOZE_BUFFER + PREP_TIME + commuteMins;

            // Math: Earliest Class - Morning Routine - 8 hours sleep
            const wakeUpTime = new Date(tomorrowEarliest.getTime() - (totalMorningMins * 60 * 1000));
            const idealBedtime = new Date(wakeUpTime.getTime() - (8 * 60 * 60 * 1000));

            cutoffHours = idealBedtime.getHours();
            cutoffMins = idealBedtime.getMinutes();

            // 🔴 THE ROBUST FIX: If math says sleep is after midnight of the target day.
            const targetEodCap = new Date(targetDate);
            targetEodCap.setHours(23, 59, 59, 999);

            if (idealBedtime.getTime() > targetEodCap.getTime()) {
                cutoffHours = 23;
                cutoffMins = 59;
            }
            // Floor: Minimum cutoff
            else if (cutoffHours < 22 || (cutoffHours === 22 && cutoffMins < 30)) {
                cutoffHours = 22;
                cutoffMins = 30;
            }
        }

        endOfDay.setHours(cutoffHours, cutoffMins, 59, 0);
        const endOfDayMs = endOfDay.getTime();

        // 🟢 TODAY'S STRICT LOGIC (UPDATED WITH SMART SLEEP & SOFT LANDING)
        if (viewOffset === 0) {
            const pastEvents = realEvents.filter(ev => ev.dateObj <= nowMs);
            const futureEvents = realEvents.filter(ev => ev.dateObj > nowMs);

            // 🟢 Show all past events for the day (don't just show the anchor)
            timeline.push(...pastEvents);
            timeline.push({ id: 'now-indicator', type: 'now', dateObj: nowMs });

            if (futureEvents.length > 0) {
                const lastPast = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : null;
                const activeEndMs = lastPast && lastPast.endDateObj > nowMs ? lastPast.endDateObj : nowMs;
                const nextStartMs = futureEvents[0].dateObj;

                const gapMs = (nextStartMs - TRANSITION_BUFFER) - activeEndMs;
                if (gapMs >= gapThreshold) {
                    const suggestion = getSmartSuggestion(true, gapMs, 0);
                    timeline.push({ id: 'gap-current', type: 'info', title: suggestion?.title || "Open Study Window", subtitle: suggestion?.subtitle || "Tap to plan block +", time: "Right Now", dateObj: activeEndMs, interactive: true, smartData: suggestion });
                }
            } else {
                const lastPast = pastEvents.length > 0 ? pastEvents[pastEvents.length - 1] : null;
                const activeEndMs = lastPast && lastPast.endDateObj > nowMs ? lastPast.endDateObj : nowMs;

                // 🔴 2. If no future events, calculate gap until calculated Bedtime
                const gapMs = endOfDayMs - activeEndMs;
                if (activeEndMs < endOfDayMs && gapMs >= gapThreshold) {
                    const suggestion = getSmartSuggestion(true, gapMs, 0);
                    timeline.push({ id: 'gap-rest-of-day', type: 'info', title: isCrunchTime ? crunchTitle : suggestion?.title || "Open Evening Canvas", subtitle: isCrunchTime ? crunchSubtitle : suggestion?.subtitle || "Tap to plan +", time: "Rest of Day", dateObj: activeEndMs, interactive: true, smartData: suggestion });
                }
            }

            // Gap Math 2: The Future Gaps (Today)
            for (let i = 0; i < futureEvents.length; i++) {
                timeline.push(futureEvents[i]);

                if (i < futureEvents.length - 1) {
                    // Gap BETWEEN events
                    const gapMs = (futureEvents[i + 1].dateObj - TRANSITION_BUFFER) - futureEvents[i].endDateObj;
                    if (gapMs >= gapThreshold) {
                        const suggestion = getSmartSuggestion(false, gapMs, i + 1);
                        timeline.push({ id: `gap-future-${i}`, type: 'info', title: suggestion?.title || "Open Study Window", subtitle: suggestion?.subtitle || "Tap to add +", time: formatTo12h(new Date(futureEvents[i].endDateObj).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })), dateObj: futureEvents[i].endDateObj, interactive: true, smartData: suggestion });
                    }
                } else {
                    // 🔴 2. The Evening Gap (Sleep & Crunch Aware)
                    const gapMs = endOfDayMs - futureEvents[i].endDateObj;
                    if (gapMs >= gapThreshold) {
                        const suggestion = getSmartSuggestion(false, gapMs, i + 1);
                        timeline.push({
                            id: 'gap-evening-end',
                            type: 'info',
                            title: isCrunchTime ? crunchTitle : suggestion?.title || "Evening Block",
                            subtitle: isCrunchTime
                                ? crunchSubtitle
                                : `Study or unwind. Recommended bedtime: ${formatTo12h(`${cutoffHours}:${cutoffMins}`)} +`,
                            time: "Rest of Day",
                            dateObj: futureEvents[i].endDateObj,
                            interactive: true,
                            smartData: suggestion
                        });
                    }
                }
            }

            // 🔴 3. THE SOFT LANDING (Caps off the day beautifully)
            timeline.push({
                id: 'soft-landing-cap',
                type: 'info',
                title: "Wind Down",
                subtitle: isCrunchTime
                    ? windDownMessage
                    : "Battery saver mode. The day is officially done.",
                time: formatTo12h(`${cutoffHours}:${cutoffMins}`),
                dateObj: endOfDayMs,
                interactive: false // Un-editable!
            });
        }

        // 🔵 TOMORROW'S STRICT LOGIC (No 'Now' line, clean list)
        else {
            if (realEvents.length === 0) {
                // If tomorrow is empty, give a clean canvas
                const mockStart = new Date(targetDate);
                mockStart.setHours(9, 0, 0, 0);
                const gapMs = endOfDayMs - mockStart.getTime();
                if (gapMs >= gapThreshold) {
                    const suggestion = getSmartSuggestion(false, gapMs, 0);
                    timeline.push({ id: 'gap-all-day', type: 'info', title: isCrunchTime ? crunchTitle : "Nothing scheduled", subtitle: isCrunchTime ? tomorrowCrunchSubtitle : "Tap to add something +", time: "All Day", dateObj: mockStart.getTime(), interactive: true, smartData: suggestion });
                }
            }

            // Gap Math 3: Tomorrow's Gaps
            for (let i = 0; i < realEvents.length; i++) {
                // Ensure past styling is disabled for tomorrow's events
                const eventCopy = { ...realEvents[i], past: false };
                timeline.push(eventCopy);

                if (i < realEvents.length - 1) {
                    // 🔴 Subtract buffer from gaps between events
                    const gapMs = (realEvents[i + 1].dateObj - TRANSITION_BUFFER) - realEvents[i].endDateObj;
                    if (gapMs >= gapThreshold) {
                        const suggestion = getSmartSuggestion(false, gapMs, i + 1); // Gap Index i+1
                        timeline.push({ id: `gap-tomorrow-${i}`, type: 'info', title: suggestion?.title || "Open Study Window", subtitle: suggestion?.subtitle || "Tap to add +", time: formatTo12h(new Date(realEvents[i].endDateObj).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })), dateObj: realEvents[i].endDateObj, interactive: true, smartData: suggestion });
                    }
                } else {
                    // 🔴 2. The Evening Gap (Sleep & Crunch Aware) for Tomorrow
                    const gapMs = endOfDayMs - realEvents[i].endDateObj;
                    if (gapMs >= gapThreshold) {
                        const suggestion = getSmartSuggestion(false, gapMs, i + 1);
                        timeline.push({
                            id: 'gap-evening-end-tomorrow',
                            type: 'info',
                            title: isCrunchTime ? crunchTitle : suggestion?.title || "Evening Block",
                            subtitle: isCrunchTime
                                ? tomorrowCrunchSubtitle
                                : `Study or unwind. Recommended bedtime: ${formatTo12h(`${cutoffHours}:${cutoffMins}`)} +`,
                            time: "Rest of Day",
                            dateObj: realEvents[i].endDateObj,
                            interactive: true,
                            smartData: suggestion
                        });
                    }
                }
            }

            // 🔴 3. THE SOFT LANDING (For Tomorrow)
            timeline.push({
                id: 'soft-landing-cap-tomorrow',
                type: 'info',
                title: "Wind Down",
                subtitle: isCrunchTime
                    ? windDownTomorrowMessage
                    : "Plan complete. Finish the night your way.",
                time: formatTo12h(`${cutoffHours}:${cutoffMins}`),
                dateObj: endOfDayMs,
                interactive: false
            });
        }

        return timeline;
    }, [
        isScheduleLoading, todayClasses, todayWork, customEvents, todayMeals,
        now, viewOffset, urgentAssessments, tomorrowEarliest, commuteMins
    ]);


    const dailySchedule = buildTimeline();

    // ─── PULSE CALCULATIONS ───
    // 1. Deadlines Math (Current Week: Monday -> Sunday)
    const startOfTodayPulse = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate days until this Sunday
    // getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday.
    const dayOfWeek = startOfTodayPulse.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

    const endOfWeekPulse = new Date(startOfTodayPulse);
    endOfWeekPulse.setDate(startOfTodayPulse.getDate() + daysUntilSunday);
    endOfWeekPulse.setHours(23, 59, 59, 999);

    // Filter to only include items due within the current calendar week (ending Sunday)
    const thisWeekAssessments = urgentAssessments.filter((a: any) => {
        // 🛡️ Safe local date parsing (Avoids UTC shift issues)
        const [y, m, d_val] = a.due_date.split('T')[0].split('-').map(Number);
        const dueDate = new Date(y, m - 1, d_val);

        // 🔄 SMART SHUFFLE: Filter out passed deadlines so the queue slides up
        // If it's just a date (no time), keep it until the very end of the day
        const hasTime = a.due_date.includes('T') || a.due_date.includes(':');

        let effectiveDeadline;
        if (hasTime) {
            effectiveDeadline = new Date(a.due_date); // Supabase ISO strings are fine if they have time
        } else {
            effectiveDeadline = new Date(y, m - 1, d_val, 23, 59, 59, 999);
        }

        return effectiveDeadline >= now && dueDate <= endOfWeekPulse;
    });

    // Grab the top 3 closest ones for the UI list
    const topThisWeekAssessments = thisWeekAssessments.slice(0, 3);

    // 🟢 This prevents existing users from seeing the onboarding screen on their days off!
    const isCompletelyEmpty = !isScheduleLoading && !hasAnyCourses && !hasWorkSetup && !hasMealSetup && !hasFinanceSetup;

    // 🟠 Legacy Unused Code:
    // const isEmptyState = dailySchedule.length === 0 && !isScheduleLoading;

    // Maintain legacy isEmptyState for potential other uses, but base it on new logic if needed
    const isEmptyState = isCompletelyEmpty;

    const getDaysLeft = (dateStr: string) => {
        // Parse the target date as local midnight (ignoring any time components in the string)
        const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
        const targetAtMidnight = new Date(y, m - 1, d);

        // Use 'now' from our live hook but snap it to local midnight for comparison
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diff = Math.round((targetAtMidnight.getTime() - todayAtMidnight.getTime()) / (1000 * 3600 * 24));

        if (diff <= 0) return 'Today';
        if (diff === 1) return '1d';
        return `${diff}d`;
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 130 : 140 + insets.bottom }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                // 🟢 THE IOS FIX: Pushes the pull-to-refresh zone below the notch
                contentInset={{ top: Platform.OS === 'ios' ? insets.top : 0 }}
                contentOffset={{ y: Platform.OS === 'ios' ? -insets.top : 0, x: 0 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={C.academic}
                        colors={[C.academic]}
                        // 🟢 THE ANDROID FIX: Pushes the spinner down
                        progressViewOffset={insets.top + 20}
                    />
                }
            >

                {/* ══ HERO HEADER ══ */}
                <View style={{
                    position: 'relative',
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(255,255,255,0.8)',
                    // 🟢 PULL HEADER UP: Covers the gap we just made
                    marginTop: Platform.OS === 'ios' ? -insets.top : 0
                }}>

                    {/* 1. Edge-to-Edge Background Orbs (Larger and softer for better color mixing) */}
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
                        <Reanimated.View style={[{ position: 'absolute', width: 350, height: 350, borderRadius: 175, top: -120, right: -100, backgroundColor: AURA.c1 }, orb1Style]} />
                        <Reanimated.View style={[{ position: 'absolute', width: 250, height: 250, borderRadius: 125, bottom: -80, left: -50, backgroundColor: AURA.c2 }, orb2Style]} />
                        <View style={{ position: 'absolute', width: 180, height: 180, borderRadius: 90, top: 40, left: '20%', backgroundColor: AURA.c3 }} />
                    </View>

                    {/* 2. Full-Width Frosted Glass Overlay */}
                    <View
                        style={{
                            paddingHorizontal: 22,
                            // 🟢 THE FIX: We only need a ~20px gap below the notch!
                            paddingTop: Platform.OS === 'ios' ? insets.top + 20 : Math.max(insets.top + 20, 50),
                            paddingBottom: 28,
                            overflow: 'hidden'
                        }}
                    >
                        {Platform.OS === 'ios' ? (
                            <BlurView
                                intensity={70}
                                tint="light"
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.45)' }}
                            />
                        ) : (
                            <BlurView
                                experimentalBlurMethod="dimezisBlurView"
                                intensity={35}
                                tint="light"
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.15)' }}
                            />
                        )}
                        {/* Header row */}
                        <Animated.View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }, animStyle(aHero)]}>
                            <View style={{ flex: 1, paddingRight: 12 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase', color: C.muted, marginBottom: 4 }} className="font-body-bold">
                                    {isEmptyState ? "Welcome to DayLi" : greeting}
                                </Text>
                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 34, lineHeight: 38, color: C.primary }}>
                                    {displayName != null ? (
                                        <>Hey, <Text style={{ color: C.primary }}>{displayName}</Text></>
                                    ) : (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                                            <View style={{ width: 44, height: 26, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                                            <View style={{ width: 100, height: 26, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.06)' }} />
                                        </View>
                                    )}
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: '500', color: C.muted, marginTop: 4, lineHeight: 18 }} className="font-body">
                                    {isEmptyState ? "Let's get your semester beautifully organized." : vibe}
                                </Text>
                            </View>

                            {/* Right: Avatar */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 }}>
                                <TouchableOpacity onPress={() => setShowProfile(true)} activeOpacity={0.85}>
                                    <View style={{
                                        width: 48, height: 48, borderRadius: 24, // Slightly larger avatar to balance the full-width header
                                        overflow: 'hidden',
                                        backgroundColor: '#e5d7cc',
                                        borderWidth: 2,
                                        borderColor: 'rgba(255,255,255,0.95)',
                                        shadowColor: '#3C302A',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
                                    }}>
                                        {avatarUrl ? (
                                            <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                                        ) : (
                                            <LinearGradient colors={['#818cf8', '#6366f1']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#fff' }}>
                                                    {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                                                </Text>
                                            </LinearGradient>
                                        )}
                                    </View>
                                    <View style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' }} />
                                </TouchableOpacity>
                            </View>
                        </Animated.View>

                        {/* Pill tags */}
                        <Animated.View style={[{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, animStyle(aStreak)]}>
                            {[
                                // 1. Academic Week (No icon needed)
                                {
                                    label: academicWeek ? `${semesterName} • Week ${academicWeek}` : 'Loading...',
                                    bg: C.academicL, border: C.academicM, color: C.academic
                                },
                                // 2. Weather (Now with an icon!)
                                {
                                    label: weather.temp ? `${weather.temp} • ${weather.cond}` : 'Fetching weather...',
                                    bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.18)', color: '#0369a1',
                                    icon: <CloudSun size={14} color="#0369a1" strokeWidth={2.5} />
                                }
                            ].map((p, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: p.bg, borderWidth: 1, borderColor: p.border }}>
                                    {/* If the pill has an icon, render it with a tiny margin! */}
                                    {p.icon && <View style={{ marginRight: 6 }}>{p.icon}</View>}
                                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: p.color, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">
                                        {p.label}
                                    </Text>
                                </View>
                            ))}
                        </Animated.View>
                    </View>
                </View>

                {/* ══ CONTENT WRAPPER ══ */}
                <View style={{ flex: 1, minHeight: 800 }}>
                    {/* ══ CONTENT ══ */}
                    <View style={{ paddingHorizontal: 20 }}>

                        {/* ── 1. THE INITIAL LOADING STATE ── */}
                        {isScheduleLoading ? (
                            <View style={{ marginTop: 10 }}>
                                <SectionHeader title="Fetching your day..." />
                                <GhostDashboard isLoading={true} />
                            </View>
                        ) :

                            /* ── 2. THE BRAND NEW USER STATE ── */
                            (isCompletelyEmpty && viewOffset === 0) ? (
                                <View style={{ marginTop: 10 }}>
                                    <SetupChecklist
                                        hasCourses={hasAnyCourses}
                                        hasWork={hasWorkSetup}
                                        hasMeals={hasMealSetup}
                                        onAction={(type) => {
                                            if (type === 'syllabus') navigation.navigate('Academics', { autoTriggerUpload: true });
                                            else if (type === 'work') handleWorksPress();
                                            else if (type === 'meal') handleMealsPress();
                                            else if (type === 'finance') handleFinancePress();
                                        }}
                                    />
                                    <View style={{ marginBottom: 10 }}>
                                        <SectionHeader title="Your Future Dashboard" />
                                        {/* Show the skeleton as a teaser! */}
                                        <GhostDashboard />
                                    </View>
                                </View>
                            ) :

                                /* ── 3. THE REAL DASHBOARD (EXISTING USERS) ── */
                                (
                                    <Animated.View style={animStyle(aSched)}>
                                        <SectionHeader
                                            title={viewOffset === 0 ? "Today's Schedule" : "Tomorrow's Planner"}
                                            actionLabel={viewOffset === 0 ? "Tomorrow" : "Back to Today"}
                                            actionColor={C.academic}
                                            onAction={() => setViewOffset(prev => prev === 0 ? 1 : 0)}
                                        />

                                        {/* 🟢 THE TIMELINE */}
                                        <View style={[{ borderRadius: 26, overflow: 'hidden', marginBottom: 20 }, titaniumCard]}>
                                            {dailySchedule.length > 0 ? dailySchedule.map((item, idx) => {
                                                const isLast = idx === dailySchedule.length - 1;
                                                if (item.type === 'now') {
                                                    return (
                                                        <View key="now-indicator" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'rgba(34,197,94,0.07)', borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.12)' }}>
                                                            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22c55e' }} />
                                                            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: C.green }} className="font-body-bold">Now · {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
                                                            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(34,197,94,0.18)' }} />
                                                        </View>
                                                    );
                                                }
                                                if (item.type === 'info') {
                                                    return (
                                                        <TouchableOpacity
                                                            key={item.id}
                                                            activeOpacity={item.interactive ? 0.6 : 1}
                                                            onPress={() => item.interactive && handleFillGap(item)}
                                                            style={{
                                                                flexDirection: 'row',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: 16,
                                                                paddingLeft: 20,
                                                                borderBottomWidth: isLast ? 0 : 1,
                                                                borderBottomColor: 'rgba(232,226,218,0.45)',
                                                                backgroundColor: item.interactive ? 'rgba(99,102,241,0.03)' : 'transparent',
                                                            }}
                                                        >
                                                            <View style={{ flex: 1, paddingRight: 12 }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 2 }} className="font-body-bold">
                                                                    {item.title}
                                                                </Text>
                                                                <Text style={{ fontSize: 12, color: item.interactive ? C.academic : C.muted, fontWeight: '500', lineHeight: 16 }} className="font-body">
                                                                    {item.subtitle}
                                                                </Text>
                                                            </View>

                                                            {item.interactive && (
                                                                <View style={{
                                                                    width: 34, height: 34, borderRadius: 12,
                                                                    backgroundColor: C.academicL, borderWidth: 1, borderColor: C.academicM,
                                                                    alignItems: 'center', justifyContent: 'center'
                                                                }}>
                                                                    <Plus size={18} color={C.academic} strokeWidth={2.5} />
                                                                </View>
                                                            )}
                                                        </TouchableOpacity>
                                                    );
                                                }

                                                const IconComp = item.type === 'academic' ? BookOpen : item.type === 'work' ? Briefcase : Utensils;
                                                const accent = C[item.type as keyof typeof C] as string;
                                                const isPast = item.dateObj < now.getTime();

                                                if (item.type === 'meal') {
                                                    return (
                                                        <TouchableOpacity
                                                            key={item.id}
                                                            activeOpacity={isPast ? 1 : 0.7}
                                                            onPress={isPast ? undefined : () => setSelectedMeal(item)}
                                                        >
                                                            <ScheduleItem
                                                                type={item.type as any}
                                                                time={item.time}
                                                                title={item.title}
                                                                subtitle={item.subtitle}
                                                                past={isPast}
                                                                icon={<IconComp size={15} color={accent} strokeWidth={2} />}
                                                                isLast={isLast}
                                                            />
                                                        </TouchableOpacity>
                                                    );
                                                }

                                                return (
                                                    <ScheduleItem
                                                        key={item.id}
                                                        type={item.type as any}
                                                        time={item.time}
                                                        title={item.title}
                                                        subtitle={item.subtitle}
                                                        past={isPast}
                                                        icon={<IconComp size={15} color={accent} strokeWidth={2} />}
                                                        isLast={isLast}
                                                        onPress={(item.isCustom && !isPast) ? () => {
                                                            setEditingEvent(item);
                                                            setEditTitle(item.title);
                                                            setEditStartTime(item.rawStartTime);
                                                            setEditDuration(String(item.durationHours));
                                                            setIsNewEvent(false); // 🟢 Mode: Update
                                                            setIsEditModalVisible(true);
                                                        } : undefined}
                                                    />
                                                );
                                            }) : (
                                                <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 13, color: C.muted, fontWeight: '500' }}>Nothing on the schedule.</Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* 🟢 THE SMART BENTO CARDS (Visible on Today & Tomorrow) */}
                                        {viewOffset <= 1 && (
                                            <Animated.View style={animStyle(aBento)}>
                                                <SectionHeader title="The DayLi Brief" />

                                                {/* Safe Spend — full width */}
                                                <View>
                                                    {hasFinanceSetup ? (
                                                        (() => {
                                                            const safeSpend = Math.max(expenseData.safeAllowance - expenseData.spent, 0);
                                                            const pct = expenseData.safeAllowance > 0 ? Math.min(Math.round((expenseData.spent / expenseData.safeAllowance) * 100), 100) : 0;
                                                            return (
                                                                <View style={[{ borderRadius: 26, padding: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }, titaniumCard]}>
                                                                    <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(47,82,51,0.14)', borderWidth: 1, borderColor: C.expenseM, alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Wallet size={18} color={C.expense} strokeWidth={2} />
                                                                    </View>
                                                                    <View style={{ flex: 1 }}>
                                                                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase', color: C.expense, marginBottom: 2 }} className="font-body-bold">Safe Spend</Text>
                                                                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 28, color: C.primary, lineHeight: 30 }}>
                                                                            ${safeSpend.toFixed(2)}
                                                                        </Text>
                                                                        <Text style={{ fontSize: 11, fontWeight: '500', color: C.muted, marginTop: 1 }} className="font-body">
                                                                            ${expenseData.spent.toFixed(2)} spent · ${expenseData.safeAllowance} allowance
                                                                        </Text>
                                                                    </View>
                                                                    <ProgressRing size={52} stroke={5} pct={pct} color={C.expense} trackColor="rgba(47,82,51,0.15)">
                                                                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 12, color: C.primary }}>{pct}%</Text>
                                                                    </ProgressRing>
                                                                </View>
                                                            );
                                                        })()
                                                    ) : (
                                                        <TouchableOpacity
                                                            onPress={() => handleFinancePress()}
                                                            style={[{ borderRadius: 26, padding: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14 }, titaniumCard]}
                                                        >
                                                            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(47,82,51,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Wallet size={18} color={C.expense} opacity={0.5} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }} className="font-body-bold">Setup Finance</Text>
                                                                <Text style={{ fontSize: 12, color: C.muted }} className="font-body">Track your daily safe spend</Text>
                                                            </View>
                                                            <ArrowRight size={16} color={C.ghost} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>

                                                {/* Syllabus + Grind */}
                                                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                                                    {/* Deadlines Box */}
                                                    <View style={{ flex: 1.1 }}>
                                                        {hasAnyCourses ? (
                                                            <View style={[{ borderRadius: 22, padding: 15, overflow: 'hidden', minHeight: 170 }, titaniumCard]}>
                                                                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.academic, marginBottom: 6 }} className="font-body-bold">Deadlines</Text>
                                                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                                                                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 38, color: C.primary, lineHeight: 40 }}>
                                                                        {thisWeekAssessments.length}
                                                                    </Text>
                                                                    <Text style={{ fontSize: 11, fontWeight: '500', color: C.muted, marginBottom: 10 }} className="font-body">this week</Text>
                                                                </View>

                                                                <View style={{ flex: 1, justifyContent: topThisWeekAssessments.length <= 2 ? 'center' : 'flex-start' }}>
                                                                    {topThisWeekAssessments.length > 0 ? (
                                                                        <View style={{ gap: topThisWeekAssessments.length === 1 ? 12 : 6 }}>
                                                                            {topThisWeekAssessments.map((item, idx) => {
                                                                                const isExam = (item.type || '').toLowerCase().includes('exam') || (item.type || '').toLowerCase().includes('midterm') || (item.type || '').toLowerCase().includes('test');
                                                                                const isFeatured = topThisWeekAssessments.length === 1;
                                                                                return (
                                                                                    <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: isFeatured ? 8 : 0 }}>
                                                                                        <View style={{ width: isFeatured ? 8 : 6, height: isFeatured ? 8 : 6, borderRadius: 4, backgroundColor: isExam ? C.red : C.academic }} />
                                                                                        <View style={{ flex: 1 }}>
                                                                                            <Text style={{ fontSize: isFeatured ? 13 : 11, fontWeight: '600', color: C.ink }} className="font-body-bold" numberOfLines={1}>
                                                                                                {isExam ? `EXAM: ${item.title}` : item.title}
                                                                                            </Text>
                                                                                        </View>
                                                                                        <Text style={{ fontSize: isFeatured ? 12 : 10, fontWeight: '700', color: isExam ? C.red : C.muted }} className="font-body-bold">
                                                                                            {getDaysLeft(item.due_date)}
                                                                                        </Text>
                                                                                    </View>
                                                                                );
                                                                            })}
                                                                            {thisWeekAssessments.length > 3 && (
                                                                                <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600', marginLeft: 14 }}>
                                                                                    + {thisWeekAssessments.length - 3} more...
                                                                                </Text>
                                                                            )}
                                                                        </View>
                                                                    ) : (
                                                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                                                            <Text style={{ fontSize: 11, color: C.muted, fontWeight: '500', textAlign: 'center' }}>Nothing due this week!</Text>
                                                                        </View>
                                                                    )}
                                                                </View>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                onPress={() => navigation.navigate('Academics', { autoTriggerUpload: true })}
                                                                style={[{ borderRadius: 22, padding: 15, minHeight: 170, justifyContent: 'center', alignItems: 'center' }, titaniumCard]}
                                                            >
                                                                <FileUp size={24} color={C.academic} opacity={0.5} style={{ marginBottom: 8 }} />
                                                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary, textAlign: 'center' }} className="font-body-bold">Unlock Deadlines</Text>
                                                                <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 }} className="font-body">Upload your syllabus</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>

                                                    {/* Weekly Grind */}
                                                    <View style={{ flex: 0.9 }}>
                                                        {hasWorkSetup ? (
                                                            (() => {
                                                                const workPct = Math.min(Math.round((weeklyWorkHrs / weeklyWorkTarget) * 100), 100) || 0;
                                                                return (
                                                                    <View style={[{ borderRadius: 22, padding: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flex: 1 }, titaniumCard]}>
                                                                        <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.work, marginBottom: 10 }} className="font-body-bold">Weekly Grind</Text>
                                                                        <ProgressRing size={72} stroke={6} pct={workPct} color={C.work} trackColor="rgba(0,119,182,0.14)">
                                                                            <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 16, color: C.primary, lineHeight: 18 }}>{workPct}%</Text>
                                                                            <Text style={{ fontSize: 8, fontWeight: '700', color: C.muted, letterSpacing: 0.5 }} className="font-body-bold">target</Text>
                                                                        </ProgressRing>
                                                                        <Text style={{ fontSize: 11, fontWeight: '500', color: C.muted, marginTop: 10 }} className="font-body">
                                                                            {weeklyWorkHrs} / {weeklyWorkTarget} hrs
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            })()
                                                        ) : (
                                                            <TouchableOpacity
                                                                onPress={() => handleWorksPress()}
                                                                style={[{ borderRadius: 22, padding: 15, flex: 1, justifyContent: 'center', alignItems: 'center' }, titaniumCard]}
                                                            >
                                                                <Briefcase size={24} color={C.work} opacity={0.5} style={{ marginBottom: 8 }} />
                                                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.primary, textAlign: 'center' }} className="font-body-bold">Setup Work</Text>
                                                                <Text style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 4 }} className="font-body">Balance your shifts</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>


                                                {/* Meal Menu */}
                                                <View style={[{ borderRadius: 26, padding: 18, overflow: 'hidden' }, titaniumCard]}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.meal, marginBottom: 12 }} className="font-body-bold">
                                                        {viewOffset === 0 ? "Today's Menu" : (viewOffset === 1 ? "Tomorrow's Menu" : "Upcoming Menu")}
                                                    </Text>
                                                    {hasMealSetup ? (() => {
                                                        // 🔴 FIX: Merge AI meals + manually adjusted custom meal events
                                                        const customMealOverrides = customEvents.filter(e => e.type === 'meal');
                                                        const allMeals = [...todayMeals, ...customMealOverrides].sort((a, b) => a.dateObj - b.dateObj);
                                                        return allMeals.length > 0 ? allMeals.map((m, i) => {
                                                            const parts = m.title.split(' — ');
                                                            const mealType = parts[0];
                                                            const dishName = parts[1] || 'Meal';
                                                            return (
                                                                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: i < allMeals.length - 1 ? 1 : 0, borderBottomColor: 'rgba(196,102,58,0.12)' }}>
                                                                    <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: 'rgba(196,102,58,0.12)', borderWidth: 1, borderColor: 'rgba(196,102,58,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <Utensils size={13} color={C.meal} strokeWidth={2} />
                                                                    </View>
                                                                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(196,102,58,0.8)', width: 65 }} className="font-body-bold" numberOfLines={1}>{mealType}</Text>
                                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink, flex: 1 }} className="font-body-bold" numberOfLines={1}>{dishName}</Text>
                                                                    <Text style={{ fontSize: 11, fontWeight: '600', color: C.muted }} className="font-body">{m.time}</Text>
                                                                </View>
                                                            );
                                                        }) : (
                                                            <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500' }}>
                                                                {viewOffset === 0 ? "No meals planned today." : "No meals planned."}
                                                            </Text>
                                                        );
                                                    })() : (
                                                        <TouchableOpacity
                                                            onPress={() => handleMealsPress()}
                                                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
                                                        >
                                                            <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: 'rgba(196,102,58,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                                                                <Utensils size={16} color={C.meal} opacity={0.5} />
                                                            </View>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary }} className="font-body-bold">Plan Your Fuel</Text>
                                                                <Text style={{ fontSize: 12, color: C.muted }} className="font-body">AI-generated meal schedules</Text>
                                                            </View>
                                                            <ArrowRight size={16} color={C.ghost} />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </Animated.View>
                                        )}
                                    </Animated.View>
                                )}

                        {/* ── QUICK ACTIONS ── */}
                        <Animated.View style={animStyle(aQuick)}>
                            <SectionHeader title="Quick Actions" />
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginHorizontal: -20 }}
                                contentContainerStyle={{ gap: 10, paddingLeft: 20, paddingRight: 20 }}
                            >
                                {/* 1. Expense Module */}
                                <View style={{ width: 90 }}>
                                    <QuickTile
                                        label={'Scan\nReceipt'}
                                        accentColor={C.expense}
                                        icon={<Camera size={17} color={C.expense} strokeWidth={2} />}
                                        onPress={() => handleFinancePress({ autoTriggerScan: true })}
                                    />
                                </View>

                                {/* 2. Work Module */}
                                <View style={{ width: 90 }}>
                                    <QuickTile
                                        label={'Add\nShift'}
                                        accentColor={C.work}
                                        icon={<Briefcase size={17} color={C.work} strokeWidth={2} />}
                                        onPress={() => handleWorksPress(true)}
                                    />
                                </View>

                                {/* 3. Academics Module */}
                                <View style={{ width: 90 }}>
                                    <QuickTile
                                        label={'Upload\nOutline'}
                                        accentColor={C.academic}
                                        icon={<FileUp size={17} color={C.academic} strokeWidth={2} />}
                                        onPress={() => navigation.navigate('Academics', { autoTriggerUpload: true })}
                                    />
                                </View>

                                {/* 4. Meals Module */}
                                <View style={{ width: 90 }}>
                                    <QuickTile
                                        label={'Grocery\nList'}
                                        accentColor={C.meal}
                                        icon={<ShoppingCart size={17} color={C.meal} strokeWidth={2} />}
                                        onPress={() => navigation.navigate('GroceryList', { fullPlan: weeklyMealPlan, weekStartString: currentWeekStart })}
                                    />
                                </View>
                            </ScrollView>
                        </Animated.View>

                    </View>
                </View>
            </Animated.ScrollView>

            {/* ══ FLOATING BOTTOM NAV ══ */}
            <View style={{ position: 'absolute', bottom: Platform.OS === 'ios' ? 36 : Math.max(insets.bottom + 16, 24), left: 22, right: 22, zIndex: 100, shadowColor: '#3C302A', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.25, shadowRadius: 32, elevation: 20 }}>
                <BlurView experimentalBlurMethod="dimezisBlurView" intensity={Platform.OS === 'android' ? 45 : 100} tint="light" style={{ borderRadius: 28, overflow: 'hidden' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.75)', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', borderRadius: 28 }}>

                        <View style={{ alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(74,59,67,0.07)' }}>
                            <Home size={20} color={C.primary} strokeWidth={2.2} />
                            <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 0.2, color: C.primary, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">Home</Text>
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('Academics', {})} style={{ alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8, opacity: 0.45 }}>
                            <BookOpen size={20} color={C.primary} strokeWidth={2} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 0.2, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">Academic</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleWorksPress()} style={{ alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8, opacity: 0.45 }}>
                            <Briefcase size={20} color={C.primary} strokeWidth={2} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 0.2, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">Work</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleMealsPress} style={{ alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8, opacity: 0.45 }}>
                            <Utensils size={20} color={C.primary} strokeWidth={2} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 0.2, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">Meals</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => handleFinancePress()} style={{ alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8, opacity: 0.45 }}>
                            <Wallet size={20} color={C.primary} strokeWidth={2} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: C.primary, letterSpacing: 0.2, includeFontPadding: false, textAlignVertical: 'center' }} className="font-body-bold">Expenses</Text>
                        </TouchableOpacity>

                    </View>
                </BlurView>
            </View>

            {/* ══ PROFILE SHEET ══ */}
            <ProfileSheet
                visible={showProfile}
                onClose={() => setShowProfile(false)}
                username={username}
                avatarUrl={avatarUrl}
                onLogout={handleLogout}
                onEditClick={() => {
                    setShowProfile(false);
                    setTimeout(() => setShowEditProfile(true), 250);
                }}
            />

            <EditProfileSheet
                visible={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                userId={userId}
                currentProfile={fullProfileInfo}
                onProfileUpdated={(updated) => {
                    setFullProfileInfo(updated);
                    if (updated.username) setUsername(updated.username);
                    if (updated.avatar_url) setAvatarUrl(updated.avatar_url);
                    if (updated.institution) setUniName(updated.institution.split(' ')[0]);
                }}
            />

            <GapActionSheet
                visible={!!selectedGap}
                onClose={() => setSelectedGap(null)}
                gapItem={selectedGap}
                urgentAssessment={urgentAssessments[0]}
                onSelectAction={handleAddCustomEvent}
                onMarkDone={handleMarkAssessmentDone} // 🔴 Pass the new function!
            />

            <MealActionSheet
                visible={!!selectedMeal}
                onClose={() => setSelectedMeal(null)}
                mealItem={selectedMeal}
                onSkip={async (mealId) => {
                    if (mealId.startsWith('custom-')) {
                        // Delete manual override from Supabase
                        try {
                            const rawId = mealId.replace('custom-', '');
                            const { error } = await supabase.from('custom_events').delete().eq('id', rawId);
                            if (error) throw error;
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) fetchSchedule(user.id, viewOffset);
                        } catch (err) { Alert.alert("Error", "Could not remove this meal."); }
                    } else {
                        // Just hide AI meal for this session
                        if (selectedMeal) {
                            setSkippedMeals(prev => [...prev, selectedMeal.title.split(' — ')[0]]);
                        }
                        setTodayMeals(prev => prev.filter(m => m.id !== mealId));
                    }
                    setSelectedMeal(null);
                }}
                onAdjustTime={(meal) => {
                    const isExistingCustom = meal.id.startsWith('custom-');
                    setEditTitle(meal.title);
                    setEditStartTime(meal.time || meal.rawStartTime);
                    setEditDuration(String(meal.durationHours || 0.5));
                    setIsNewEvent(!isExistingCustom);
                    setEditingEvent({ ...meal, category: 'meal' });
                    setIsEditModalVisible(true);
                }}
            />

            <CustomEventEditSheet
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                event={editingEvent}
                title={editTitle}
                setTitle={setEditTitle}
                startTime={editStartTime}
                setStartTime={setEditStartTime}
                duration={editDuration}
                setDuration={setEditDuration}
                onUpdate={isNewEvent ? handleSaveNewCustomEvent : handleUpdateCustomEvent}
                onDelete={handleDeleteCustomEvent}
                isSaving={isSaving}
                isNew={isNewEvent}
            />
        </View>
    );
};

export default HomeScreen;