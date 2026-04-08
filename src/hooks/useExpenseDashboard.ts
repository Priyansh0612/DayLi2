import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Animated, Alert } from 'react-native';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { expenseService, UserBudget, Transaction, RecurringSubscription } from '../services/expenseService';
import { useLiveTime } from './useLiveTime';
import { getLocalYYYYMMDD, DEFAULT_CATEGORIES, groupTransactionsByDate, PendingDelete, C } from '../utils/expenseDashboardUtils';

export const useExpenseDashboard = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { now, greeting } = useLiveTime();

    const [loading, setLoading] = useState(true);
    const [budget, setBudget] = useState<UserBudget | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);
    const [subscriptions, setSubscriptions] = useState<RecurringSubscription[]>([]);

    // FAB State
    const [isFabOpen, setIsFabOpen] = useState(false);
    const fabAnim = useRef(new Animated.Value(0)).current;

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedReceiptData, setScannedReceiptData] = useState<any>(null);

    const pendingDeleteRef = useRef<PendingDelete | null>(null);
    const [pendingDeleteVisible, setPendingDeleteVisible] = useState(false);

    // Guard: only process due subscriptions once per calendar day to avoid redundant API calls
    const lastSubCheckRef = useRef<string | null>(null);

    const [activeTab, setActiveTab] = useState<'insights' | 'transactions'>('insights');

    // 🔴 2. Add this auto-trigger effect:
    useEffect(() => {
        if (route.params?.autoTriggerScan) {
            navigation.setParams({ autoTriggerScan: undefined });
            setTimeout(() => {
                handleScanReceipt();
            }, 300);
        }
    }, [route.params?.autoTriggerScan, navigation]);

    const fetchData = useCallback(async () => {
        try {
            const b = await expenseService.fetchUserBudget();
            if (!b || !b.is_setup_complete) { navigation.replace('ExpenseSetup'); return; }
            setBudget(b);
            const customCats = await expenseService.fetchCustomCategories();
            setCategories([...DEFAULT_CATEGORIES, ...customCats]);

            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            const startStr = getLocalYYYYMMDD(ninetyDaysAgo);
            const endStr = getLocalYYYYMMDD(new Date()) + 'T23:59:59.999Z';

            const txs = await expenseService.fetchTransactions(startStr, endStr);

            setTransactions(() => {
                const pending = pendingDeleteRef.current;
                return pending ? txs.filter((t: any) => t.id !== pending.id) : txs;
            });

            const subs = await expenseService.fetchSubscriptions();
            setSubscriptions(subs || []);

            const todayStr = getLocalYYYYMMDD(new Date());
            if (lastSubCheckRef.current !== todayStr) {
                try {
                    await expenseService.processDueSubscriptions();
                    lastSubCheckRef.current = todayStr;
                } catch (e) { console.error('Sub processing error:', e); }
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [navigation]);

    useFocusEffect(useCallback(() => {
        fetchData();
    }, [fetchData]));

    // --- FAB ANIMATION LOGIC ---
    const toggleFab = () => {
        const toValue = isFabOpen ? 0 : 1;
        setIsFabOpen(!isFabOpen);
        Animated.spring(fabAnim, { toValue, friction: 5, tension: 50, useNativeDriver: true }).start();
    };

    const closeFabAndRun = (action: () => void) => {
        setIsFabOpen(false);
        Animated.timing(fabAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => { action(); });
    };

    // --- DELETION LOGIC ---
    const handleDelete = (id: string) => {
        if (pendingDeleteRef.current?.id === id) return;

        const txToDelete = transactions.find(t => t.id === id);
        if (!txToDelete) return;

        setTransactions(prev => prev.filter(t => t.id !== id));

        if (pendingDeleteRef.current?.timer) {
            clearTimeout(pendingDeleteRef.current.timer);
        }

        const timer = setTimeout(async () => {
            if (pendingDeleteRef.current?.id !== id) return;
            try {
                await expenseService.deleteTransaction(id);
            } catch (e: any) {
                setTransactions(prev =>
                    [txToDelete, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                );
                Alert.alert('Error', e.message || 'Failed to delete');
            } finally {
                if (pendingDeleteRef.current?.id === id) {
                    pendingDeleteRef.current = null;
                    setPendingDeleteVisible(false);
                }
            }
        }, 4000);

        pendingDeleteRef.current = { id, tx: txToDelete, timer };
        setPendingDeleteVisible(true);
    };

    const handleUndoDelete = () => {
        const pending = pendingDeleteRef.current;
        if (!pending) return;
        clearTimeout(pending.timer);
        setTransactions(prev =>
            [pending.tx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
        pendingDeleteRef.current = null;
        setPendingDeleteVisible(false);
    };

    const handleLogExpense = async (amount: number, title: string, category: string, dateStr: string, id?: string) => {
        try {
            if (id) {
                const updated = await expenseService.updateTransaction(id, { amount, title, category, date: dateStr });
                if (updated) {
                    setTransactions(prev =>
                        prev.map(t => t.id === id ? updated : t)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    );
                }
            } else {
                const tx = await expenseService.addTransaction(amount, title, category, dateStr);
                if (tx) {
                    setTransactions(prev =>
                        [tx, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    );
                }
            }
        } catch (e: any) { Alert.alert('Error', e.message || 'Failed to save transaction'); }
    };

    const handleConfirmReceipt = async (updatedData: any) => {
        if (!updatedData) return;
        try {
            if (updatedData.isEditingSavedReceipt) {
                await expenseService.updateReceiptScan(updatedData.id, updatedData);
                setScannedReceiptData(null);
                Alert.alert('Updated', 'Receipt updated successfully.', [{ text: 'Done', onPress: () => fetchData() }]);
            } else {
                await expenseService.confirmReceiptScan(
                    updatedData,
                    updatedData.imageUrl,
                    updatedData.total_spent,
                    updatedData.store_name,
                    updatedData.purchase_date
                );
                setScannedReceiptData(null);
                Alert.alert('Saved', 'Receipt logged successfully.', [{ text: 'Done', onPress: () => fetchData() }]);
            }
        } catch (e: any) { Alert.alert('Save Error', e.message); }
    };

    const processImage = async (base64: string) => {
        if (!base64) return;
        setIsScanning(true);
        setTimeout(async () => {
            try {
                const ocrData = await expenseService.processReceipt(base64);
                if (ocrData && ocrData.items && ocrData.items.length > 0) {
                    const dupCheck = await expenseService.checkDuplicateReceipt(ocrData.store_name, ocrData.total_spent, ocrData.purchase_date);
                    if (dupCheck.isDuplicate) {
                        Alert.alert(
                            'Looks familiar!',
                            `You already have a receipt from ${ocrData.store_name} for $${ocrData.total_spent.toFixed(2)} on ${ocrData.purchase_date}. Add anyway?`,
                            [
                                { text: 'Skip', style: 'cancel' },
                                { text: 'Add anyway', onPress: () => setScannedReceiptData(ocrData) },
                            ]
                        );
                    } else { setScannedReceiptData(ocrData); }
                } else { Alert.alert('OCR Failed', 'Could not read receipt. Try a clearer photo?'); }
            } catch (e: any) { Alert.alert('Analysis Error', 'Service is currently unavailable.'); }
            finally { setIsScanning(false); }
        }, 500);
    };

    const handleScanReceipt = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission denied', 'Camera access is required to scan receipts.'); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, aspect: [4, 3], quality: 0.4, base64: false });
            if (!result.canceled && result.assets[0].uri) {
                const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
                processImage(base64);
            }
        } catch (e: any) { Alert.alert('Camera Error', `Details: ${e.message}`); }
    };

    const handleUploadReceipt = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.4, base64: false });
            if (!result.canceled && result.assets[0].uri) {
                const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
                processImage(base64);
            }
        } catch (e: any) { Alert.alert('Upload Error', 'Could not open Gallery.'); }
    };

    // --- PACING MATH & INSIGHTS (Memoized) ---
    const insights = useMemo<any>(() => {
        if (!budget) return null;

        const todayStr = getLocalYYYYMMDD(now);
        const currentMonthPrefix = todayStr.slice(0, 7);
        const currentMonthTxs = transactions.filter((t: any) => t.date.startsWith(currentMonthPrefix));

        const totalMonthSpend = currentMonthTxs.reduce((sum: number, t: any) => sum + t.amount, 0);
        const monthlyAllowance = budget.safe_allowance;
        const remainingInMonth = monthlyAllowance - totalMonthSpend;

        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysRemaining = daysInMonth - now.getDate() + 1;

        const safeDailySpend = remainingInMonth > 0 ? remainingInMonth / daysRemaining : 0;
        const isPacingWell = safeDailySpend >= (monthlyAllowance / daysInMonth);
        const statusColor = remainingInMonth < 0 ? C.red : (isPacingWell ? C.emerald : C.amber);

        const sortedTransactions = [...transactions].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groupedTransactions = groupTransactionsByDate(sortedTransactions, todayStr);

        // Insights tab calculations (Fixed Monday-Sunday Weeks)
        const getMonday = (dateStr: string | Date) => {
            const d = new Date(dateStr);
            const day = d.getDay() || 7;
            d.setDate(d.getDate() - (day - 1));
            return d;
        };

        const weeks = [];
        for (let w = 0; w < 4; w++) {
            const refDate = new Date(now);
            refDate.setDate(refDate.getDate() - (w * 7));
            const monday = getMonday(refDate);

            const weekDays = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(monday);
                d.setDate(d.getDate() + i);
                return getLocalYYYYMMDD(d);
            });

            const weekDataValues = weekDays.map(date =>
                transactions.filter((t: any) => t.date.startsWith(date) && t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0)
            );

            weeks.push({
                offset: w,
                label: w === 0 ? 'This Week' : w === 1 ? 'Last Week' : `${w} Wks Ago`,
                dataValues: weekDataValues,
                weekMax: Math.max(...weekDataValues, 1),
                weekTotal: weekDataValues.reduce((a, b) => a + b, 0)
            });
        }

        const needsIds = ['groceries', 'bills', 'transit', 'school'];
        let needsTotal = 0; let wantsTotal = 0;
        currentMonthTxs.forEach((t: any) => {
            if (t.amount < 0) return;
            if (needsIds.includes(t.category)) needsTotal += t.amount;
            else wantsTotal += t.amount;
        });
        const totalNW = needsTotal + wantsTotal || 1;
        const needsPct = (needsTotal / totalNW) * 100;
        const wantsPct = (wantsTotal / totalNW) * 100;

        let nextSub: { title: string, amount: number, daysAway: number } | null = null;
        if (subscriptions && subscriptions.length > 0) {
            const activeSubs = subscriptions.filter(s => s.is_active);
            let minDays = Infinity;
            activeSubs.forEach(sub => {
                const currentDay = now.getDate();
                let targetDate = new Date(now.getFullYear(), now.getMonth(), sub.billing_day);
                if (sub.billing_day < currentDay) {
                    targetDate = new Date(now.getFullYear(), now.getMonth() + 1, sub.billing_day);
                }
                const diffTime = Math.abs(targetDate.getTime() - now.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < minDays) {
                    minDays = diffDays;
                    nextSub = { title: sub.title, amount: sub.amount, daysAway: diffDays };
                }
            });
        }

        const expensesOnly = currentMonthTxs.filter((t: any) => t.amount > 0);
        const biggestHit = expensesOnly.length > 0
            ? expensesOnly.reduce((max: any, t: any) => t.amount > max.amount ? t : max, expensesOnly[0])
            : null;

        // 🟢 Top Categories for "Guilt Tracker"
        const catTotals: Record<string, number> = {};
        expensesOnly.forEach(t => {
            const catId = t.category;
            catTotals[catId] = (catTotals[catId] || 0) + t.amount;
        });

        const sortedCats = Object.entries(catTotals)
            .map(([id, amount]) => {
                const catObj = categories.find(c => c.id === id || c.label === id) || { label: id, color: '#6366f1' };
                return {
                    id,
                    name: catObj.label,
                    amount,
                    color: catObj.color,
                };
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3); // Top 3

        const maxCatAmount = sortedCats.length > 0 ? sortedCats[0].amount : 1;
        const topCategories = sortedCats.map(c => ({
            ...c,
            pct: (c.amount / maxCatAmount) * 100
        }));

        // 🟢 Subscription Roll-up Data
        const activeSubs = (subscriptions || []).filter(s => s.is_active);
        const subTotalDrain = activeSubs.reduce((sum, s) => sum + s.amount, 0);
        const detailedSubs = activeSubs.map(s => ({
            name: s.title,
            amount: s.amount,
            date: s.billing_day === 1 ? '1st' : s.billing_day === 2 ? '2nd' : s.billing_day === 3 ? '3rd' : `${s.billing_day}th`
        })).sort((a, b) => a.amount - b.amount);

        return {
            todayStr, totalMonthSpend, monthlyAllowance, remainingInMonth, daysInMonth,
            daysRemaining, safeDailySpend, isPacingWell, statusColor, groupedTransactions,
            needsPct, wantsPct, nextSub, biggestHit, weeks,
            topCategories, subTotalDrain, detailedSubs
        };
    }, [budget, transactions, now, subscriptions, categories]);

    return {
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
    };
};
