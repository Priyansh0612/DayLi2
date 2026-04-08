import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, Alert, StatusBar,
    Animated, Dimensions, Platform
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { TextInput } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ArrowLeft } from 'lucide-react-native';
import { expenseService } from '../services/expenseService';
import { CUR_SYM } from '../utils/expenseDashboardUtils';

const { width: SW } = Dimensions.get('window');

// ─── DESIGN TOKENS — unified with Dashboard & Stats ──────────
const C = {
    canvas: '#F4F5F2',
    surface: '#FFFFFF',
    raised: '#FAFAF8',
    tint: '#F0EDE7',
    line: '#E8E4DC',
    lineMid: '#D6D0C8',
    ink: '#1A1916',
    inkMid: '#4A4540',
    muted: '#8A8278',
    ghost: '#B8B0A6',
    emerald: '#2F5233',
    emeraldLight: '#86A789',
    emeraldMid: 'rgba(47, 82, 51, 0.12)',
    amber: '#D97706',
    red: '#DC2626',
    blue: '#2563EB',
    purple: '#7C3AED',
};

const card = {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
};

const Label = ({ children, style }: { children: string; style?: any }) => (
    <Text style={[{ fontSize: 10, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase', color: C.ghost }, style]}>
        {children}
    </Text>
);

const Divider = ({ style }: { style?: any }) => (
    <View style={[{ height: 1, backgroundColor: C.line }, style]} />
);

// ─── STEP PILLS ───────────────────────────────────────────────
const StepPill = ({ current, total }: { current: number; total: number }) => (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
            <View key={i} style={{
                height: 4,
                width: i === current - 1 ? 28 : 8,
                borderRadius: 2,
                backgroundColor: i === current - 1 ? C.emerald : C.line,
            }} />
        ))}
    </View>
);

