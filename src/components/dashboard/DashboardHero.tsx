import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { format } from 'date-fns';
import { Wallet, BookOpen, Clock } from 'lucide-react-native';

interface DashboardHeroProps {
    greeting: string;
    summary: string;
    stats: {
        safeSpend: number;
        assignmentsCount: number;
        workHoursDone: number;
    };
    onPillPress?: (module: string) => void;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({ greeting, summary, stats, onPillPress }) => {
    const todayStr = format(new Date(), 'EEEE, MMM d');

    return (
        <View style={{ paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, backgroundColor: '#F4F5F2' }}>
            <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#8A8278', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                    {todayStr}
                </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 36, fontWeight: '800', color: '#1A1916', letterSpacing: -1 }}>
                    {greeting}.
                </Text>
                <Text style={{ fontSize: 18, color: '#4A4540', marginTop: 4, lineHeight: 24, fontWeight: '500' }}>
                    {summary}
                </Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                style={{ marginTop: 8 }}
            >
                <StatPill
                    icon={<Wallet size={14} color="#2F5233" />}
                    label={`$${stats.safeSpend.toFixed(0)} Safe`}
                    color="#2F5233"
                    bgColor="rgba(47, 82, 51, 0.08)"
                    onPress={() => onPillPress?.('Expenses')}
                />
                <StatPill
                    icon={<BookOpen size={14} color="#3B82F6" />}
                    label={`${stats.assignmentsCount} Due`}
                    color="#3B82F6"
                    bgColor="rgba(59, 130, 246, 0.08)"
                    onPress={() => onPillPress?.('Academics')}
                />
                <StatPill
                    icon={<Clock size={14} color="#1E293B" />}
                    label={`${stats.workHoursDone}h Done`}
                    color="#1E293B"
                    bgColor="rgba(30, 41, 59, 0.08)"
                    onPress={() => onPillPress?.('Work')}
                />
            </ScrollView>
        </View>
    );
};

const StatPill = ({ icon, label, color, bgColor, onPress }: any) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: bgColor,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            gap: 6,
            borderWidth: 1,
            borderColor: color + '20'
        }}
    >
        {icon}
        <Text style={{ fontSize: 12, fontWeight: '700', color: color }}>
            {label}
        </Text>
    </TouchableOpacity>
);

export default DashboardHero;
