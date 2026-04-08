import React from 'react';
import { View, Text } from 'react-native';
import * as Localization from 'expo-localization';
import { Transaction } from '../services/expenseService';

// ─── CURRENCY HELPER ───
export const getCurrencySymbol = () => {
    try {
        // Check if Localization and getLocales exist/are available to avoid [runtime not ready] errors
        if (Localization && typeof Localization.getLocales === 'function') {
            const locales = Localization.getLocales();
            if (locales && locales.length > 0 && locales[0].currencySymbol) {
                return locales[0].currencySymbol;
            }
        }
    } catch (e) {
        console.warn('Localization error:', e);
    }
    return '$'; 
};
export const CUR_SYM = getCurrencySymbol();

// ─── DATE HELPERS ───
export const getLocalYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ─── DESIGN TOKENS — DayLi Wallet ─────────────────────────────
export const C = {
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

import { Coffee, ShoppingCart, Car, PartyPopper, GraduationCap, Lightbulb, Tag } from 'lucide-react-native';

export const DEFAULT_CATEGORIES = [
    { id: 'food', label: 'Food & Drink', icon: 'Coffee' },
    { id: 'groceries', label: 'Groceries', icon: 'ShoppingCart' },
    { id: 'transit', label: 'Transit', icon: 'Car' },
    { id: 'fun', label: 'Fun/Social', icon: 'PartyPopper' },
    { id: 'school', label: 'School', icon: 'GraduationCap' },
    { id: 'bills', label: 'Bills', icon: 'Lightbulb' },
];

export const CategoryIcon = ({ name, size = 18, color = C.ink }: { name: string, size?: number, color?: string }) => {
    // Fallback for legacy emojis
    if (name && name.length <= 2) {
        return <Text style={{ fontSize: size }}>{name}</Text>;
    }

    switch (name) {
        case 'Coffee': return <Coffee size={size} color={color} strokeWidth={2.5} />;
        case 'ShoppingCart': return <ShoppingCart size={size} color={color} strokeWidth={2.5} />;
        case 'Car': return <Car size={size} color={color} strokeWidth={2.5} />;
        case 'PartyPopper': return <PartyPopper size={size} color={color} strokeWidth={2.5} />;
        case 'GraduationCap': return <GraduationCap size={size} color={color} strokeWidth={2.5} />;
        case 'Lightbulb': return <Lightbulb size={size} color={color} strokeWidth={2.5} />;
        default: return <Tag size={size} color={color} strokeWidth={2.5} />;
    }
};

export const card = {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
};

export const Label = ({ children, style }: { children: string; style?: any }) => (
    <Text style={[{
        fontSize: 10, fontWeight: '700',
        letterSpacing: 1.6, textTransform: 'uppercase',
        color: C.ghost,
    }, style]}>
        {children}
    </Text>
);

export const Divider = ({ style }: { style?: any }) => (
    <View style={[{ height: 1, backgroundColor: C.line }, style]} />
);

// ─── HELPER: Group Transactions by Date ───────────────────────
export const groupTransactionsByDate = (transactions: Transaction[], todayStr: string) => {
    const groups: { title: string, data: Transaction[] }[] = [];
    const groupedMap = new Map<string, Transaction[]>();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalYYYYMMDD(yesterdayDate);

    transactions.forEach(tx => {
        const txDate = tx.date.split('T')[0];
        let groupTitle = txDate === todayStr ? 'Today' : txDate === yesterdayStr ? 'Yesterday' : txDate;

        if (groupTitle === txDate) {
            // No 'Z' suffix — treated as local time so date doesn't shift
            const d = new Date(`${txDate}T12:00:00`);
            groupTitle = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }

        if (!groupedMap.has(groupTitle)) groupedMap.set(groupTitle, []);
        groupedMap.get(groupTitle)!.push(tx);
    });

    groupedMap.forEach((data, title) => groups.push({ title, data }));
    return groups;
};

// ─── PENDING DELETE TYPE ───────────────────────────────────────
export type PendingDelete = { id: string; tx: Transaction; timer: ReturnType<typeof setTimeout> };