// ─── UNIFIED STACKED BUDGET RING ─────────────────────────────
// One ring. Three coloured arcs stacked proportionally on income:
//   Blue  = fixed costs (starts at top, 12 o'clock)
//   Purple = savings (stacked right after fixed)
//   Emerald = safe-to-spend remainder (fills the rest)
// Each step highlights its own arc; others dim.
const UnifiedBudgetRing = ({
    income,
    fixed,
    savings,
    activeSegment,
}: {
    income: number;
    fixed: number;
    savings: number;
    activeSegment: 'income' | 'fixed' | 'savings';
}) => {
    const SIZE = 220;
    const STROKE = 20;
    const R = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * R;
    const CX = SIZE / 2;
    const CY = SIZE / 2;

    const safeIncome = Math.max(income, 1);
    const fixedPct = Math.min(fixed / safeIncome, 1);
    const savPct = Math.min(savings / safeIncome, 1 - fixedPct);
    const spendPct = Math.max(1 - fixedPct - savPct, 0);

    // Dash lengths — proportion of full circumference
    const fixedDash = fixedPct * CIRC;
    const savDash = savPct * CIRC;
    const spendDash = spendPct * CIRC;

    // Each arc's offset from 12 o'clock (SVG starts at 3 o'clock so subtract CIRC*0.25)
    const QUARTER = CIRC * 0.25;
    const fixedOffset = QUARTER;                        // starts at top
    const savOffset = QUARTER - fixedDash;            // right after fixed
    const spendOffset = QUARTER - fixedDash - savDash;  // right after savings

    // Animate segment lengths when values change
    const fixedAnim = useRef(new Animated.Value(0)).current;
    const savAnim = useRef(new Animated.Value(0)).current;
    const spendAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(fixedAnim, { toValue: fixedDash, bounciness: 3, useNativeDriver: false }),
            Animated.spring(savAnim, { toValue: savDash, bounciness: 3, useNativeDriver: false }),
            Animated.spring(spendAnim, { toValue: spendDash, bounciness: 3, useNativeDriver: false }),
        ]).start();
    }, [fixedDash, savDash, spendDash]);

    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.025, duration: 1600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, []);

    const safe = Math.max(0, income - fixed - savings);

    // Active segment dimming
    const fixedOpacity = activeSegment === 'income' ? 0.25 : 1;
    const savOpacity = activeSegment === 'savings' ? 1 : activeSegment === 'fixed' ? 0.3 : 0.2;
    const spendOpacity = activeSegment === 'income' ? 1 : 0.2;

    return (
        <Animated.View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulseAnim }] }}>
            <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
                {/* Track */}
                <Circle cx={CX} cy={CY} r={R} fill="none" stroke={C.line} strokeWidth={STROKE} strokeLinecap="butt" />

                {/* Emerald — safe to spend (fills after fixed+savings) */}
                <Circle
                    cx={CX} cy={CY} r={R} fill="none"
                    stroke={C.emerald}
                    strokeWidth={STROKE} strokeLinecap="butt"
                    strokeDasharray={`${spendDash} ${CIRC - spendDash}`}
                    strokeDashoffset={spendOffset}
                    opacity={spendOpacity}
                />
                {/* Blue — fixed costs (starts at top) */}
                <Circle
                    cx={CX} cy={CY} r={R} fill="none"
                    stroke={C.blue}
                    strokeWidth={STROKE} strokeLinecap="butt"
                    strokeDasharray={`${fixedDash} ${CIRC - fixedDash}`}
                    strokeDashoffset={fixedOffset}
                    opacity={fixedOpacity}
                />
                {/* Purple — savings (right after fixed) */}
                <Circle
                    cx={CX} cy={CY} r={R} fill="none"
                    stroke={C.purple}
                    strokeWidth={STROKE} strokeLinecap="butt"
                    strokeDasharray={`${savDash} ${CIRC - savDash}`}
                    strokeDashoffset={savOffset}
                    opacity={savOpacity}
                />
            </Svg>

            {/* Centre label — changes based on active step */}
            <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
                {activeSegment === 'income' && (
                    <>
                        <Text style={{ fontSize: 10, letterSpacing: 2, color: C.ghost, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Monthly</Text>
                        <Text style={{ fontSize: income === 0 ? 36 : 42, fontWeight: '300', color: income === 0 ? C.ghost : C.emerald, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
                            {income === 0 ? '—' : CUR_SYM + income.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: C.ghost, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>Income</Text>
                    </>
                )}
                {activeSegment === 'fixed' && (
                    <>
                        <Text style={{ fontSize: 10, letterSpacing: 2, color: C.ghost, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Fixed</Text>
                        <Text style={{ fontSize: fixed === 0 ? 36 : 42, fontWeight: '300', color: fixed === 0 ? C.ghost : C.blue, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
                            {fixed === 0 ? '—' : CUR_SYM + fixed.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: C.ghost, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>
                            {income > 0 && fixed > 0 ? `${((fixed / income) * 100).toFixed(0)}% of income` : 'of income'}
                        </Text>
                    </>
                )}
                {activeSegment === 'savings' && (
                    <>
                        <Text style={{ fontSize: 10, letterSpacing: 2, color: C.ghost, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Safe to Spend</Text>
                        <Text style={{ fontSize: safe === 0 ? 36 : 42, fontWeight: '300', color: safe === 0 ? C.ghost : C.emerald, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
                            {safe === 0 ? '—' : CUR_SYM + safe.toLocaleString()}
                        </Text>
                        <Text style={{ fontSize: 10, color: C.ghost, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>/ month</Text>
                    </>
                )}
            </View>
        </Animated.View>
    );
};

// ─── RING LEGEND ─────────────────────────────────────────────
const RingLegend = ({ income, fixed, savings, activeSegment }: {
    income: number; fixed: number; savings: number;
    activeSegment: 'income' | 'fixed' | 'savings';
}) => {
    const safe = Math.max(0, income - fixed - savings);
    const pct = (val: number) => income > 0 ? `${((val / income) * 100).toFixed(0)}%` : '—';
    const fmt = (v: number) => v === 0 ? '—' : CUR_SYM + v.toLocaleString();
    const rows = [
        { color: C.blue, label: 'Fixed', val: fmt(fixed), sub: pct(fixed), seg: 'fixed' },
        { color: C.purple, label: 'Savings', val: fmt(savings), sub: pct(savings), seg: 'savings' },
        { color: C.emerald, label: 'Spendable', val: fmt(safe), sub: pct(safe), seg: 'income' },
    ];
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 16 }}>
            {rows.map(r => (
                <View key={r.label} style={{ alignItems: 'center', opacity: activeSegment === r.seg ? 1 : 0.45 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: r.color, marginBottom: 5 }} />
                    <Text style={{ fontSize: 9, color: C.ghost, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>{r.label}</Text>
                    <Text style={{ fontSize: 13, color: C.ink, fontWeight: '700', marginTop: 2 }}>{r.val}</Text>
                    <Text style={{ fontSize: 10, color: C.ghost, fontWeight: '500' }}>{r.sub}</Text>
                </View>
            ))}
        </View>
    );
};

// ─── AMOUNT INPUT CARD — replaces slider ─────────────────────
const AmountInputCard = ({ value, onChangeText, color, hint }: {
    value: string; onChangeText: (t: string) => void; color: string; hint?: string;
}) => (
    <View style={[card, { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, marginTop: 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 26, color: C.ghost, fontWeight: '300', marginRight: 3, lineHeight: 42 }}>{CUR_SYM}</Text>
            <TextInput
                value={value}
                onChangeText={t => onChangeText(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={C.lineMid}
                autoFocus
                style={{
                    flex: 1,
                    fontSize: 42,
                    fontWeight: '300',
                    lineHeight: 52,
                    color,
                    letterSpacing: -1.5,
                    paddingTop: 4,
                    paddingBottom: 0,
                    paddingHorizontal: 0,
                    includeFontPadding: false,
                    fontVariant: ['tabular-nums'],
                }}
            />
        </View>
        {hint ? <Text style={{ fontSize: 12, color: C.ghost, fontWeight: '500', marginTop: 8 }}>{hint}</Text> : null}
    </View>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════
const ExpenseSetupScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Start blank — ring updates live as user types, no pre-filled number to delete
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [fixedCosts, setFixedCosts] = useState(0);
    const [savingsGoal, setSavingsGoal] = useState(0);

    const [incomeText, setIncomeText] = useState('');
    const [fixedText, setFixedText] = useState('');
    const [savingsText, setSavingsText] = useState('');

    const [subscriptions, setSubscriptions] = useState<{ title: string; amount: number; category: string; billing_day: number }[]>([]);
    const [newSubTitle, setNewSubTitle] = useState('');
    const [newSubAmount, setNewSubAmount] = useState('');
    const [newSubDay, setNewSubDay] = useState('');

    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const handleIncomeChange = (t: string) => { setIncomeText(t); setMonthlyIncome(t === '' ? 0 : parseInt(t, 10) || 0); };
    const handleFixedChange = (t: string) => { setFixedText(t); setFixedCosts(t === '' ? 0 : parseInt(t, 10) || 0); };
    const handleSavingsChange = (t: string) => { setSavingsText(t); setSavingsGoal(t === '' ? 0 : parseInt(t, 10) || 0); };

    const animateStep = (dir: 1 | -1, cb: () => void) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 110, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: dir * -28, duration: 110, useNativeDriver: true }),
        ]).start(() => {
            cb();
            slideAnim.setValue(dir * 28);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        });
    };

    const handleContinue = () => animateStep(1, () => setStep(s => s + 1));
    const handleBack = () => animateStep(-1, () => setStep(s => s - 1));

    const handleFinish = async () => {
        setSaving(true);
        try {
            await expenseService.saveUserBudget({
                monthly_income: monthlyIncome,
                fixed_costs: fixedCosts,
                savings_goal: savingsGoal,
                is_setup_complete: true,
            });
            for (const sub of subscriptions) {
                await expenseService.addSubscription(sub.title, sub.amount, sub.category, sub.billing_day);
            }
            navigation.replace('ExpenseDashboard');
        } catch (e: any) { Alert.alert('Save failed', e.message); }
        finally { setSaving(false); }
    };

    const safeAllowance = Math.max(0, monthlyIncome - fixedCosts - savingsGoal);

    const TITLES = ['Monthly Income', 'Fixed Costs', 'Savings Goal', 'Recurring Subscriptions'];
    const SUBS = [
        'Jobs, allowance, stipends — your total monthly in.',
        'Rent, utilities, car payment — committed essentials.',
        'Money you want to stash away safely each month.',
        'Lifestyle apps auto-deducted on their billing day.',
    ];

    const ringSegment: 'income' | 'fixed' | 'savings' =
        step === 1 ? 'income' : step === 2 ? 'fixed' : 'savings';

    const inputStyle = {
        backgroundColor: C.raised, borderRadius: 14, padding: 14,
        fontSize: 15, color: C.ink, fontWeight: '500' as const,
        borderWidth: 1, borderColor: C.line, marginBottom: 10,
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas, paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* ── NAV BAR ── */}
            <View style={{
                paddingHorizontal: 20, paddingVertical: 14,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                borderBottomWidth: 1, borderBottomColor: C.line,
            }}>
                <TouchableOpacity
                    onPress={() => step > 1 ? handleBack() : navigation.goBack()}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    style={{ zIndex: 2 }}
                >
                    <ArrowLeft size={26} color="#1C1917" strokeWidth={2} />
                </TouchableOpacity>

                <StepPill current={step} total={4} />

                <View style={{
                    width: 44, height: 32, borderRadius: 10,
                    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1, borderColor: C.line,
                }}>
                    <Text style={{ color: C.muted, fontSize: 11, fontWeight: '700' }}>{step}/4</Text>
                </View>
            </View>

            {/* ── HEADING ── */}
            <Animated.View style={{
                paddingHorizontal: 22, paddingTop: 22, paddingBottom: 4,
                opacity: fadeAnim, transform: [{ translateY: slideAnim }],
            }}>
                <Text style={{ fontSize: 26, fontWeight: '700', color: C.ink, letterSpacing: -0.6, lineHeight: 32 }}>
                    {TITLES[step - 1]}
                </Text>
                <Text style={{ fontSize: 13, color: C.muted, marginTop: 5, lineHeight: 20, fontWeight: '500' }}>
                    {SUBS[step - 1]}
                </Text>
            </Animated.View>

            {/* ── STEP CONTENT ── */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                {/* ── STEPS 1–3: SHARED RING + STEP-SPECIFIC INPUT ── */}
                {step <= 3 && (
                    <KeyboardAwareScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid={true}
                        extraHeight={Platform.OS === 'ios' ? 60 : 40}
                        extraScrollHeight={Platform.OS === 'ios' ? 60 : 40}
                    >
                        {/* Ring is always visible — updates live as user types */}
                        <View style={{ alignItems: 'center', marginTop: 16 }}>
                            <UnifiedBudgetRing
                                income={monthlyIncome}
                                fixed={fixedCosts}
                                savings={savingsGoal}
                                activeSegment={ringSegment}
                            />
                            <RingLegend
                                income={monthlyIncome}
                                fixed={fixedCosts}
                                savings={savingsGoal}
                                activeSegment={ringSegment}
                            />
                        </View>

                        {/* Step 1 — Income */}
                        {step === 1 && (
                            <AmountInputCard
                                value={incomeText}
                                onChangeText={handleIncomeChange}
                                color={C.emerald}
                                hint="Enter your total monthly take-home pay."
                            />
                        )}

                        {/* Step 2 — Fixed Costs */}
                        {step === 2 && (
                            <>
                                <AmountInputCard
                                    value={fixedText}
                                    onChangeText={handleFixedChange}
                                    color={C.blue}
                                    hint="Rent, utilities, loan payments — anything locked in."
                                />
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 10 }}>
                                    <Text style={{ fontSize: 12, color: C.ghost, fontWeight: '500' }}>Remaining after fixed</Text>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: fixedCosts > monthlyIncome ? C.red : C.emerald }}>
                                        {CUR_SYM}{Math.max(0, monthlyIncome - fixedCosts).toLocaleString()}
                                    </Text>
                                </View>
                                {fixedCosts > monthlyIncome && (
                                    <Text style={{ fontSize: 12, color: C.red, fontWeight: '600', marginTop: 6, paddingHorizontal: 4 }}>
                                        ⚠️ Fixed costs exceed your income.
                                    </Text>
                                )}
                            </>
                        )}

                        {/* Step 3 — Savings + Summary */}
                        {step === 3 && (
                            <>
                                <AmountInputCard
                                    value={savingsText}
                                    onChangeText={handleSavingsChange}
                                    color={C.purple}
                                    hint="Pay yourself first — set aside savings before spending."
                                />

                                {savingsGoal > monthlyIncome - fixedCosts && (
                                    <Text style={{ fontSize: 12, color: C.red, fontWeight: '600', marginTop: 10, paddingHorizontal: 4 }}>
                                        ⚠️ Savings exceed remaining income after fixed costs.
                                    </Text>
                                )}

                                {/* Summary breakdown card */}
                                <View style={[card, { padding: 18, marginTop: 16, gap: 10 }]}>
                                    <Label style={{ marginBottom: 2 }}>Budget Summary</Label>
                                    {[
                                        { label: 'Income', val: `+${CUR_SYM}${monthlyIncome.toLocaleString()}`, color: C.ink },
                                        { label: 'Fixed / Committed', val: `-${CUR_SYM}${fixedCosts.toLocaleString()}`, color: C.blue },
                                        { label: 'Savings', val: `-${CUR_SYM}${savingsGoal.toLocaleString()}`, color: C.purple },
                                    ].map(row => (
                                        <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '500' }}>{row.label}</Text>
                                            <Text style={{ color: row.color, fontWeight: '700', fontSize: 13 }}>{row.val}</Text>
                                        </View>
                                    ))}
                                    <Divider style={{ marginVertical: 4 }} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: C.emerald, fontWeight: '700', fontSize: 15 }}>Safe Monthly</Text>
                                        <Text style={{ color: C.emerald, fontWeight: '700', fontSize: 18, letterSpacing: -0.5 }}>
                                            {CUR_SYM}{safeAllowance.toFixed(0)}/mo
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </KeyboardAwareScrollView>
                )}

                {/* ── STEP 4: RECURRING SUBSCRIPTIONS ── */}
                {step === 4 && (
                    <KeyboardAwareScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        enableOnAndroid={true}
                        extraHeight={Platform.OS === 'ios' ? 80 : 40}
                        extraScrollHeight={Platform.OS === 'ios' ? 80 : 40}
                    >
                        {/* Same ring at top — shows final budget locked in, fully dim to show it's complete */}
                        <View style={{ alignItems: 'center', marginTop: 16 }}>
                            <UnifiedBudgetRing
                                income={monthlyIncome}
                                fixed={fixedCosts}
                                savings={savingsGoal}
                                activeSegment="savings"
                            />
                            <RingLegend
                                income={monthlyIncome}
                                fixed={fixedCosts}
                                savings={savingsGoal}
                                activeSegment="savings"
                            />
                        </View>

                        {/* Budget locked-in confirmation strip */}
                        <View style={[card, { marginTop: 16, marginBottom: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.emeraldMid, borderColor: C.emerald + '30' }]}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.emerald, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 16 }}>✓</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: C.emerald }}>Budget locked in</Text>
                                <Text style={{ fontSize: 12, color: C.emerald, opacity: 0.75, marginTop: 1, fontWeight: '500' }}>
                                    {CUR_SYM}{safeAllowance.toLocaleString()}/mo to spend freely
                                </Text>
                            </View>
                        </View>

                        {/* Subscriptions list — grouped inside one card like the tx list on dashboard */}
                        {subscriptions.length > 0 && (
                            <View style={{ marginBottom: 12 }}>
                                <Label style={{ marginBottom: 10, marginLeft: 2 }}>Added</Label>
                                <View style={[card, { overflow: 'hidden', padding: 0 }]}>
                                    {subscriptions.map((s, i) => {
                                        const suffix = [1, 21, 31].includes(s.billing_day) ? 'st'
                                            : [2, 22].includes(s.billing_day) ? 'nd'
                                                : [3, 23].includes(s.billing_day) ? 'rd' : 'th';
                                        return (
                                            <View
                                                key={i}
                                                style={{
                                                    flexDirection: 'row', alignItems: 'center',
                                                    padding: 16,
                                                    borderBottomWidth: i < subscriptions.length - 1 ? 1 : 0,
                                                    borderBottomColor: C.line,
                                                }}
                                            >
                                                {/* Icon bubble */}
                                                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                                                    <Text style={{ fontSize: 18 }}>💡</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{s.title}</Text>
                                                    <Text style={{ fontSize: 12, color: C.ghost, fontWeight: '500', marginTop: 1 }}>
                                                        Every {s.billing_day}{suffix} of the month
                                                    </Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>
                                                        −{CUR_SYM}{s.amount}
                                                    </Text>
                                                    <TouchableOpacity onPress={() => setSubscriptions(prev => prev.filter((_, idx) => idx !== i))}>
                                                        <Text style={{ fontSize: 11, color: C.ghost, fontWeight: '600' }}>Remove</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Add form */}
                        <Label style={{ marginBottom: 10, marginLeft: 2 }}>Add Subscription</Label>
                        <View style={[card, { padding: 16, gap: 10 }]}>
                            {/* Name */}
                            <View>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: C.ghost, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, marginLeft: 2 }}>Service Name</Text>
                                <View style={{
                                    backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                                    borderWidth: 1, borderColor: C.line,
                                }}>
                                    <TextInput
                                        value={newSubTitle}
                                        onChangeText={setNewSubTitle}
                                        placeholder="Netflix, Spotify…"
                                        placeholderTextColor={C.ghost}
                                        style={{ fontSize: 15, color: C.ink, padding: 0, margin: 0, lineHeight: 20 }}
                                    />
                                </View>
                            </View>
                            {/* Amount + Billing date row */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {/* Monthly cost */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.ghost, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, marginLeft: 2 }}>Monthly Cost</Text>
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                                        borderWidth: 1, borderColor: C.line,
                                    }}>
                                        <Text style={{ color: C.lineMid, fontSize: 16, fontWeight: '300', marginRight: 4 }}>{CUR_SYM}</Text>
                                        <TextInput
                                            value={newSubAmount}
                                            onChangeText={setNewSubAmount}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                            placeholderTextColor={C.lineMid}
                                            style={{ flex: 1, fontSize: 15, color: C.ink, padding: 0, margin: 0 }}
                                        />
                                    </View>
                                </View>
                                {/* Billing date */}
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: C.ghost, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6, marginLeft: 2 }}>Billing Date</Text>
                                    <View style={{
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: C.raised, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
                                        borderWidth: 1, borderColor: C.line,
                                    }}>
                                        <TextInput
                                            value={newSubDay}
                                            onChangeText={t => setNewSubDay(t.replace(/[^0-9]/g, ''))}
                                            placeholder="1 – 31"
                                            keyboardType="number-pad"
                                            maxLength={2}
                                            placeholderTextColor={C.lineMid}
                                            style={{ flex: 1, fontSize: 15, color: C.ink, padding: 0, margin: 0 }}
                                        />
                                        <Text style={{ color: C.ghost, fontSize: 12, fontWeight: '500' }}>of month</Text>
                                    </View>
                                </View>
                            </View>
                            {/* Add button — same emerald as the CTA for consistency */}
                            <TouchableOpacity
                                onPress={() => {
                                    const amount = Number(newSubAmount);
                                    const day = Number(newSubDay);
                                    if (newSubTitle && !isNaN(amount) && amount > 0 && !isNaN(day) && day >= 1 && day <= 31) {
                                        setSubscriptions([...subscriptions, { title: newSubTitle, amount, category: 'bills', billing_day: day }]);
                                        setNewSubTitle(''); setNewSubAmount(''); setNewSubDay('');
                                    } else { Alert.alert('Invalid', 'Please check the subscription details.'); }
                                }}
                                style={{
                                    height: 48, borderRadius: 14,
                                    backgroundColor: C.emerald,
                                    alignItems: 'center', justifyContent: 'center',
                                    shadowColor: C.emerald, shadowOffset: { width: 0, height: 3 },
                                    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
                                }}
                            >
                                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 }}>
                                    + Add Subscription
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Skip hint when no subs added */}
                        {subscriptions.length === 0 && (
                            <Text style={{ textAlign: 'center', color: C.ghost, fontSize: 12, fontWeight: '500', marginTop: 14 }}>
                                No subscriptions yet — you can always add them later.
                            </Text>
                        )}
                    </KeyboardAwareScrollView>
                )}
            </Animated.View>

            {/* ── CTA ── */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12 }}>
                <TouchableOpacity
                    onPress={step === 4 ? handleFinish : handleContinue}
                    disabled={saving}
                    style={{
                        height: 54, borderRadius: 16,
                        backgroundColor: saving ? C.tint : C.emerald,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: C.emerald,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: saving ? 0 : 0.28,
                        shadowRadius: 16, elevation: 6,
                    }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.3 }}>
                        {saving ? 'Saving…' : step === 4 ? 'Launch Wallet →' : 'Continue →'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ExpenseSetupScreen;