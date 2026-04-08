import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, Alert, StatusBar,
    Animated, Dimensions, TextInput, ActivityIndicator, Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { expenseService, RecurringSubscription } from '../services/expenseService';
import { CUR_SYM } from '../utils/expenseDashboardUtils';

const { width: SW } = Dimensions.get('window');

// ─── DESIGN TOKENS ───────────────────────────────────────────
const C = {
    canvas: '#F4F5F2', surface: '#FFFFFF', raised: '#FAFAF8',
    tint: '#F0EDE7', line: '#E8E4DC', lineMid: '#D6D0C8',
    ink: '#1A1916', inkMid: '#4A4540', muted: '#8A8278', ghost: '#B8B0A6',
    emerald: '#2F5233', emeraldLight: '#86A789', emeraldMid: 'rgba(47, 82, 51, 0.12)',
    amber: '#D97706', red: '#DC2626', blue: '#2563EB', purple: '#7C3AED',
};

const card = {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.line,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
};

const Label = ({ children, style }: { children: string; style?: any }) => (
    <Text style={[{ fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: C.ghost }, style]}>{children}</Text>
);

// ─── UNIFIED RING & LEGEND (Copied from Setup) ───────────────
const UnifiedBudgetRing = ({ income, fixed, savings }: { income: number; fixed: number; savings: number }) => {
    const SIZE = 220; const STROKE = 20; const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R; const CX = SIZE / 2; const CY = SIZE / 2;

    const safeIncome = Math.max(income, 1);
    const fixedPct = Math.min(fixed / safeIncome, 1);
    const savPct = Math.min(savings / safeIncome, 1 - fixedPct);
    const spendPct = Math.max(1 - fixedPct - savPct, 0);

    const fixedDash = fixedPct * CIRC; const savDash = savPct * CIRC; const spendDash = spendPct * CIRC;
    const QUARTER = CIRC * 0.25;
    const fixedOffset = QUARTER;
    const savOffset = QUARTER - fixedDash;
    const spendOffset = QUARTER - fixedDash - savDash;

    const fixedAnim = useRef(new Animated.Value(0)).current;
    const savAnim = useRef(new Animated.Value(0)).current;
    const spendAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(fixedAnim, { toValue: fixedDash, bounciness: 3, useNativeDriver: false }),
            Animated.spring(savAnim, { toValue: savDash, bounciness: 3, useNativeDriver: false }),
            Animated.spring(spendAnim, { toValue: spendDash, bounciness: 3, useNativeDriver: false }),
        ]).start();
    }, [fixedDash, savDash, spendDash]);

    const safe = Math.max(0, income - fixed - savings);

    return (
        <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
                <Circle cx={CX} cy={CY} r={R} fill="none" stroke={C.line} strokeWidth={STROKE} />
                <Circle cx={CX} cy={CY} r={R} fill="none" stroke={C.emerald} strokeWidth={STROKE} strokeDasharray={`${spendDash} ${CIRC - spendDash}`} strokeDashoffset={spendOffset} />
                <Circle cx={CX} cy={CY} r={R} fill="none" stroke={C.blue} strokeWidth={STROKE} strokeDasharray={`${fixedDash} ${CIRC - fixedDash}`} strokeDashoffset={fixedOffset} />
                <Circle cx={CX} cy={CY} r={R} fill="none" stroke={C.purple} strokeWidth={STROKE} strokeDasharray={`${savDash} ${CIRC - savDash}`} strokeDashoffset={savOffset} />
            </Svg>
            <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
                <Text style={{ fontSize: 10, letterSpacing: 2, color: C.ghost, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Safe to Spend</Text>
                <Text style={{ fontSize: safe === 0 ? 36 : 42, fontWeight: '300', color: safe === 0 ? C.ghost : C.emerald, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
                    {safe === 0 ? '—' : CUR_SYM + safe.toLocaleString()}
                </Text>
                <Text style={{ fontSize: 10, color: C.ghost, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>/ month</Text>
            </View>
        </View>
    );
};

const RingLegend = ({ income, fixed, savings }: { income: number; fixed: number; savings: number }) => {
    const safe = Math.max(0, income - fixed - savings);
    const pct = (val: number) => income > 0 ? `${((val / income) * 100).toFixed(0)}%` : '—';
    const fmt = (v: number) => v === 0 ? '—' : CUR_SYM + v.toLocaleString();
    const rows = [
        { color: C.blue, label: 'Fixed', val: fmt(fixed), sub: pct(fixed) },
        { color: C.purple, label: 'Savings', val: fmt(savings), sub: pct(savings) },
        { color: C.emerald, label: 'Spendable', val: fmt(safe), sub: pct(safe) },
    ];
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 }}>
            {rows.map(r => (
                <View key={r.label} style={{ alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color, marginBottom: 5 }} />
                    <Text style={{ fontSize: 9, color: C.ghost, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, color: C.ink, fontWeight: '700', marginTop: 2 }}>{r.val}</Text>
                    <Text style={{ fontSize: 10, color: C.ghost, fontWeight: '500' }}>{r.sub}</Text>
                </View>
            ))}
        </View>
    );
};

const AmountInputCard = ({ value, onChangeText, color, label }: { value: string; onChangeText: (t: string) => void; color: string; label: string; }) => (
    <View style={[card, { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16, marginBottom: 16 }]}>
        <Label style={{ marginBottom: 4 }}>{label}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 26, color: C.ghost, fontWeight: '300', marginRight: 3 }}>{CUR_SYM}</Text>
            <TextInput
                value={value}
                onChangeText={t => onChangeText(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.lineMid}
                style={{ flex: 1, fontSize: 36, fontWeight: '300', color, letterSpacing: -1.5, padding: 0 }}
            />
        </View>
    </View>
);

// ─── MAIN SETTINGS COMPONENT ─────────────────────────────────
const ExpenseSettingsScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [fixedCosts, setFixedCosts] = useState(0);
    const [savingsGoal, setSavingsGoal] = useState(0);

    const [incomeText, setIncomeText] = useState('');
    const [fixedText, setFixedText] = useState('');
    const [savingsText, setSavingsText] = useState('');

    const [existingSubs, setExistingSubs] = useState<RecurringSubscription[]>([]);

    // New Sub State
    const [newSubTitle, setNewSubTitle] = useState('');
    const [newSubAmount, setNewSubAmount] = useState('');
    const [newSubDay, setNewSubDay] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                const budget = await expenseService.fetchUserBudget();
                if (budget) {
                    setMonthlyIncome(budget.monthly_income); setIncomeText(budget.monthly_income.toString());
                    setFixedCosts(budget.fixed_costs); setFixedText(budget.fixed_costs.toString());
                    setSavingsGoal(budget.savings_goal); setSavingsText(budget.savings_goal.toString());
                }
                const subs = await expenseService.fetchSubscriptions();
                if (subs) setExistingSubs(subs);
            } catch (error) {
                Alert.alert("Error", "Could not load your settings.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleIncomeChange = (t: string) => { setIncomeText(t); setMonthlyIncome(t === '' ? 0 : parseInt(t, 10) || 0); };
    const handleFixedChange = (t: string) => { setFixedText(t); setFixedCosts(t === '' ? 0 : parseInt(t, 10) || 0); };
    const handleSavingsChange = (t: string) => { setSavingsText(t); setSavingsGoal(t === '' ? 0 : parseInt(t, 10) || 0); };

    const handleDeleteExistingSub = async (id: string) => {
        Alert.alert("Remove Subscription", "Are you sure you want to remove this?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                    await expenseService.deleteSubscription(id);
                    setExistingSubs(prev => prev.filter(s => s.id !== id));
                }
            }
        ]);
    };

    const handleAddNewSub = async () => {
        const amount = Number(newSubAmount);
        const day = Number(newSubDay);
        if (newSubTitle && !isNaN(amount) && amount > 0 && !isNaN(day) && day >= 1 && day <= 31) {
            setSaving(true);
            try {
                const added = await expenseService.addSubscription(newSubTitle, amount, 'bills', day);
                if (added) {
                    setExistingSubs([...existingSubs, added]);
                    setNewSubTitle(''); setNewSubAmount(''); setNewSubDay('');
                }
            } catch (e) { Alert.alert('Error', 'Could not add subscription'); }
            setSaving(false);
        } else {
            Alert.alert('Invalid', 'Please check the subscription details.');
        }
    };

    const executeSave = async (targetMonth: string) => {
        setSaving(true);
        try {
            await expenseService.saveUserBudget({
                monthly_income: monthlyIncome,
                fixed_costs: fixedCosts,
                savings_goal: savingsGoal,
                is_setup_complete: true
            }, targetMonth);
            
            const isCurrent = targetMonth === new Date().toISOString().slice(0, 7);
            const msg = isCurrent 
                ? "Budget updated for the current month!" 
                : "Budget saved. It will take effect automatically on the 1st of next month!";
                
            Alert.alert("Success", msg, [{ text: "OK", onPress: () => navigation.goBack() }]);
        } catch (e) {
            Alert.alert("Error", "Could not save your changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveProfile = async () => {
        Alert.alert(
            "Apply Changes",
            "When should this new budget take effect?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Next Month",
                    onPress: () => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + 1);
                        executeSave(d.toISOString().slice(0, 7));
                    }
                },
                {
                    text: "Immediately",
                    onPress: () => executeSave(new Date().toISOString().slice(0, 7))
                }
            ]
        );
    };

    if (loading) {
        return <View style={{ flex: 1, backgroundColor: C.canvas, justifyContent: 'center' }}><ActivityIndicator color={C.emerald} size="large" /></View>;
    }

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas, paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* ── NAV BAR ── */}
            <View style={{ paddingHorizontal: 22, paddingTop: 10, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, height: 50 }}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()} 
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    style={{ zIndex: 2 }}
                >
                    <ArrowLeft size={26} color={C.ink} strokeWidth={2} />
                </TouchableOpacity>

                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1 }} pointerEvents="none">
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, letterSpacing: 1.5, textTransform: 'uppercase' }}>Settings</Text>
                </View>

                <View style={{ width: 30 }} />
            </View>

            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraHeight={Platform.OS === 'ios' ? 80 : 0}
                extraScrollHeight={Platform.OS === 'ios' ? 80 : 0}
            >

                {/* ── LIVE RING ── */}
                <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 24 }}>
                    <UnifiedBudgetRing income={monthlyIncome} fixed={fixedCosts} savings={savingsGoal} />
                    <RingLegend income={monthlyIncome} fixed={fixedCosts} savings={savingsGoal} />
                </View>

                {/* ── CORE INPUTS ── */}
                <AmountInputCard label="Monthly Income" value={incomeText} onChangeText={handleIncomeChange} color={C.emerald} />
                <AmountInputCard label="Fixed Costs" value={fixedText} onChangeText={handleFixedChange} color={C.blue} />
                <AmountInputCard label="Savings Goal" value={savingsText} onChangeText={handleSavingsChange} color={C.purple} />

                {/* ── SUBSCRIPTIONS ── */}
                <Label style={{ marginTop: 10, marginBottom: 10, marginLeft: 2 }}>Active Subscriptions</Label>

                {existingSubs.length > 0 && (
                    <View style={[card, { overflow: 'hidden', padding: 0, marginBottom: 16 }]}>
                        {existingSubs.map((s, i) => (
                            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < existingSubs.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{s.title}</Text>
                                    <Text style={{ fontSize: 12, color: C.ghost, fontWeight: '500', marginTop: 1 }}>Day {s.billing_day} of month</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{CUR_SYM}{s.amount.toFixed(2)}</Text>
                                    <TouchableOpacity onPress={() => handleDeleteExistingSub(s.id)}>
                                        <Text style={{ fontSize: 11, color: C.red, fontWeight: '600' }}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── ADD NEW SUB ── */}
                <View style={[card, { padding: 16, gap: 10 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 4 }}>Add New Subscription</Text>
                    <TextInput value={newSubTitle} onChangeText={setNewSubTitle} placeholder="Netflix, Spotify…" placeholderTextColor={C.ghost} style={{ backgroundColor: C.raised, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, fontSize: 15, color: C.ink }} />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput value={newSubAmount} onChangeText={setNewSubAmount} placeholder={`Amount (${CUR_SYM})`} keyboardType="decimal-pad" placeholderTextColor={C.ghost} style={{ flex: 1, backgroundColor: C.raised, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, fontSize: 15, color: C.ink }} />
                        <TextInput value={newSubDay} onChangeText={t => setNewSubDay(t.replace(/[^0-9]/g, ''))} placeholder="Day (1-31)" keyboardType="number-pad" maxLength={2} placeholderTextColor={C.ghost} style={{ flex: 1, backgroundColor: C.raised, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line, fontSize: 15, color: C.ink }} />
                    </View>
                    <TouchableOpacity onPress={handleAddNewSub} disabled={saving} style={{ height: 44, borderRadius: 12, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                        <Text style={{ color: C.inkMid, fontWeight: '700', fontSize: 14 }}>+ Add to List</Text>
                    </TouchableOpacity>
                </View>

                {/* ── MAIN SAVE BUTTON ── */}
                <TouchableOpacity
                    onPress={handleSaveProfile}
                    disabled={saving}
                    style={{ height: 54, borderRadius: 16, backgroundColor: saving ? C.tint : C.emerald, alignItems: 'center', justifyContent: 'center', marginTop: 32, shadowColor: C.emerald, shadowOffset: { width: 0, height: 6 }, shadowOpacity: saving ? 0 : 0.28, shadowRadius: 16, elevation: 6 }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </Text>
                </TouchableOpacity>

            </KeyboardAwareScrollView>
        </View>
    );
};

export default ExpenseSettingsScreen;
