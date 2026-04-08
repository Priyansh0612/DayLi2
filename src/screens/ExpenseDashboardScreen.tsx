import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, ActivityIndicator,
    StatusBar, Animated, Dimensions, Platform, FlatList
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Settings, BarChart2, ImagePlus, ScanLine, SquarePen, Plus, Zap, CheckCircle, ShoppingBag, ChevronDown } from 'lucide-react-native';
import { format } from 'date-fns';
import { useExpenseDashboard } from '../hooks/useExpenseDashboard';
import { ExpenseContentSkeleton } from '../components/SkeletonLoaders';
import { TxRow } from '../components/Expense/TxRow';
import { QuickAddModal } from '../components/Expense/QuickAddModal';
import { ReceiptDetailsModal } from '../components/Expense/ReceiptDetailsModal';
import { ReceiptReviewModal } from '../components/Expense/ReceiptReviewModal';
import { C, Label, CUR_SYM } from '../utils/expenseDashboardUtils';

const { width: SW, height: SH } = Dimensions.get('window');

const ExpenseDashboardScreen = () => {
    const insets = useSafeAreaInsets();
    const {
        navigation,
        budget, transactions, loading, activeTab, setActiveTab, categories,
        insights,
        now,
        isFabOpen, fabAnim, toggleFab, closeFabAndRun,
        isAddModalOpen, setIsAddModalOpen, editingTransaction, setEditingTransaction,
        selectedReceiptId, setSelectedReceiptId, scannedReceiptData, setScannedReceiptData,
        isScanning, pendingDeleteVisible, pendingDeleteRef,
        handleDelete, handleUndoDelete, handleLogExpense, handleConfirmReceipt,
        handleScanReceipt, handleUploadReceipt
    } = useExpenseDashboard();

    const [isSubsExpanded, setIsSubsExpanded] = useState(false);
    const scrollY = useRef(new Animated.Value(0)).current;
    const tabUnderlineAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(tabUnderlineAnim, {
            toValue: activeTab === 'insights' ? 0 : 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
        }).start();
    }, [activeTab]);

    if (!loading && (!budget || !insights)) return null;

    const {
        todayStr, totalMonthSpend, remainingInMonth, daysInMonth,
        safeDailySpend, statusColor, groupedTransactions,
        needsPct, wantsPct, nextSub, biggestHit, weeks,
        topCategories, subTotalDrain, detailedSubs
    } = insights ?? {};


    // --- FAB ANIMATION LOGIC ---
    const mainRotation = fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
    const backdropOpacity = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] });
    const action1Style = { opacity: fabAnim, transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -75] }) }, { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] };
    const action2Style = { opacity: fabAnim, transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -135] }) }, { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] };
    const action3Style = { opacity: fabAnim, transform: [{ translateY: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -195] }) }, { scale: fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] };

    const card = {
        backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.line,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4,
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.canvas }}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            <LinearGradient
                colors={['#1E3520', '#2F5233', '#567D62']}
                start={{ x: 0.1, y: 0.1 }} end={{ x: 1, y: 1.2 }}
                style={{ paddingBottom: 0 }}
            >
                <View style={{ paddingTop: insets.top }}>
                    {/* Header Controls */}
                    <View style={{
                        paddingHorizontal: 22, paddingTop: Platform.OS === 'android' ? 8 : 8,
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        marginBottom: 12, height: 48,
                    }}>
                        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} style={{ zIndex: 2 }}>
                            <ArrowLeft size={26} color="#fff" strokeWidth={2} />
                        </TouchableOpacity>

                        <View style={{ position: 'absolute', left: 0, right: 0, top: 8, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 1 }} pointerEvents="none">
                            <Text style={{ color: '#86A789', fontWeight: '800', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' }}>Wallet</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 2 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('ExpenseStats')}>
                                <BarChart2 size={20} color="#fff" strokeWidth={2} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('ExpenseSettings')}>
                                <Settings size={20} color="#fff" strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Hero Metrics */}
                    <View style={{ alignItems: 'center', paddingHorizontal: 22, paddingBottom: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '800', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 8 }}>Safe to Spend Today</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                            {loading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 }}>
                                    <View style={{ width: 30, height: 50, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                                    <View style={{ width: 140, height: 80, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                                </View>
                            ) : (
                                <>
                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 28, fontFamily: 'Outfit_700Bold', marginTop: 10, marginRight: 2 }}>{CUR_SYM}</Text>
                                    <Text style={{ color: '#fff', fontSize: 80, fontFamily: 'Outfit_700Bold', fontVariant: ['tabular-nums'] }}>{safeDailySpend?.toFixed(0) ?? '—'}</Text>
                                </>
                            )}
                        </View>
                        {loading ? (
                            <View style={{ width: 220, height: 14, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                        ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '500' }}>
                                <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontFamily: 'Outfit_700Bold' }}>{CUR_SYM}{Math.max(0, remainingInMonth ?? 0).toFixed(0)}</Text> left this month · Day {now.getDate()} of {daysInMonth ?? '—'}
                            </Text>
                        )}
                    </View>

                    {/* Glass Stats Card */}
                    <View style={{ paddingHorizontal: 22, marginTop: 16 }}>
                        <BlurView intensity={20} tint="light" style={{ overflow: 'hidden', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderBottomWidth: 0, backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
                            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)' }}>
                                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }}>
                                    {loading ? <View style={{ width: 80, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 4 }} /> : <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>{CUR_SYM}{totalMonthSpend?.toFixed(0)}</Text>}
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Spent</Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
                                    {loading ? <View style={{ width: 100, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 4 }} /> : <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Outfit_700Bold', marginBottom: 4 }}>{CUR_SYM}{(totalMonthSpend / Math.max(now.getDate(), 1)).toFixed(0)}/day</Text>}
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>Avg. Daily</Text>
                                </View>
                            </View>
                        </BlurView>
                    </View>
                </View>
            </LinearGradient>

            {/* Sticky Tab Bar */}
            <View style={{ backgroundColor: C.canvas, zIndex: 10, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 22, paddingTop: 6 }}>
                    {(['insights', 'transactions'] as const).map((tab) => (
                        <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }} activeOpacity={0.7}>
                            <Text style={{ fontSize: 16, fontWeight: activeTab === tab ? '700' : '500', color: activeTab === tab ? C.emerald : C.ghost, letterSpacing: -0.2 }}>
                                {tab === 'insights' ? 'Insights' : 'Transactions'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Animated.View style={{ height: 3, width: (SW - 44) / 2, backgroundColor: C.emerald, borderRadius: 2, marginLeft: 22, transform: [{ translateX: tabUnderlineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, (SW - 44) / 2] }) }] }} />
            </View>

            {/* Scrollable Content */}
            {loading ? (
                <ExpenseContentSkeleton />
            ) : (
            <Animated.ScrollView
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
                contentContainerStyle={{ paddingTop: 20, paddingBottom: 90, flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >

                <View style={{ backgroundColor: C.canvas, paddingHorizontal: 20, paddingTop: 10 }}>

                    {/* Insights Tab */}
                    {activeTab === 'insights' && (
                        <View style={{ paddingTop: 8 }}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                style={{ marginHorizontal: -20 }} 
                                contentContainerStyle={{ 
                                    gap: 12, 
                                    paddingHorizontal: 20, 
                                    paddingBottom: 24 
                                }}
                                snapToInterval={(SW * 0.42) + 12}
                                snapToAlignment="start"
                                decelerationRate="fast"
                            >
                                {/* Widget 1 - Weekly Pacing */}
                                <View style={[card, { width: SW * 0.42, height: SW * 0.42, padding: 16, justifyContent: 'space-between' }]}>
                                    <View>
                                        <Text style={{ color: C.ghost, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>This Week</Text>
                                        <Text style={{ color: C.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 4 }}>{CUR_SYM}{weeks[0].weekTotal.toFixed(0)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 50 }}>
                                        {weeks[0].dataValues.map((val: number, i: number) => {
                                            const rawDay = new Date().getDay();
                                            const todayIndex = (rawDay === 0 ? 7 : rawDay) - 1;
                                            const isToday = i === todayIndex;
                                            return (
                                                <View key={i} style={{ alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                                    <View style={{ width: 8, height: `${Math.max((val / weeks[0].weekMax) * 75, 12)}%`, backgroundColor: isToday ? C.emerald : C.tint, borderRadius: 4, marginBottom: 4 }} />
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: isToday ? C.emerald : C.ghost }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Widget 2 - Spending Mix */}
                                <View style={[card, { width: SW * 0.42, height: SW * 0.42, padding: 16, justifyContent: 'space-between' }]}>
                                    <View>
                                        <Text style={{ color: C.ghost, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Spending Mix</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                            <Text style={{ color: C.emerald, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>{needsPct.toFixed(0)}%</Text>
                                            <Text style={{ color: C.ghost, fontSize: 14, fontWeight: '600', marginLeft: 4 }}>Need</Text>
                                        </View>
                                    </View>
                                    <View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text style={{ color: C.muted, fontSize: 10, fontWeight: '600' }}>Essentials</Text>
                                            <Text style={{ color: C.muted, fontSize: 10, fontWeight: '600' }}>Lifestyle</Text>
                                        </View>
                                        <View style={{ height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                                            <View style={{ width: `${needsPct}%`, height: '100%', backgroundColor: C.emerald }} />
                                            <View style={{ width: `${wantsPct}%`, height: '100%', backgroundColor: C.amber }} />
                                        </View>
                                    </View>
                                </View>

                                {/* Widget 3 - Upcoming */}
                                <View style={[card, { width: SW * 0.42, height: SW * 0.42, padding: 16, justifyContent: 'space-between' }]}>
                                    <View>
                                        <Text style={{ color: C.ghost, fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' }}>Upcoming</Text>
                                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.emeraldMid, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                                            {nextSub ? <Zap size={16} color={C.emerald} strokeWidth={2.5} /> : <CheckCircle size={16} color={C.emerald} strokeWidth={2.5} />}
                                        </View>
                                    </View>
                                    <View>
                                        {nextSub ? (
                                            <>
                                                <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>{nextSub.title}</Text>
                                                <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{CUR_SYM}{nextSub.amount.toFixed(2)} · In {nextSub.daysAway} {nextSub.daysAway === 1 ? 'day' : 'days'}</Text>
                                            </>
                                        ) : (
                                            <>
                                                <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }}>No bills</Text>
                                                <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginTop: 2 }}>You're all clear</Text>
                                            </>
                                        )}
                                    </View>
                                </View>
                            </ScrollView>
                            


                            {/* ── SUBSCRIPTION ROLL-UP ── */}
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => setIsSubsExpanded(!isSubsExpanded)}
                                style={[card, { padding: 20, marginBottom: 24 }]}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                                        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(99,102,241,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' }}>
                                            <Zap size={18} color="#6366f1" strokeWidth={2.5} />
                                        </View>
                                        <View>
                                            <Text style={{ color: C.ink, fontSize: 15, fontWeight: '700' }}>Active Subscriptions</Text>
                                            <Text style={{ color: C.muted, fontSize: 12, fontWeight: '500', marginTop: 2 }}>{CUR_SYM}{subTotalDrain.toFixed(2)} / month drain</Text>
                                        </View>
                                    </View>
                                    <ChevronDown size={20} color={C.ghost} style={{ transform: [{ rotate: isSubsExpanded ? '180deg' : '0deg' }] }} />
                                </View>

                                {isSubsExpanded && (
                                    <View style={{ marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', gap: 14 }}>
                                        {detailedSubs?.length > 0 ? detailedSubs.map((sub: any, idx: number) => (
                                            <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ color: C.ink, fontSize: 13, fontWeight: '600' }}>{sub.name}</Text>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>{CUR_SYM}{sub.amount.toFixed(2)}</Text>
                                                    <Text style={{ color: C.muted, fontSize: 10, fontWeight: '500', marginTop: 2 }}>Renews on the {sub.date}</Text>
                                                </View>
                                            </View>
                                        )) : (
                                            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '500' }}>No active subscriptions found.</Text>
                                        )}
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Biggest Hit */}
                            {biggestHit && (
                                <View style={{ backgroundColor: C.ink, borderRadius: 28, padding: 24, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Biggest Transaction</Text>
                                        <Text style={{ color: C.surface, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 }}>{biggestHit.title}</Text>
                                        <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600', marginTop: 4 }}>Logged on {format(new Date(biggestHit.date), 'MMM d')}</Text>
                                    </View>
                                    <Text style={{ color: C.emeraldLight, fontSize: 26, fontWeight: '700', letterSpacing: -1 }}>{CUR_SYM}{biggestHit.amount.toFixed(2)}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Transactions Tab */}
                    {activeTab === 'transactions' && (
                        transactions.length === 0 ? (
                            <View style={{ padding: 60, alignItems: 'center', justifyContent: 'center' }}>
                                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                    <ShoppingBag size={48} color={C.ghost} strokeWidth={1.5} />
                                </View>
                                <Text style={{ color: C.ink, fontWeight: '700', fontSize: 20, marginBottom: 8, textAlign: 'center' }}>Clean slate!</Text>
                                <Text style={{ color: C.muted, fontWeight: '500', fontSize: 15, textAlign: 'center', lineHeight: 24, maxWidth: 260 }}>You haven't spent anything this month. Keep it up!</Text>
                            </View>
                        ) : (
                            groupedTransactions.map((group: any) => (
                                <View key={group.title} style={{ marginBottom: 24 }}>
                                    <Label style={{ marginBottom: 12, marginLeft: 4 }}>{group.title}</Label>
                                    <View style={{ backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
                                        {group.data.map((tx: any, idx: number) => {
                                            const cat = categories.find(c => c.id === tx.category || c.label === tx.category) || categories[0];
                                            const renderRightActions = () => (
                                                <TouchableOpacity onPress={() => handleDelete(tx.id)} disabled={pendingDeleteRef.current?.id === tx.id} style={{ width: 80, backgroundColor: C.red, justifyContent: 'center', alignItems: 'center', opacity: pendingDeleteRef.current?.id === tx.id ? 0.4 : 1 }}>
                                                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Delete</Text>
                                                </TouchableOpacity>
                                            );
                                            return (
                                                <Swipeable key={tx.id} renderRightActions={renderRightActions}>
                                                    <TxRow animDelay={idx * 50} isLast={idx === group.data.length - 1} tx={tx} cat={cat} isToday={tx.date.startsWith(todayStr)} hasReceipt={!!tx.receipt_id} onPress={() => { if (tx.receipt_id) setSelectedReceiptId(tx.receipt_id); else { setEditingTransaction(tx); setIsAddModalOpen(true); } }} />
                                                </Swipeable>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))
                        )
                    )}
                </View>
            </Animated.ScrollView>
            )}
            {/* Undo Toast */}
            {pendingDeleteVisible && (
                <View style={{ position: 'absolute', bottom: 110, left: 18, right: 18, backgroundColor: C.ink, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 10, zIndex: 100 }}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Item deleted</Text>
                    <TouchableOpacity onPress={handleUndoDelete}>
                        <Text style={{ color: C.emeraldLight, fontWeight: '800', fontSize: 14 }}>UNDO</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Backdrop */}
            {isFabOpen && (
                <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.ink, opacity: backdropOpacity, zIndex: 10 }}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={toggleFab} />
                </Animated.View>
            )}

            {/* FAB */}
            <View style={{ position: 'absolute', bottom: 36, right: 24, alignItems: 'center', zIndex: 11 }} pointerEvents="box-none">
                <Animated.View style={[{ position: 'absolute', bottom: 0, right: 0, alignItems: 'flex-end' }, action3Style]} pointerEvents={isFabOpen ? 'auto' : 'none'}>
                    <TouchableOpacity onPress={() => closeFabAndRun(handleUploadReceipt)} disabled={isScanning} style={{ height: 50, minWidth: 160, borderRadius: 25, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'flex-end', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, flexDirection: 'row', paddingRight: 6, paddingLeft: 20, gap: 12, borderWidth: 1, borderColor: C.line, opacity: isScanning ? 0.5 : 1 }}>
                        <Text style={{ fontWeight: '700', color: C.inkMid, fontSize: 13.5 }}>Upload Photo</Text>
                        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.emeraldMid, alignItems: 'center', justifyContent: 'center' }}>
                            {isScanning ? <ActivityIndicator color={C.emerald} size="small" /> : <ImagePlus size={18} color={C.emerald} strokeWidth={2.5} />}
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[{ position: 'absolute', bottom: 0, right: 0, alignItems: 'flex-end' }, action2Style]} pointerEvents={isFabOpen ? 'auto' : 'none'}>
                    <TouchableOpacity onPress={() => closeFabAndRun(handleScanReceipt)} disabled={isScanning} style={{ height: 50, minWidth: 160, borderRadius: 25, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'flex-end', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, flexDirection: 'row', paddingRight: 6, paddingLeft: 20, gap: 12, borderWidth: 1, borderColor: C.line, opacity: isScanning ? 0.5 : 1 }}>
                        <Text style={{ fontWeight: '700', color: C.inkMid, fontSize: 13.5 }}>Scan Receipt</Text>
                        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.emeraldMid, alignItems: 'center', justifyContent: 'center' }}>
                            {isScanning ? <ActivityIndicator color={C.emerald} size="small" /> : <ScanLine size={18} color={C.emerald} strokeWidth={2.5} />}
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[{ position: 'absolute', bottom: 0, right: 0, alignItems: 'flex-end' }, action1Style]} pointerEvents={isFabOpen ? 'auto' : 'none'}>
                    <TouchableOpacity onPress={() => closeFabAndRun(() => { setEditingTransaction(null); setIsAddModalOpen(true); })} style={{ height: 50, minWidth: 160, borderRadius: 25, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'flex-end', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, flexDirection: 'row', paddingRight: 6, paddingLeft: 20, gap: 12, borderWidth: 1, borderColor: C.line }}>
                        <Text style={{ fontWeight: '700', color: C.inkMid, fontSize: 13.5 }}>Manual Entry</Text>
                        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.emeraldMid, alignItems: 'center', justifyContent: 'center' }}>
                            <SquarePen size={18} color={C.emerald} strokeWidth={2.5} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity onPress={toggleFab} activeOpacity={0.8} style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.emerald, alignItems: 'center', justifyContent: 'center', shadowColor: C.emerald, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 6 }}>
                    {isScanning ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Animated.View style={{ transform: [{ rotate: mainRotation }], alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={32} color="#fff" strokeWidth={2.5} />
                        </Animated.View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modals */}
            <QuickAddModal visible={isAddModalOpen} initialData={editingTransaction} onClose={() => { setIsAddModalOpen(false); setEditingTransaction(null); }} onSave={handleLogExpense} categories={categories} />
            <ReceiptReviewModal visible={!!scannedReceiptData} data={scannedReceiptData} onClose={() => setScannedReceiptData(null)} onConfirm={handleConfirmReceipt} />
            <ReceiptDetailsModal visible={!!selectedReceiptId} receiptId={selectedReceiptId} onClose={() => setSelectedReceiptId(null)} onEditTransaction={data => setScannedReceiptData({ ...data, isEditingSavedReceipt: true })} />
        </View>
    );
};

export default ExpenseDashboardScreen;