import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, ActivityIndicator, TextInput, Dimensions, KeyboardAvoidingView, Platform, Keyboard, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft as ChevronLeft, Plus as PlusIcon, FileText, Calendar, TrendingUp, User, Mail, ExternalLink, X, Trash2 } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

import { CourseDetailsSkeleton } from '../components/SkeletonLoaders';
import { useCourseDetails } from '../hooks/useCourseDetails';
import { ProgressRing } from '../components/Course/ProgressRing';
import { AssessmentRow } from '../components/Course/AssessmentRow';
import { MUTED, formatTime12Hour } from '../utils/courseDetailsUtils';

const { width: SCREEN_W } = Dimensions.get('window');

const CourseDetailsScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const {
        course, theme, assessments, classes, loading, grade, completedCount, completedPct, motivation,
        activeTab, setActiveTab, gradeModal, setGradeModal, scoreInput, setScoreInput, totalInput, setTotalInput,
        dateInput, setDateInput, showDatePicker, setShowDatePicker, manageScheduleVisible, setManageScheduleVisible,
        formSessions, setFormSessions, showPicker, setShowPicker, pickerInfo, setPickerInfo, targetModalVisible, setTargetModalVisible,
        targetInput, setTargetInput, pdfModalVisible, setPdfModalVisible, handleToggle, handleSaveGrade, openManageSchedule,
        toggleFormDay, updateSession, addNewSession, saveCompleteSchedule, saveTarget, openEmail, openSyllabus
    } = useCourseDetails();

    if (loading) {
        return <CourseDetailsSkeleton theme={theme} />;
    }

    return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={[theme.deep, theme.primary, theme.light]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingBottom: 0 }}>
                <View style={{ paddingTop: insets.top }}>
                    <View style={{ paddingHorizontal: 22, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                            <ChevronLeft size={22} color="#fff" strokeWidth={2.0} style={{ marginLeft: -2 }} />
                        </TouchableOpacity>
                        {grade !== null && (
                            <View className="bg-white/20 rounded-full px-3.5 py-1.5 border border-white/30">
                                <Text className="text-sm font-heading text-white">Avg: {grade}%</Text>
                            </View>
                        )}
                    </View>

                    <View className="px-[22px] pb-[22px]">
                        <Text className="text-sm text-white/70 font-body-bold mb-1">{course?.code}</Text>
                        <Text className="text-[26px] font-heading text-white mb-3">{course?.name}</Text>

                        {classes.length > 0 ? (
                            <View className="gap-3">
                                <View>
                                    {classes.map((cls, idx) => (
                                        <View key={cls.id || idx} className="flex-row items-center gap-2 mb-1.5">
                                            <View className="bg-white/15 px-2 py-0.5 rounded-lg border border-white/20">
                                                <Text className="text-[10px] font-body-bold text-white uppercase tracking-wider">{cls.type}</Text>
                                            </View>
                                            <Text className="text-sm text-white/90 font-body-bold">
                                                {cls.days.map((d: string) => d.substring(0, 3)).join("/")} • {formatTime12Hour(cls.start_time)}
                                                {cls.location ? ` • ${cls.location}` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                                <TouchableOpacity onPress={openManageSchedule} style={{ borderStyle: 'dashed' }} className="border border-white/40 bg-white/5 py-3 rounded-xl items-center">
                                    <Text className="text-white/80 font-heading tracking-widest text-[10px]">MODIFY SCHEDULE</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={openManageSchedule} style={{ borderStyle: 'dashed' }} className="flex-row items-center gap-2 border border-white/40 bg-white/5 px-4 py-2.5 rounded-xl self-start">
                                <PlusIcon size={14} color="#fff" />
                                <Text className="text-[12px] font-body-bold text-white/90">Add Class Sessions</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={{ paddingHorizontal: 22 }}>
                        <View className="bg-white/15 rounded-t-[20px] p-[18px] border border-white/20 border-b-0 flex-row items-center gap-4">
                            <ProgressRing pct={completedPct} color="#fff" />
                            <View className="flex-1">
                                <Text className="text-[10px] text-white/70 font-body-bold uppercase tracking-wider">Completion</Text>
                                <Text className="text-sm text-white font-body-bold">{completedCount} of {assessments.length} done</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setTargetInput(course?.target_grade?.toString() || '80'); setTargetModalVisible(true); }} className="items-end bg-white/10 px-2.5 py-1.5 rounded-xl">
                                <Text className="text-[10px] text-white/70 font-body-bold uppercase tracking-wider">Target</Text>
                                <Text className="text-lg font-heading text-white">{course?.target_grade ?? 80}%</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View className="flex-row bg-white px-2 shadow shadow-slate-100 z-10">
                {[{ key: "assessments", label: "Tasks" }, { key: "info", label: "Info" }].map(tab => (
                    <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} className={`flex-1 py-3.5 items-center border-b-[3px] ${activeTab === tab.key ? '' : 'border-transparent'}`} style={{ borderBottomColor: activeTab === tab.key ? theme.primary : "transparent" }}>
                        <Text className={`text-[13px] font-body-bold ${activeTab === tab.key ? '' : 'text-slate-500'}`} style={{ color: activeTab === tab.key ? theme.primary : MUTED }}>{tab.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                {/* Motivation Banner */}
                {activeTab === 'assessments' && assessments.length > 0 && (
                    <Animated.View entering={FadeInDown.duration(400)} className="rounded-2xl p-3.5 flex-row items-center mb-5 border-[1.5px]" style={{ backgroundColor: motivation.bg, borderColor: motivation.border }}>
                        <Text className="flex-1 text-[13px] font-body-bold leading-[18px]" style={{ color: motivation.color }}>{motivation.msg}</Text>
                        <TrendingUp color={motivation.color} size={20} />
                    </Animated.View>
                )}

                {/* Assessments Tab */}
                {activeTab === 'assessments' && (
                    <View>
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-[12px] font-body-bold text-slate-500 uppercase tracking-wider">All Assessments</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('AddAssignment', { courseId: course?.id, courseColor: course?.color, courseCode: course?.code })} className="flex-row items-center gap-1 px-3 py-1.5 rounded-full" style={{ backgroundColor: theme.primary + "15" }}>
                                <PlusIcon size={14} color={theme.primary} />
                                <Text className="text-[13px] font-body-bold" style={{ color: theme.primary }}>Add New</Text>
                            </TouchableOpacity>
                        </View>
                        {assessments.length === 0 ? (
                            <View style={{ alignItems: "center", padding: 30, backgroundColor: theme.bg, borderRadius: 20, borderWidth: 2, borderColor: theme.border, borderStyle: "dashed" }}>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: theme.text }}>No assessments yet</Text>
                                <Text style={{ fontSize: 13, color: MUTED, textAlign: "center", marginTop: 8 }}>Upload a syllabus PDF to automatically extract grading data!</Text>
                            </View>
                        ) : (
                            assessments.map((a, i) => (
                                <AssessmentRow key={a.id} item={a} index={i} theme={theme} onToggle={() => handleToggle(a.id, a.is_completed)} onGradeClick={() => {
                                    setGradeModal(a);
                                    setScoreInput(a.my_score?.toString() || '');
                                    setTotalInput(a.total_marks && a.total_marks !== 100 ? a.total_marks.toString() : '');
                                    setDateInput(a.due_date ? new Date(a.due_date) : null);
                                }} />
                            ))
                        )}
                    </View>
                )}

                {/* Info Tab */}
                {activeTab === 'info' && (
                    <Animated.View entering={FadeInDown.duration(400)}>
                        <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: theme.border, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 10, elevation: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                <LinearGradient colors={[theme.light, theme.primary]} style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" }}><User color="#fff" size={24} /></LinearGradient>
                                <View>
                                    <Text style={{ fontSize: 17, fontWeight: '800', color: theme.text }}>{course?.professor_name || "Instructor Unknown"}</Text>
                                    <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Course Instructor</Text>
                                </View>
                            </View>
                            {course?.professor_email && (
                                <TouchableOpacity onPress={openEmail} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: theme.bg, borderRadius: 14, borderWidth: 1, borderColor: theme.border }}>
                                    <View style={{ opacity: 0.5 }}><Mail size={20} color={theme.primary} /></View>
                                    <Text style={{ fontSize: 14, fontWeight: "700", color: theme.primary }}>{course.professor_email}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TouchableOpacity onPress={openSyllabus} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 18, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: theme.primary + "30" }}>
                            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: theme.primary + "15", alignItems: "center", justifyContent: "center" }}><FileText color={theme.primary} size={24} /></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: "800", color: theme.text }}>View Course Outline</Text>
                                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Open PDF in browser</Text>
                            </View>
                            <ExternalLink size={20} color={theme.primary} />
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Modals ------------------------------------- */}
            <Modal visible={!!gradeModal} transparent animationType="fade" onRequestClose={() => setGradeModal(null)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ position: "absolute", inset: 0, justifyContent: "flex-end", backgroundColor: "rgba(12,26,46,0.6)", zIndex: 100 }}>
                    <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 }}>
                        <View style={{ width: 40, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text }}>Enter Grade</Text>
                        <Text style={{ fontSize: 14, color: MUTED, marginVertical: 6 }}><Text style={{ fontWeight: "700", color: theme.text }}>{gradeModal?.title}</Text> · {gradeModal?.weight}% of total</Text>

                        <View style={{ flexDirection: "row", gap: 12, marginVertical: 20 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: "800", color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>My Score</Text>
                                <TextInput value={scoreInput} onChangeText={setScoreInput} keyboardType="decimal-pad" style={{ backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 16, fontSize: 22, fontWeight: "800", color: theme.text, textAlign: "center" }} />
                            </View>
                            <View style={{ justifyContent: "center", paddingTop: 20 }}><Text style={{ fontSize: 24, color: "#CBD5E1", fontWeight: "300" }}>/</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: "800", color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Total Marks</Text>
                                <TextInput value={totalInput} onChangeText={setTotalInput} placeholder="100" placeholderTextColor="#94A3B8" keyboardType="decimal-pad" style={{ backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 16, fontSize: 22, fontWeight: "800", color: theme.text, textAlign: "center" }} />
                            </View>
                        </View>

                        <Text style={{ fontSize: 11, fontWeight: "800", color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Deadline</Text>
                        <TouchableOpacity onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }} style={{ backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: 14, padding: 16, marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 16, fontWeight: "700", color: dateInput ? theme.text : MUTED }}>{dateInput ? dateInput.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Set a date..."}</Text>
                            <Calendar size={18} color={theme.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleSaveGrade} style={{ backgroundColor: theme.primary, padding: 18, borderRadius: 16, alignItems: "center" }}>
                            <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setGradeModal(null)} style={{ padding: 16, alignItems: "center", marginTop: 8 }}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: MUTED }}>Cancel</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {showDatePicker && (
                        <View style={{ position: "absolute", inset: 0, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowDatePicker(false)} />
                            <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, alignItems: "center" }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#F1F5F9", width: "100%" }}>
                                    <TouchableOpacity onPress={() => { setDateInput(null); setShowDatePicker(false); }} style={{ padding: 8 }}>
                                        <Text style={{ color: "#EF4444", fontWeight: "800" }}>Clear</Text>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>Set Deadline</Text>
                                    <TouchableOpacity onPress={() => { if (!dateInput) setDateInput(new Date()); setShowDatePicker(false); }} style={{ padding: 8, backgroundColor: theme.bg, borderRadius: 12 }}>
                                        <Text style={{ color: theme.primary, fontWeight: "800" }}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ width: "100%", alignItems: "center", paddingHorizontal: 10 }}>
                                    <DateTimePicker
                                        value={dateInput || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                        style={{ alignSelf: 'center', backgroundColor: '#fff' }}
                                        onChange={(event, selectedDate) => {
                                            if (Platform.OS === 'android') setShowDatePicker(false);
                                            if (selectedDate) setDateInput(selectedDate);
                                        }}
                                    />
                                </View>
                            </Animated.View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </Modal>

            {/* Target Grade Modal */}
            <Modal visible={targetModalVisible} transparent animationType="fade" onRequestClose={() => setTargetModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ position: "absolute", inset: 0, justifyContent: "center", padding: 24, backgroundColor: "rgba(12,26,46,0.6)", zIndex: 100 }}>
                    <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#fff", borderRadius: 24, padding: 24 }}>
                        <Text style={{ fontSize: 22, fontWeight: "900", color: theme.text, marginBottom: 8 }}>Set Your Goal</Text>
                        <Text style={{ fontSize: 14, color: MUTED, lineHeight: 20, marginBottom: 24 }}>What grade are you aiming for in this course? We'll help you track what you need to score to get there.</Text>
                        <TextInput autoFocus value={targetInput} onChangeText={setTargetInput} keyboardType="number-pad" style={{ backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: theme.border, borderRadius: 16, padding: 20, fontSize: 32, fontWeight: "900", color: theme.text, textAlign: "center", marginBottom: 24 }} />
                        <TouchableOpacity onPress={saveTarget} style={{ backgroundColor: theme.primary, padding: 18, borderRadius: 16, alignItems: "center" }}>
                            <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff" }}>Set Target</Text>
                        </TouchableOpacity>
                        {course?.target_grade !== null && (
                            <TouchableOpacity onPress={() => setTargetModalVisible(false)} style={{ padding: 16, alignItems: "center", marginTop: 8 }}>
                                <Text style={{ fontSize: 15, fontWeight: "700", color: MUTED }}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Master Schedule Editor Modal */}
            <Modal visible={manageScheduleVisible} transparent animationType="slide" onRequestClose={() => setManageScheduleVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ position: "absolute", inset: 0, justifyContent: "flex-end", backgroundColor: "rgba(12,26,46,0.6)", zIndex: 100 }}>
                    <Animated.View entering={FadeInDown.duration(400)} style={{ backgroundColor: "#fff", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, maxHeight: "90%" }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                            <Text style={{ fontSize: 20, fontWeight: "900", color: theme.text }}>Manage Schedule</Text>
                            <TouchableOpacity onPress={() => setManageScheduleVisible(false)} style={{ padding: 8, backgroundColor: "#F1F5F9", borderRadius: 20 }}><X size={20} color={MUTED} /></TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {formSessions.map((session, index) => {
                                return (
                                    <View key={session.tempId} style={{ backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: theme.primary }}>
                                        <View className="flex-row justify-between items-center mb-4">
                                            <Text className="text-[10px] font-body-bold text-slate-400 uppercase tracking-widest">{session.type}</Text>
                                            <TouchableOpacity onPress={() => setFormSessions(prev => prev.filter((_, i) => i !== index))}>
                                                <Trash2 size={16} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>

                                        {/* Type */}
                                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                                            {['Lecture', 'Tutorial', 'Lab', 'Seminar', 'Office Hour'].map(t => (
                                                <TouchableOpacity key={t} onPress={() => updateSession(index, 'type', t)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: session.type === t ? theme.primary : theme.border, backgroundColor: session.type === t ? theme.bg : "#fff" }}>
                                                    <Text style={{ fontSize: 11, fontWeight: "700", color: session.type === t ? theme.deep : MUTED }}>{t}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>

                                        {/* Day Multi-Select */}
                                        <View className="flex-row justify-between mb-4">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => {
                                                const fullDay = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i];
                                                const isSelected = session.days.includes(fullDay);
                                                return (
                                                    <TouchableOpacity key={i} onPress={() => toggleFormDay(index, fullDay)} style={{ width: 32, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.primary : '#fff' }}>
                                                        <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : MUTED }}>{d}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Times */}
                                        <View className="flex-row gap-3 mb-4">
                                            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setPickerInfo({ index, field: 'startTime' }); setShowPicker(true); }} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 items-center">
                                                <Text className="text-[10px] text-slate-400 font-body-bold uppercase mb-1">Start</Text>
                                                <Text className="font-heading text-sm">{session.startTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => { Keyboard.dismiss(); setPickerInfo({ index, field: 'endTime' }); setShowPicker(true); }} className="flex-1 bg-white border border-slate-200 rounded-xl p-3 items-center">
                                                <Text className="text-[10px] text-slate-400 font-body-bold uppercase mb-1">End</Text>
                                                <Text className="font-heading text-sm">{session.endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Location */}
                                        <TextInput value={session.location} onChangeText={(v) => updateSession(index, 'location', v)} placeholder="Location (e.g., RM 101)" autoCapitalize="characters" placeholderTextColor="#94A3B8" className="bg-white border border-slate-200 rounded-xl p-3 text-sm font-body-bold" />
                                    </View>
                                );
                            })}

                            <TouchableOpacity onPress={addNewSession} className="p-4 rounded-xl border-2 border-dashed items-center mb-6" style={{ borderColor: theme.primary + '30' }}>
                                <Text className="font-heading text-sm" style={{ color: theme.primary }}>+ Add Session</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={saveCompleteSchedule} className="p-4 rounded-2xl items-center mb-4" style={{ backgroundColor: theme.primary }}>
                                <Text className="text-white font-heading text-lg">Save All Changes</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setManageScheduleVisible(false)} className="items-center p-2 mb-10">
                                <Text className="text-slate-400 font-body-bold">Discard Changes</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>

                    {showPicker && !!pickerInfo && (
                        <View style={{ position: "absolute", inset: 0, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.3)", zIndex: 200 }}>
                            <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowPicker(false)} />
                            <Animated.View entering={FadeInDown.duration(300)} style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, alignItems: "center" }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderColor: "#F1F5F9", width: "100%" }}>
                                    <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text }}>
                                        Set {pickerInfo?.field === 'startTime' ? 'Start' : 'End'} Time
                                    </Text>
                                    <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 8, backgroundColor: theme.bg, borderRadius: 12 }}>
                                        <Text style={{ color: theme.primary, fontWeight: "800" }}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ width: "100%", alignItems: "center" }}>
                                    <DateTimePicker
                                        value={formSessions[pickerInfo.index][pickerInfo.field]}
                                        mode="time"
                                        display="spinner"
                                        onChange={(event, date) => {
                                            if (Platform.OS === 'android') setShowPicker(false);
                                            if (date) updateSession(pickerInfo.index, pickerInfo.field, date);
                                        }}
                                    />
                                </View>
                            </Animated.View>
                        </View>
                    )}
                </KeyboardAvoidingView>
            </Modal>

            {/* In-App PDF Viewer Modal */}
            <Modal visible={pdfModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPdfModalVisible(false)} statusBarTranslucent={true}>
                <View style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: insets.top + 10, paddingBottom: 15, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.text }}>{course?.code} Syllabus</Text>
                        <TouchableOpacity onPress={() => setPdfModalVisible(false)} style={{ backgroundColor: theme.primary + '15', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 }}>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.primary }}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <WebView
                        source={{ uri: Platform.OS === 'ios' ? (course?.outline_url || '') : `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(String(course?.outline_url || ''))}` }}
                        style={{ flex: 1 }}
                        startInLoadingState={true}
                        renderLoading={() => (
                            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color={theme.primary} />
                            </View>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

export default CourseDetailsScreen;
