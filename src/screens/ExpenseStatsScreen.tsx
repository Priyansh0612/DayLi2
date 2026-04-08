import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView,
    ActivityIndicator, StatusBar, Dimensions, Animated, Platform, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { expenseService, Transaction, UserBudget } from '../services/expenseService';
import { DEFAULT_CATEGORIES, CategoryIcon, groupTransactionsByDate, CUR_SYM } from '../utils/expenseDashboardUtils';
import { TxRow } from '../components/Expense/TxRow';
import { ReceiptDetailsModal } from '../components/Expense/ReceiptDetailsModal';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── DATE HELPERS ───
const getLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ─── SHARED DESIGN TOKENS (DayLi Wallet) ────────────────────────
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
    amberBg: '#FFFBEB',
    red: '#DC2626',
    redBg: '#FEF2F2',
    blue: '#2563EB',
    terracotta: '#D47B5A',
};

const card = {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
};

const Label = ({ children, style }: { children: string; style?: any }) => (
    <Text className="font-body-bold" style={[{
        fontSize: 10,
        letterSpacing: 1.6, textTransform: 'uppercase', color: C.ghost,
    }, style]}>
        {children}
    </Text>
);

export default function ExpenseStatsScreen() {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [loading, setLoading] = useState(true);
    const [budget, setBudget] = useState<UserBudget | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [prevMonthTransactions, setPrevMonthTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
    const [showTxsModal, setShowTxsModal] = useState(false);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

    // State for viewing historical months (0 = current month, -1 = last month, etc.)
    const [monthOffset, setMonthOffset] = useState(0);

    // Animation for changing months
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const fetchData = async (offset: number) => {
        try {
            setLoading(true);

            const now = new Date();
            const targetYear = now.getFullYear();
            const targetMonth = now.getMonth() + offset;
            const targetDate = new Date(targetYear, targetMonth, 1);
            const targetMonthStr = getLocalYYYYMMDD(targetDate).slice(0, 7);

            // Fetch the budget stringently tied to the historical month
            const b = await expenseService.fetchUserBudget(targetMonthStr);
            setBudget(b);

            const customCats = await expenseService.fetchCustomCategories();
            setCategories([...DEFAULT_CATEGORIES, ...customCats]);

            // Generate clean local strings for the database
            const startOfMonthStr = getLocalYYYYMMDD(targetDate);
            const endOfMonthStr = getLocalYYYYMMDD(new Date(targetYear, targetMonth + 1, 0)) + 'T23:59:59.999Z';

            const txs = await expenseService.fetchTransactions(startOfMonthStr, endOfMonthStr);
            setTransactions(txs);

            const prevMonth = targetMonth - 1;
            const startOfPrevStr = getLocalYYYYMMDD(new Date(targetYear, prevMonth, 1));
            const endOfPrevStr = getLocalYYYYMMDD(new Date(targetYear, prevMonth + 1, 0)) + 'T23:59:59.999Z';

            const prevTxs = await expenseService.fetchTransactions(startOfPrevStr, endOfPrevStr);
            setPrevMonthTransactions(prevTxs);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => setLoading(false));
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData(monthOffset);
        }, [monthOffset])
    );

    const barWidthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!loading && budget) {
            const total = transactions.reduce((sum, t) => sum + t.amount, 0);
            const allowance = budget.safe_allowance || 0;
            const pct = allowance > 0 ? Math.min(total / allowance, 1) : 0;

            Animated.spring(barWidthAnim, {
                toValue: pct * 100,
                bounciness: 8,
                useNativeDriver: false,
            }).start();
        }
    }, [transactions, loading, budget]);

    const changeMonth = (direction: -1 | 1) => {
        if (monthOffset + direction > 0) return; // Prevent going into the future
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
        }).start(() => {
            setMonthOffset(prev => prev + direction);
        });
    };

    if (!budget && loading) {
        return (
            <View style={{ flex: 1, backgroundColor: C.canvas, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top }}>
                <ActivityIndicator color={C.emerald} size="large" />
            </View>
        );
    }

    // --- MATH & DATA PREP ---
    const totalMonthSpend = transactions.reduce((sum, t) => sum + t.amount, 0);
    const monthlyAllowance = budget?.safe_allowance || 0;
    const remainingInMonth = monthlyAllowance - totalMonthSpend;
    const budgetPct = monthlyAllowance > 0 ? Math.min(totalMonthSpend / monthlyAllowance, 1) : 0;

    // Aggregate category totals
    const catTotals: Record<string, number> = {};
    transactions.forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });

    const sortedCats = Object.entries(catTotals)
        .map(([id, total]) => {
            const catDef = categories.find(c => c.id === id || c.label === id) || DEFAULT_CATEGORIES[0];
            return { ...catDef, total };
        })
        .sort((a, b) => b.total - a.total);

    // Get display string for the currently viewed month
    const displayDate = new Date();
    displayDate.setDate(1); // Prevent overflow on end of month days 
    displayDate.setMonth(displayDate.getMonth() + monthOffset);
    const monthString = displayDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Status colors
    const progressColor = budgetPct >= 0.9 ? C.red : budgetPct >= 0.75 ? C.amber : C.emerald;

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* ─── HEADER ─── */}
            <View style={{ backgroundColor: C.surface, zIndex: 10, borderBottomWidth: 1, borderBottomColor: C.line, paddingTop: insets.top }}>
                <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 16 }}>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, height: 40 }}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                            style={{ zIndex: 2 }}
                        >
                            <ArrowLeft size={26} color={C.ink} strokeWidth={2} />
                        </TouchableOpacity>
                        
                        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1 }} pointerEvents="none">
                            <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, letterSpacing: 1.5, textTransform: 'uppercase' }}>Insights</Text>
                        </View>

                        <View style={{ width: 40 }} />
                    </View>

                    {/* Month Selector */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.raised, borderRadius: 16, padding: 6, borderWidth: 1, borderColor: C.line }}>
                        <TouchableOpacity
                            onPress={() => changeMonth(-1)}
                            style={{ padding: 12 }}
                        >
                            <ChevronLeft size={20} color={C.inkMid} />
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Calendar size={16} color={C.ghost} />
                            <Text className="font-body-bold" style={{ fontSize: 14, color: C.ink }}>{monthString}</Text>
                        </View>

                        <TouchableOpacity
                            onPress={() => changeMonth(1)}
                            disabled={monthOffset === 0}
                            style={{ padding: 12, opacity: monthOffset === 0 ? 0.3 : 1 }}
                        >
                            <ChevronRight size={20} color={C.inkMid} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                {loading ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <ActivityIndicator color={C.emerald} size="large" />
                    </View>
                ) : (
                    <Animated.View style={{ opacity: fadeAnim }}>

                        {/* ─── SUMMARY CARD ─── */}
                        <View style={[card, { padding: 24, marginBottom: 24 }]}>
                            <Label style={{ marginBottom: 16, textAlign: 'center' }}>Monthly Performance</Label>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                                <View>
                                    <Text className="font-body uppercase tracking-widest text-[11px]" style={{ color: C.muted, marginBottom: 4 }}>Total Spent</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                        <Text className="font-body" style={{ color: C.muted, fontSize: 16, marginTop: 4, marginRight: 2 }}>{CUR_SYM}</Text>
                                        <Text className="font-heading" style={{ color: C.ink, fontSize: 36, letterSpacing: -1 }}>
                                            {totalMonthSpend.toFixed(0)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text className="font-body uppercase tracking-widest text-[11px]" style={{ color: C.muted, marginBottom: 4 }}>Remaining</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        {(() => {
                                            const totalPrev = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
                                            if (totalPrev > 0) {
                                                const diff = totalMonthSpend - totalPrev;
                                                const pct = (diff / totalPrev) * 100;
                                                const isBetter = pct < 0;
                                                return (
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: isBetter ? C.emerald : C.red }}>
                                                        {isBetter ? '↓' : '↑'} {Math.abs(pct).toFixed(0)}%
                                                    </Text>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <Text className="font-heading" style={{ color: remainingInMonth < 0 ? C.red : C.emerald, fontSize: 20 }}>
                                            {CUR_SYM}{Math.max(0, remainingInMonth).toFixed(0)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={{ height: 8, backgroundColor: C.tint, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                                <Animated.View style={{
                                    width: barWidthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
                                    height: '100%',
                                    backgroundColor: progressColor,
                                    borderRadius: 4
                                }} />
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="font-body" style={{ color: C.ghost, fontSize: 12 }}>{(budgetPct * 100).toFixed(0)}% used</Text>
                                <Text className="font-body" style={{ color: C.ghost, fontSize: 12 }}>Budget: {CUR_SYM}{monthlyAllowance.toFixed(0)}</Text>
                            </View>
                        </View>

                        {/* ─── MACRO METRIC PILLS ─── */}
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                            <View style={[card, { flex: 1, padding: 16, alignItems: 'center', backgroundColor: C.surface }]}>
                                <Text className="font-body uppercase tracking-widest text-[10px]" style={{ color: C.muted, marginBottom: 4 }}>Avg. Daily Spend</Text>
                                <Text className="font-heading" style={{ fontSize: 20, color: C.ink }}>
                                    {CUR_SYM}{(totalMonthSpend / (monthOffset === 0 ? new Date().getDate() : new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate())).toFixed(2)}
                                </Text>
                            </View>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowTxsModal(true)} style={[card, { flex: 1, padding: 16, alignItems: 'center', backgroundColor: C.surface }]}>
                                <Text className="font-body uppercase tracking-widest text-[10px]" style={{ color: C.muted, marginBottom: 4 }}>Transactions</Text>
                                <Text className="font-heading" style={{ fontSize: 20, color: C.ink }}>{transactions.length}</Text>
                                <Text className="font-body-bold" style={{ fontSize: 10, color: C.emerald, marginTop: 4 }}>VIEW ALL</Text>
                            </TouchableOpacity>
                        </View>

                        {/* ─── BIGGEST HIT ─── */}
                        {transactions.length > 0 && (() => {
                            const biggest = [...transactions].sort((a, b) => b.amount - a.amount)[0];
                            return (
                                <View style={[card, { padding: 20, marginBottom: 24, backgroundColor: C.ink }]}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: C.ghost, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>Biggest Transaction</Text>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>{biggest.title}</Text>
                                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                                                Logged on {new Date(
                                                    biggest.date.includes('T')
                                                        ? biggest.date
                                                        : `${biggest.date}T12:00:00`
                                                ).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 24, fontWeight: '800', color: C.emeraldLight }}>{CUR_SYM}{biggest.amount.toFixed(2)}</Text>
                                    </View>
                                </View>
                            );
                        })()}

                        {/* ─── SPENDING BREAKDOWN ─── */}
                        <Label style={{ marginBottom: 12, marginLeft: 4 }}>Spending Breakdown</Label>

                        {sortedCats.length === 0 ? (
                            <View style={{ padding: 30, alignItems: 'center', backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.line }}>
                                <Text className="font-body" style={{ color: C.ghost, fontSize: 14 }}>No spending recorded for this month.</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {sortedCats.map((cat, idx) => {
                                    const pct = totalMonthSpend > 0 ? (cat.total / totalMonthSpend) * 100 : 0;

                                    return (
                                        <View key={cat.id} style={[card, { padding: 16 }]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                                                        <CategoryIcon name={cat.icon} size={22} color={C.inkMid} />
                                                    </View>
                                                    <View>
                                                        <Text className="font-body-bold" style={{ fontSize: 15, color: C.ink, marginBottom: 2 }}>{cat.label}</Text>
                                                        <Text className="font-body" style={{ color: C.ghost, fontSize: 12 }}>{pct.toFixed(1)}% of total</Text>
                                                    </View>
                                                </View>
                                                <Text className="font-heading" style={{ fontSize: 16, color: C.ink }}>
                                                    {CUR_SYM}{cat.total.toFixed(2)}
                                                </Text>
                                            </View>

                                            <View style={{ width: '100%', height: 6, backgroundColor: C.tint, borderRadius: 3, overflow: 'hidden' }}>
                                                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: C.emerald, borderRadius: 3 }} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                    </Animated.View>
                )}
            </ScrollView>

            {/* ─── TRANSACTIONS MODAL ─── */}
            <Modal visible={showTxsModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowTxsModal(false)}>
                <View style={{ flex: 1, backgroundColor: C.canvas, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface }}>
                        <Text className="font-heading" style={{ fontSize: 18, color: C.ink }}>{monthString} History</Text>
                        <TouchableOpacity onPress={() => setShowTxsModal(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' }}>
                            <X size={20} color={C.inkMid} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
                        {transactions.length === 0 ? (
                            <View style={{ padding: 40, alignItems: 'center' }}>
                                <Text className="font-body" style={{ color: C.ghost, fontSize: 15 }}>No transactions logged this month.</Text>
                            </View>
                        ) : (
                            groupTransactionsByDate(transactions, getLocalYYYYMMDD(new Date())).map((group, groupIdx) => (
                                <View key={group.title} style={{ marginBottom: 24 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, marginLeft: 6 }}>
                                        <Text className="font-body-bold" style={{ fontSize: 11, letterSpacing: 1.5, color: C.ghost, textTransform: 'uppercase' }}>
                                            {group.title}
                                        </Text>
                                        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
                                    </View>
                                    <View style={[card, { overflow: 'hidden', padding: 0 }]}>
                                        {group.data.map((tx, txIdx) => {
                                            const cat = categories.find(c => c.id === tx.category || c.label === tx.category) || DEFAULT_CATEGORIES[0];
                                            return (
                                                <TxRow
                                                    key={tx.id}
                                                    tx={tx}
                                                    cat={cat}
                                                    isToday={false}
                                                    onPress={() => {
                                                        if (tx.receipt_id) setSelectedReceiptId(tx.receipt_id);
                                                    }}
                                                    hasReceipt={!!tx.receipt_id}
                                                    isLast={txIdx === group.data.length - 1}
                                                    animDelay={txIdx * 30}
                                                />
                                            );
                                        })}
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>

                    {/* ─── READ-ONLY RECEIPT MODAL (Nested to avoid iOS dismissal bug) ─── */}
                    <ReceiptDetailsModal
                        visible={!!selectedReceiptId}
                        receiptId={selectedReceiptId}
                        onClose={() => setSelectedReceiptId(null)}
                    />
                </View>
            </Modal>
        </View>
    );
}
