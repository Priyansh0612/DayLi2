import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, StatusBar, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../config/supabase';
import { DEFAULT_CATEGORIES } from '../utils/expenseDashboardUtils';
import { expenseService, Transaction, CustomCategory } from '../services/expenseService';

const C = {
    bg: '#F7F5F0',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EDE8',
    border: '#EAE6DF',
    accent: '#10B981',
    textPri: '#1C1917',
    textSec: '#78716C',
    textMut: '#B8B0A8',
};

const AllTransactionsScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<any[]>(DEFAULT_CATEGORIES);

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const customCats = await expenseService.fetchCustomCategories();
        setCategories([...DEFAULT_CATEGORIES, ...customCats]);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (data) {
            setTransactions(data as Transaction[]);
            setFilteredTransactions(data as Transaction[]);
        }
    };

    useEffect(() => {
        let filtered = transactions;

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.title.toLowerCase().includes(lowerQuery) ||
                tx.amount.toString().includes(lowerQuery)
            );
        }

        if (filterCategory) {
            filtered = filtered.filter(tx => tx.category === filterCategory || tx.category === categories.find(c => c.id === filterCategory)?.label);
        }

        setFilteredTransactions(filtered);
    }, [searchQuery, filterCategory, transactions]);

    const handleExportCSV = async () => {
        if (transactions.length === 0) {
            Alert.alert('No Data', 'You have no transactions to export.');
            return;
        }

        try {
            // 1. Create CSV Header
            const header = "Date,Title,Category,Amount\n";

            // 2. Create Rows
            const rows = transactions.map(tx => {
                const cat = categories.find(c => c.id === tx.category || c.label === tx.category)?.label || tx.category;
                const safeTitle = tx.title.replace(/,/g, ' '); // remove commas from titles
                const dateOnly = tx.date.split('T')[0];
                return `${dateOnly},${safeTitle},${cat},${tx.amount.toFixed(2)}`;
            }).join('\n');

            const csvString = header + rows;

            // 3. Write to temporary file
            const fileUri = `${FileSystem.documentDirectory}transactions_export.csv`;
            await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

            // 4. Share File
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' });
            } else {
                Alert.alert('Sharing Unavailable', 'File sharing is not supported on this device.');
            }
        } catch (e: any) {
            console.error('Export Error:', e);
            Alert.alert('Export Failed', 'There was an issue exporting your transactions.');
        }
    };

    const renderItem = ({ item: tx }: { item: Transaction }) => {
        const cat = categories.find(c => c.id === tx.category || c.label === tx.category) || DEFAULT_CATEGORIES[0];
        const dateStr = new Date(
            tx.date.includes('T')
                ? tx.date
                : `${tx.date}T12:00:00`
        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: C.border, elevation: 2 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Text style={{ fontSize: 22 }}>{cat.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: C.textPri, marginBottom: 2 }} numberOfLines={1}>{tx.title}</Text>
                    <Text style={{ fontSize: 12, color: C.textMut, fontWeight: '500' }}>{dateStr} • {cat.label}</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.textPri }}>${tx.amount.toFixed(2)}</Text>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
            <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ color: C.textPri, fontSize: 22, marginLeft: -2, lineHeight: 26 }}>‹</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.textPri }}>All Transactions</Text>
                <TouchableOpacity onPress={handleExportCSV} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: C.textPri, alignItems: 'center', justifyContent: 'center', shadowColor: C.textPri, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 16 }}>↓</Text>
                </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search transactions..."
                    placeholderTextColor={C.textMut}
                    style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, fontSize: 16, color: C.textPri, borderWidth: 1, borderColor: C.border }}
                />
            </View>

            <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={[{ id: 'all', label: 'All', icon: '' }, ...categories]}
                    keyExtractor={item => item.id || item.label}
                    renderItem={({ item }) => {
                        const isSelected = filterCategory === (item.id === 'all' ? null : item.id);
                        return (
                            <TouchableOpacity
                                onPress={() => setFilterCategory(item.id === 'all' ? null : item.id)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    backgroundColor: isSelected ? C.textPri : C.surface,
                                    borderWidth: 1,
                                    borderColor: isSelected ? C.textPri : C.border,
                                    marginRight: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                {item.icon ? <Text>{item.icon}</Text> : null}
                                <Text style={{ color: isSelected ? '#fff' : C.textSec, fontWeight: '600', fontSize: 13 }}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            <FlatList
                data={filteredTransactions}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Text style={{ color: C.textMut, fontWeight: '600' }}>No transactions found.</Text>
                    </View>
                }
            />
        </View>
    );
};

export default AllTransactionsScreen;
