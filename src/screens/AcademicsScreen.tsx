import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, StatusBar,
    ActivityIndicator, Image, Alert, FlatList, ScrollView, Modal, Pressable
} from 'react-native';
// Change from SafeAreaView to useSafeAreaInsets
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
    withDelay, withSequence, withRepeat, FadeIn, FadeInDown, FadeInUp, Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { Plus, FileText, ChevronRight, ArrowLeft as ChevronLeft, CheckCircle } from 'lucide-react-native';
import { supabase } from '../config/supabase';
import * as DocumentPicker from 'expo-document-picker';
import { extractCourseFromPDF } from '../utils/aiService';
import { Database } from '../types/supabase';
import { useCourses } from '../hooks/useCourses';
import { CardListSkeleton } from '../components/SkeletonLoaders';

type CourseRow = Database['public']['Tables']['courses']['Row'] & {
    assessments?: any[];
};

type EnrichedCourse = CourseRow & {
    grade: number;
    next_deadline: string;
    daysUntilNext: number | null;
    emoji: string;
};

const SPRING = { damping: 14, stiffness: 180 };
const SPRING_BOUNCY = { damping: 10, stiffness: 200 };
const SPRING_SHEET = { damping: 20, stiffness: 90, mass: 1 };

const P = "#6366f1"; // Indigo Purple

// ─── Helpers ─────────────────────────────────────────────────────────────────
const gradeColor = (g: number) => g >= 85 ? '#10B981' : g >= 70 ? '#F97316' : '#F43F5E';

const getEmoji = (code: string) => {
    return '📘';
};

const getTextColorForDays = (days: number | null) => {
    if (days === null) return '#8A8AAA'; // No tasks
    if (days <= 0) return '#EF4444'; // Overdue / Due Today
    if (days <= 7) return '#F59E0B'; // Due within 7 Days
    return P; // Due in 8+ Days
};

const calculateGrades = (course: CourseRow) => {
    if (!course.assessments || course.assessments.length === 0) {
        return { grade: 0, next: "No upcoming tasks", daysUntilNext: null };
    }

    let totalScore = 0;
    let maxScore = 0;

    // 1. Calculate current grade
    course.assessments.forEach(a => {
        if (a.my_score !== null && a.my_score !== undefined && a.total_marks) {
            totalScore += a.my_score;
            maxScore += a.total_marks;
        }
    });
    const grade = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to exactly midnight today

    // 2. Filter for strictly FUTURE or TODAY tasks
    const futureTasks = course.assessments
        .filter(a => a.due_date) // Must have a date
        .map(a => {
            // Use the Noon trick to prevent timezone shifting
            const d = new Date(a.due_date.includes('T') ? a.due_date : `${a.due_date}T12:00:00`);
            d.setHours(0, 0, 0, 0);
            return { ...a, parsedDate: d };
        })
        // THIS IS THE MAGIC LINE: Only keep tasks that are >= today
        .filter(a => a.parsedDate.getTime() >= now.getTime())
        // Sort chronologically so the closest date is first
        .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    // If all tasks are in the past, or there are none left
    if (futureTasks.length === 0) {
        return { grade, next: "No upcoming tasks", daysUntilNext: null };
    }

    // 3. Grab the very next upcoming task
    const nextTask = futureTasks[0];
    const timeDiff = nextTask.parsedDate.getTime() - now.getTime();
    const daysUntilNext = Math.floor(timeDiff / (1000 * 3600 * 24));

    // Clean up long assignment names
    let taskName = nextTask.title || 'Task';
    if (taskName.length > 22) taskName = taskName.substring(0, 20).trim() + '...';

    // Format the text
    let nextText = "";
    if (daysUntilNext === 0) {
        nextText = `${taskName} • Today`;
    } else if (daysUntilNext === 1) {
        nextText = `${taskName} • Tomorrow`;
    } else if (daysUntilNext < 0) {
        const absDays = Math.abs(daysUntilNext);
        nextText = `${taskName} • ${absDays === 1 ? 'Yesterday' : `${absDays} days ago`}`;
    } else {
        nextText = `${taskName} • In ${daysUntilNext} days`;
    }

    // Set daysUntilNext to a positive number so getTextColorForDays makes it purple/orange/red correctly
    return { grade, next: nextText, daysUntilNext };
};

// ─── Animated Course Card ────────────────────────────────────────────────────
const CourseCard = ({ item, index, onPress }: { item: EnrichedCourse; index: number; onPress: () => void }) => {
    const color = item.color || P;
    const deadlineColor = getTextColorForDays((item as any).daysUntilNext);

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).duration(400).easing(Easing.out(Easing.cubic))}>
            <TouchableOpacity
                onPress={onPress} activeOpacity={0.7}
                style={{
                    backgroundColor: '#fff', borderRadius: 22, marginBottom: 12, overflow: 'hidden',
                    shadowColor: color, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4,
                    borderWidth: 1.5, borderColor: '#EEEEFB',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 }}>
                    <View style={{ flex: 1 }}>
                        <View className="flex-row items-center gap-2 mb-1">
                            <Text className="text-base font-heading text-gray-900 tracking-tight">{item.code}</Text>
                        </View>
                        <Text className="text-[13px] font-body text-gray-500" numberOfLines={1}>{item.name}</Text>
                        {item.next_deadline && (
                            <Text numberOfLines={1} ellipsizeMode="tail" className="text-[12px] font-body-bold mt-1" style={{ color: deadlineColor }}>
                                {item.next_deadline}
                            </Text>
                        )}
                    </View>
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F2FF', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={14} color="#8A8AAA" />
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Pulsing Upload FAB ──────────────────────────────────────────────────────
const UploadFAB = ({ onPress, uploading }: { onPress: () => void; uploading: boolean }) => {
    const scale = useSharedValue(1);
    const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <View style={{ alignItems: 'center', gap: 7 }}>
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={fabStyle}>
                    <TouchableOpacity
                        onPress={onPress} disabled={uploading}
                        onPressIn={() => { scale.value = withSpring(0.9, SPRING); }}
                        onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); }}
                        activeOpacity={1}
                        style={{
                            width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff',
                            borderWidth: 1.5, borderColor: '#EEEEFB', alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 12, elevation: 6,
                        }}
                    >
                        {uploading ? <ActivityIndicator color={P} size="small" /> : <FileText color={P} size={22} strokeWidth={2.5} />}
                    </TouchableOpacity>
                </Animated.View>
            </View>
            <Text className="text-[10px] font-body-bold text-gray-400 tracking-wider">Upload PDF</Text>
        </View>
    );
};

// ─── Add Course FAB ──────────────────────────────────────────────────────────
const AddFAB = ({ onPress }: { onPress: () => void }) => {
    const scale = useSharedValue(1);
    const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
        <View style={{ alignItems: 'center', gap: 7 }}>
            <Animated.View style={fabStyle}>
                <TouchableOpacity
                    onPress={onPress}
                    onPressIn={() => { scale.value = withSpring(0.92, SPRING); }}
                    onPressOut={() => { scale.value = withSpring(1.05, SPRING_BOUNCY); setTimeout(() => { scale.value = withSpring(1, SPRING); }, 200); }}
                    activeOpacity={1} style={{ borderRadius: 29 }}
                >
                    <LinearGradient
                        colors={['#818cf8', '#6366f1', '#4f46e5']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{
                            width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center',
                            shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
                        }}
                    >
                        <Plus color="white" size={28} strokeWidth={2.5} />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
            <Text className="text-[10px] font-body-bold text-gray-400 tracking-wider">Add Course</Text>
        </View>
    );
};

// ─── Stream Variant Item ─────────────────────────────────────────────────────
const StreamVariantItem = ({ v, index, onSelect }: { v: any; index: number; onSelect: (v: any) => void }) => {
    const colors = [P, '#10B981', '#F43F5E', '#F97316'];
    const color = colors[index % colors.length];
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).duration(400).easing(Easing.out(Easing.cubic))}
            style={animatedStyle}
        >
            <TouchableOpacity
                onPressIn={() => scale.value = withSpring(0.97, SPRING)}
                onPressOut={() => { scale.value = withSpring(1, SPRING_BOUNCY); onSelect(v); }}
                activeOpacity={1}
                style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, marginBottom: 10,
                    backgroundColor: '#F8F8FF', borderWidth: 1.5, borderColor: '#EEEEFB', borderRadius: 18,
                }}
            >
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color + '1A', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText color={color} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text className="text-[15px] font-heading text-gray-900">{v.variant_name}</Text>
                    <Text className="text-[12px] font-body text-gray-400 mt-0.5">{v.course_codes?.join(' / ')}</Text>
                </View>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEEEFB', alignItems: 'center', justifyContent: 'center' }}>
                    <ChevronRight size={14} color="#8A8AAA" />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Stream Picker Bottom Sheet ──────────────────────────────────────────────
const StreamPickerSheet = ({ visible, variants, onSelect, onClose }: any) => {
    const translateY = useSharedValue(400);
    const backdropOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            backdropOpacity.value = withTiming(1, { duration: 300 });
            translateY.value = withSpring(0, SPRING_SHEET);
        } else {
            backdropOpacity.value = withTiming(0, { duration: 250 });
            translateY.value = withSpring(400, SPRING);
        }
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
    const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, position: 'relative', justifyContent: 'flex-end' }}>
                <Animated.View style={[{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,15,40,0.55)' }, backdropStyle]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>
                <Animated.View style={[{
                    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 44,
                    shadowColor: P, shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 20,
                }, sheetStyle]}>
                    <View className="w-10 h-1 bg-gray-200 rounded-full self-center mb-5" />
                    <Text className="text-xl font-heading text-gray-900 mb-1">Select Your Stream</Text>
                    <Text className="text-[13px] font-body text-gray-400 mb-5">Different grading schemes detected. Which are you in?</Text>

                    {variants.map((v: any, i: number) => (
                        <StreamVariantItem key={i} v={v} index={i} onSelect={onSelect} />
                    ))}
                    <TouchableOpacity onPress={onClose} className="p-4 bg-gray-50 rounded-2xl items-center mt-1.5">
                        <Text className="text-[15px] font-body-bold text-gray-400">Cancel</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ─── Tab Button ──────────────────────────────────────────────────────────────
const TabButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => {
    const scaleX = useSharedValue(active ? 1 : 0);
    useEffect(() => { scaleX.value = withTiming(active ? 1 : 0, { duration: 250, easing: Easing.out(Easing.cubic) }); }, [active]);

    const underlineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: scaleX.value }] }));

    return (
        <TouchableOpacity onPress={onPress} className="px-4 pb-0">
            <Text
                className={`text-[13px] py-3 font-body-bold ${active ? 'text-primary' : 'text-gray-400'}`}
            >
                {label}
            </Text>
            <Animated.View style={[{ height: 2.5, backgroundColor: P, borderRadius: 2, width: '100%' }, underlineStyle]} />
        </TouchableOpacity>
    );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const AcademicsScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { courses, loading, uploading, user, setUploading, fetchCourses, saveCourseToSupabase } = useCourses();

    // 🟢 Grab the exact notch/status bar height
    const insets = useSafeAreaInsets(); 

    const [activeTab, setActiveTab] = useState<'courses' | 'upcoming'>('courses');
    const [sheetVisible, setSheetVisible] = useState(false);
    const [pendingVariants, setPendingVariants] = useState<any[]>([]);
    const [pendingData, setPendingData] = useState<any>(null);
    const [pendingUrl, setPendingUrl] = useState('');

    const enrichedCourses: EnrichedCourse[] = courses.map(c => {
        const { grade, next, daysUntilNext } = calculateGrades(c as CourseRow);
        return { ...c, grade, next_deadline: next, daysUntilNext, emoji: getEmoji(c.code) } as any;
    });

    const headerOpacity = useSharedValue(0);
    const headerY = useSharedValue(-20);

    useEffect(() => {
        headerOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
        headerY.value = withDelay(100, withSpring(0, SPRING));
    }, []);

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value, transform: [{ translateY: headerY.value }],
    }));

    useFocusEffect(useCallback(() => { fetchCourses(); }, []));

    // 🔴 3. Add this auto-trigger effect:
    useEffect(() => {
        if (route.params?.autoTriggerUpload) {
            // Immediately wipe the parameter so it doesn't get stuck in a loop
            navigation.setParams({ autoTriggerUpload: undefined });

            // Trigger the upload outline picker
            handleUploadOutline();
        }
    }, [route.params?.autoTriggerUpload, navigation]);

    // Stats calculations
    const activeCourses = enrichedCourses.filter(c => c.grade > 0);
    const avg = activeCourses.length > 0
        ? Math.round(activeCourses.reduce((sum, c) => sum + c.grade, 0) / activeCourses.length)
        : 0;

    const dueSoonCount = enrichedCourses.filter(c =>
        c.daysUntilNext !== null && c.daysUntilNext <= 1
    ).length;

    const handleUploadOutline = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
            if (result.canceled) return;

            const fileAsset = result.assets[0];
            setUploading(true);

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) throw new Error("User not logged in");

            const response = await fetch(fileAsset.uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
            const safeFileName = fileAsset.name.replace(/\s+/g, '_').toLowerCase();
            const filePath = `${authUser.id}/${Date.now()}_${safeFileName}`;

            const { error: uploadError } = await supabase.storage.from('course-outlines').upload(filePath, arrayBuffer, { contentType: 'application/pdf', upsert: true });
            if (uploadError) throw uploadError;

            const publicUrl = supabase.storage.from('course-outlines').getPublicUrl(filePath).data.publicUrl;
            const extractedData = await extractCourseFromPDF(fileAsset.uri);

            if (!extractedData) {
                setUploading(false); Alert.alert("Extraction Failed", "Could not identify details."); return;
            }

            if (extractedData.variants && extractedData.variants.length > 0) {
                setPendingVariants(extractedData.variants);
                setPendingData(extractedData); setPendingUrl(publicUrl);
                setUploading(false); setSheetVisible(true);
                return;
            }

            await saveCourseToSupabase(extractedData, extractedData.assessments || [], publicUrl);
            setUploading(false);
        } catch (err: any) {
            setUploading(false); Alert.alert("Process Failed", err.message);
        }
    };

    const handleVariantSelect = async (v: any) => {
        setSheetVisible(false); setUploading(true);
        try {
            const combinedCode = v.course_codes?.join(' / ') || pendingData.course.code;
            await saveCourseToSupabase(pendingData, v.assessments, pendingUrl, v.variant_name, combinedCode);
        } catch (e: any) { Alert.alert("Save Failed", e.message); }
        finally { setUploading(false); }
    };

    // ─── NEW: FLATTEN AND GROUP UPCOMING TASKS ───
    const nowForGrouping = new Date();
    nowForGrouping.setHours(0, 0, 0, 0);

    const allUpcomingTasks: any[] = [];
    const unscheduledTasks: any[] = []; // NEW: Bucket for tasks without dates

    // 1. Extract every incomplete task from all courses
    courses.forEach(c => {
        if (c.assessments) {
            c.assessments.forEach(a => {
                if (!a.is_completed) {
                    if (a.due_date) {
                        const d = new Date(a.due_date.includes('T') ? a.due_date : `${a.due_date}T12:00:00`);
                        d.setHours(0, 0, 0, 0);

                        if (d.getTime() >= nowForGrouping.getTime()) {
                            const timeDiff = d.getTime() - nowForGrouping.getTime();
                            const daysUntil = Math.floor(timeDiff / (1000 * 3600 * 24));
                            allUpcomingTasks.push({
                                ...a,
                                courseCode: c.code,
                                courseColor: c.color || P,
                                parsedDate: d,
                                daysUntil
                            });
                        }
                    } else {
                        // MAGIC: The "Micro-Task" Filter 
                        // Only push unscheduled tasks to the main dashboard if they are worth 5% or more, 
                        // or if the weight is completely unknown (just to be safe). 
                        // 1% participation marks are hidden from here! 
                        if (!a.weight || a.weight >= 5) {
                            unscheduledTasks.push({
                                ...a,
                                courseCode: c.code,
                                courseColor: c.color || P,
                                daysUntil: Infinity
                            });
                        }
                    }
                }
            });
        }
    });

    // 2. Sort the dated tasks chronologically
    allUpcomingTasks.sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    // 3. Group them by Date String
    const groupedTasks: { dateStr: string; headerText: string; daysUntil: number; tasks: any[] }[] = [];
    allUpcomingTasks.forEach(task => {
        const y = task.parsedDate.getFullYear();
        const m = String(task.parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(task.parsedDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        let group = groupedTasks.find(g => g.dateStr === dateStr);

        if (!group) {
            let headerText = "";
            if (task.daysUntil === 0) headerText = "Today";
            else if (task.daysUntil === 1) headerText = "Tomorrow";
            else {
                headerText = task.parsedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            }
            group = { dateStr, headerText, daysUntil: task.daysUntil, tasks: [] };
            groupedTasks.push(group);
        }
        group.tasks.push(task);
    });

    // 4. Sort and Append the "Unscheduled" tasks as the very last group!
    if (unscheduledTasks.length > 0) {
        // ✨ NEW: Sort by weight descending (highest % first)
        unscheduledTasks.sort((a, b) => (b.weight || 0) - (a.weight || 0));

        groupedTasks.push({
            dateStr: 'unscheduled',
            headerText: 'No Date / TBD',
            daysUntil: Infinity,
            tasks: unscheduledTasks
        });
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F7F7FE' }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* ── GRADIENT HEADER ── */}
            <LinearGradient
                colors={['#6366F1', '#797cf7', '#A5B4FC']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ 
                    paddingBottom: 24, 
                    position: 'relative', 
                    overflow: 'hidden', 
                    // 🟢 THE FIX: Dynamically use the notch height, remove the hardcoded 30
                    paddingTop: insets.top 
                }}
            >
                <View style={{ position: 'absolute', top: -50, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' }} />
                <View style={{ position: 'absolute', top: 20, right: 60, width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.05)' }} />

                {/* 🟢 THE FIX: Removed SafeAreaView. Just the Animated.View now! */}
                <Animated.View style={[{ paddingHorizontal: 22, paddingTop: 10 }, headerStyle]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, height: 40 }}>
                            <TouchableOpacity
                                onPress={() => navigation.goBack()}
                                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                style={{ zIndex: 10 }}
                            >
                                <ChevronLeft size={22} color="#fff" strokeWidth={2.5} style={{ marginLeft: -2 }} />
                            </TouchableOpacity>

                            {/* ── DayLi Brand Lockup: ACADEMICS ── */}
                            <View style={{
                                position: 'absolute',
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 5
                            }} pointerEvents="none">
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ color: '#A5B4FC', fontWeight: '800', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                        Academics
                                    </Text>
                                </View>
                            </View>

                            <View style={{ width: 40 }} />
                        </View>

                        <View className="flex-row justify-between items-start mb-5">
                            <View>
                                <Text className="text-[32px] font-heading text-white tracking-tight leading-9 mt-1">My Schedule</Text>
                                <Text className="text-[12px] font-body text-white/60 mt-0.5">Winter 2026</Text>
                            </View>
                        </View>

                        {/* 🟢 NEW 3-SQUARE COMPONENTS 🟢 */}
                        {courses.length > 0 && (
                            <Animated.View
                                entering={FadeInUp.delay(200).duration(400).easing(Easing.out(Easing.cubic))}
                                style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 10 }}
                            >
                                {/* Card 1: Courses */}
                                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>{courses.length}</Text>
                                    <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4, fontWeight: '600' }}>Courses</Text>
                                </View>

                                {/* Card 2: Due Soon */}
                                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>{dueSoonCount}</Text>
                                    <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4, fontWeight: '600' }}>Due Soon</Text>
                                </View>

                                {/* Card 3: Avg Grade */}
                                <View style={{ flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.15)', borderRadius: 20, paddingVertical: 18, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                                    <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff' }}>{avg}%</Text>
                                    <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4, fontWeight: '600' }}>Avg Grade</Text>
                                </View>
                            </Animated.View>
                        )}
                    </Animated.View>
            </LinearGradient>

            {/* ── TABS ── */}
            <View style={{ backgroundColor: '#fff', flexDirection: 'row', paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, zIndex: 2 }}>
                <TabButton label="Courses" active={activeTab === 'courses'} onPress={() => setActiveTab('courses')} />
                <TabButton label="Upcoming" active={activeTab === 'upcoming'} onPress={() => setActiveTab('upcoming')} />
            </View>

            {/* ── CONTENT ── */}
            <View style={{ flex: 1 }}>
                {loading ? (
                    <CardListSkeleton />
                ) : courses.length === 0 ? (
                    <Animated.View entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 }}>
                        <FileText color={P} size={56} style={{ marginBottom: 16 }} />
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' }}>No courses yet</Text>
                        <Text style={{ fontSize: 13, color: '#8A8AAA', textAlign: 'center', maxWidth: 210, marginTop: 8, lineHeight: 20 }}>
                            Upload a course outline PDF or add one manually
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
                            <TouchableOpacity onPress={handleUploadOutline} style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: P + '12', borderRadius: 20 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: P }}>Upload PDF</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('AddCourse')} style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#F5F5FF', borderRadius: 20 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#8A8AAA' }}>+ Add manually</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                ) : activeTab === 'courses' ? (
                    <FlatList
                        data={enrichedCourses}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item, index }) => (
                            <CourseCard item={item} index={index} onPress={() => navigation.navigate('CourseDetails', { courseId: item.id, initialCode: item.code, initialColor: item.color })} />
                        )}
                    />
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                        {groupedTasks.length === 0 ? (
                            <Animated.View entering={FadeIn.duration(400)} style={{ alignItems: 'center', marginTop: 60 }}>
                                <View style={{ height: 40, marginBottom: 12 }}>
                                    <CheckCircle size={40} color={P} />
                                </View>
                                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1A1A2E' }}>You're all caught up!</Text>
                                <Text style={{ fontSize: 13, color: '#8A8AAA', marginTop: 6 }}>No upcoming tasks scheduled.</Text>
                            </Animated.View>
                        ) : (
                            groupedTasks.map((group, gIdx) => (
                                <Animated.View key={`${group.dateStr}-${gIdx}`} entering={FadeInDown.delay(gIdx * 70).duration(400).easing(Easing.out(Easing.cubic))}>

                                    {/* Date Header (Turns red if it's Today or Tomorrow) */}
                                    <Text style={{
                                        fontSize: 11,
                                        fontWeight: '800',
                                        color: group.daysUntil === Infinity ? '#8A8AAA' : group.daysUntil <= 1 ? '#EF4444' : '#8A8AAA',
                                        textTransform: 'uppercase',
                                        letterSpacing: 1.4,
                                        marginTop: gIdx === 0 ? 0 : 22,
                                        marginBottom: 10
                                    }}>
                                        {group.headerText}
                                    </Text>

                                    {/* Task Card Container for this Date */}
                                    <View style={{
                                        backgroundColor: '#fff',
                                        borderRadius: 20,
                                        borderWidth: 1.5,
                                        borderColor: '#EEEEFB',
                                        overflow: 'hidden',
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.04,
                                        shadowRadius: 12,
                                        elevation: 2
                                    }}>
                                        {group.tasks.map((task, tIdx) => (
                                            <View
                                                key={task.id || tIdx}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    padding: 18,
                                                    borderBottomWidth: tIdx === group.tasks.length - 1 ? 0 : 1.5,
                                                    borderBottomColor: '#F8F8FF'
                                                }}
                                            >
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A2E' }}>
                                                        {task.title || 'Assignment'}
                                                    </Text>
                                                    <Text style={{ fontSize: 13, color: '#8A8AAA', fontWeight: '500', marginTop: 4 }}>
                                                        {task.courseCode}
                                                    </Text>
                                                </View>

                                                {/* Clean Badge showing Task Weight, Points, or default */}
                                                <View style={{ backgroundColor: '#F5F5FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#8A8AAA', letterSpacing: 0.5 }}>
                                                        {task.weight ? `${task.weight}%` : task.total_marks ? `${task.total_marks} PTS` : 'TASK'}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </Animated.View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>

            {/* ── BOTTOM FADE & FAB BAR ── */}
            <Animated.View
                entering={FadeInDown.delay(400).duration(400).easing(Easing.out(Easing.cubic))}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}
                pointerEvents="box-none"
            >
                {/* Gradient fade to hide scrolling text elegantly */}
                <LinearGradient
                    colors={['rgba(247, 247, 254, 0)', 'rgba(247, 247, 254, 0.9)', '#F7F7FE']}
                    style={{ height: 20, width: '100%' }}
                    pointerEvents="none"
                />

                {/* 100% Solid background block behind buttons */}
                <View style={{
                    backgroundColor: '#F7F7FE', paddingHorizontal: 28, paddingBottom: 36, paddingTop: 5,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
                }}>
                    <UploadFAB onPress={handleUploadOutline} uploading={uploading} />
                    <Text style={{ fontSize: 11, color: '#C8C8DF', fontWeight: '500', paddingBottom: 10 }}>· · ·</Text>
                    <AddFAB onPress={() => navigation.navigate('AddCourse')} />
                </View>
            </Animated.View>

            {/* ── STREAM PICKER SHEET ── */}
            <StreamPickerSheet visible={sheetVisible} variants={pendingVariants} onSelect={handleVariantSelect} onClose={() => setSheetVisible(false)} />
        </View>
    );
};

export default AcademicsScreen;
