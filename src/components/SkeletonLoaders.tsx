import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Skeleton } from 'moti/skeleton';

const { width: SW } = Dimensions.get('window');

// 🧱 THE PREMIUM BUILDING BLOCK (Native Shimmer + Breathing Pulse)
export const SkeletonBox = ({ width, height, borderRadius = 12, style = {}, color = '#E8E4DC', delay = 0 }: any) => {
    const breathe = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(breathe, {
                    toValue: 0.4,
                    duration: 900,
                    useNativeDriver: true,
                }),
                Animated.timing(breathe, {
                    toValue: 1,
                    duration: 900,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    // Auto-detect if this skeleton is inside a dark theme container
    const isDark = typeof color === 'string' && (color.includes('rgba(255') || color === 'rgba(255,255,255,0.15)');

    // Define the left-to-right shimmer gradients
    const colors = isDark
        ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']
        : ['#EBE6DD', '#F5F1E9', '#EBE6DD'];

    return (
        <Animated.View style={[{ width, height, borderRadius, overflow: 'hidden', opacity: breathe }, style]}>
            <Skeleton
                width={width}
                height={height}
                radius={borderRadius}
                colorMode={isDark ? 'dark' : 'light'}
                colors={colors}
                transition={{
                    type: 'timing',
                    duration: 1200,
                    delay,
                }}
            />
        </Animated.View>
    );
};


// ─── Light Skeleton (for light backgrounds like Meal, Grocery) ───
const LightBox = (props: any) => <SkeletonBox color="#E0DBD2" {...props} />;

// ─── Dark Skeleton (for dark backgrounds like Expense, Academics) ───
const DarkBox = (props: any) => <SkeletonBox color="rgba(255,255,255,0.15)" {...props} />;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🍽️ MEAL DASHBOARD SKELETON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const MealDashboardSkeleton = () => {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#F9F7F2' }}>
            {/* Header Area */}
            <View style={{ backgroundColor: '#F0EBE1', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 32, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, height: 48 }}>
                    <LightBox width={40} height={40} borderRadius={12} delay={0} />
                    <LightBox width={50} height={14} borderRadius={4} delay={50} />
                    <LightBox width={40} height={40} borderRadius={20} delay={100} />
                </View>

                <LightBox width="60%" height={48} borderRadius={12} style={{ marginBottom: 12 }} delay={150} />
                <LightBox width="45%" height={12} borderRadius={6} style={{ marginBottom: 28 }} delay={200} />
                <LightBox width="100%" height={56} borderRadius={18} delay={250} />
            </View>

            <View style={{ paddingTop: 8 }}>
                <View style={{ paddingHorizontal: 32, marginTop: 32, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <LightBox width={160} height={20} borderRadius={6} style={{ marginBottom: 8 }} delay={300} />
                        <LightBox width={110} height={10} borderRadius={4} delay={350} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <LightBox width={36} height={36} borderRadius={18} delay={400} />
                        <LightBox width={36} height={36} borderRadius={18} delay={450} />
                    </View>
                </View>

                <View style={{ flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24, justifyContent: 'space-between' }}>
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                        <View key={i} style={{ alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 }}>
                            <LightBox width={12} height={12} borderRadius={4} style={{ marginBottom: 8 }} delay={400 + (i * 50)} />
                            <LightBox width={20} height={14} borderRadius={4} delay={450 + (i * 50)} />
                        </View>
                    ))}
                </View>

                <View style={{ paddingHorizontal: 24, gap: 16 }}>
                    {[
                        { width1: "40%", width2: "85%", width3: "60%" },
                        { width1: "55%", width2: "70%", width3: "50%" },
                        { width1: "45%", width2: "90%", width3: "65%" }
                    ].map((widths, i) => (
                        <View key={i} style={{
                            backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#F0EDE6',
                            flexDirection: 'row', overflow: 'hidden', height: 116,
                            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12,
                        }}>
                            <LightBox width={116} height={116} borderRadius={0} delay={500 + (i * 100)} />
                            <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                                <LightBox width={widths.width1} height={12} borderRadius={4} style={{ marginBottom: 12 }} delay={550 + (i * 100)} />
                                <LightBox width={widths.width2} height={18} borderRadius={6} style={{ marginBottom: 8 }} delay={600 + (i * 100)} />
                                <LightBox width={widths.width3} height={14} borderRadius={4} style={{ marginBottom: 16 }} delay={650 + (i * 100)} />
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <LightBox width={60} height={14} borderRadius={6} delay={700 + (i * 100)} />
                                    <LightBox width={75} height={14} borderRadius={6} delay={750 + (i * 100)} />
                                </View>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 EXPENSE CONTENT SKELETON (below-header only)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const ExpenseContentSkeleton = () => {
    return (
        <>
            {/* Tab Bar */}
            <View style={{ backgroundColor: '#F4F5F2', borderBottomWidth: 1, borderBottomColor: '#E8E4DC', zIndex: 10 }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 22, paddingTop: 6 }}>
                    <View style={{ marginRight: 30, paddingVertical: 14 }}>
                        <LightBox width={64} height={16} borderRadius={4} delay={0} />
                    </View>
                    <View style={{ paddingVertical: 14 }}>
                        <LightBox width={100} height={16} borderRadius={4} delay={50} />
                    </View>
                </View>
                <LightBox width={70} height={3} borderRadius={2} style={{ marginLeft: 22, backgroundColor: '#2F5233' }} delay={100} />
            </View>

            {/* Bento Card Row */}
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 }}>
                <LightBox width={(SW - 52) / 2} height={(SW - 52) / 2} borderRadius={20} delay={150} />
                <LightBox width={(SW - 52) / 2} height={(SW - 52) / 2} borderRadius={20} delay={200} />
            </View>

            {/* Budget Progress Card */}
            <View style={{ marginHorizontal: 20, marginTop: 20, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E8E4DC', padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 }}>
                <LightBox width={140} height={10} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 24 }} delay={250} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                    <View>
                        <LightBox width={80} height={10} borderRadius={4} style={{ marginBottom: 8 }} delay={300} />
                        <LightBox width={120} height={36} borderRadius={8} delay={350} />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <LightBox width={70} height={10} borderRadius={4} style={{ marginBottom: 8 }} delay={400} />
                        <LightBox width={60} height={24} borderRadius={6} delay={450} />
                    </View>
                </View>
                <LightBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 10 }} color="#F0EDE7" delay={500} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <LightBox width={50} height={12} borderRadius={4} delay={550} />
                    <LightBox width={80} height={12} borderRadius={4} delay={600} />
                </View>
            </View>

            {/* Transaction list preview */}
            <LightBox width={140} height={10} borderRadius={4} style={{ marginTop: 28, marginBottom: 16, marginLeft: 24 }} delay={650} />
            <View style={{ marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#E8E4DC', overflow: 'hidden' }}>
                {[
                    { wT: '65%', wC: '35%', wA: 65 },
                    { wT: '45%', wC: '25%', wA: 45 },
                    { wT: '75%', wC: '40%', wA: 80 },
                ].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#F0EDE6' }}>
                        <LightBox width={44} height={44} borderRadius={14} style={{ marginRight: 16 }} delay={700 + (i * 50)} />
                        <View style={{ flex: 1, paddingRight: 16 }}>
                            <LightBox width={item.wT} height={15} borderRadius={5} style={{ marginBottom: 8 }} delay={750 + (i * 50)} />
                            <LightBox width={item.wC} height={12} borderRadius={4} delay={800 + (i * 50)} />
                        </View>
                        <LightBox width={item.wA} height={16} borderRadius={5} delay={850 + (i * 50)} />
                    </View>
                ))}
            </View>
        </>
    );
};


export const ExpenseDashboardSkeleton = () => {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#F5F3EE' }}>
            <LinearGradient
                colors={['#1E3520', '#2F5233', '#567D62']}
                start={{ x: 0.1, y: 0.1 }} end={{ x: 1, y: 1.2 }}
            >
                <View style={{ paddingTop: insets.top }}>
                    <View style={{ paddingHorizontal: 22, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, height: 48 }}>
                        <DarkBox width={26} height={26} borderRadius={13} delay={0} />
                        <DarkBox width={60} height={16} borderRadius={4} delay={50} />
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            <DarkBox width={20} height={20} borderRadius={10} delay={100} />
                            <DarkBox width={20} height={20} borderRadius={10} delay={150} />
                        </View>
                    </View>

                    <View style={{ alignItems: 'center', paddingHorizontal: 22, paddingBottom: 8 }}>
                        <DarkBox width={140} height={12} borderRadius={4} style={{ marginBottom: 16 }} delay={200} />
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                            <DarkBox width={20} height={20} borderRadius={4} style={{ marginRight: 6, marginTop: 12 }} delay={250} />
                            <DarkBox width={120} height={80} borderRadius={16} delay={300} />
                        </View>
                        <DarkBox width={200} height={14} borderRadius={6} delay={350} />
                    </View>

                    <View style={{ paddingHorizontal: 22, marginTop: 16 }}>
                        <View style={{
                            borderTopLeftRadius: 20, borderTopRightRadius: 20,
                            backgroundColor: 'rgba(255,255,255,0.06)',
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderBottomWidth: 0,
                            flexDirection: 'row'
                        }}>
                            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' }}>
                                <DarkBox width={80} height={24} borderRadius={6} style={{ marginBottom: 8 }} delay={400} />
                                <DarkBox width={50} height={10} borderRadius={4} delay={450} />
                            </View>
                            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
                                <DarkBox width={80} height={24} borderRadius={6} style={{ marginBottom: 8 }} delay={500} />
                                <DarkBox width={70} height={10} borderRadius={4} delay={550} />
                            </View>
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={{ backgroundColor: '#F4F5F2', borderBottomWidth: 1, borderBottomColor: '#E8E4DC', zIndex: 10 }}>
                <View style={{ flexDirection: 'row', paddingHorizontal: 22, paddingTop: 6 }}>
                    <View style={{ marginRight: 30, paddingVertical: 14 }}>
                        <LightBox width={64} height={16} borderRadius={4} delay={600} />
                    </View>
                    <View style={{ paddingVertical: 14 }}>
                        <LightBox width={100} height={16} borderRadius={4} delay={650} />
                    </View>
                </View>
                <LightBox width={70} height={3} borderRadius={2} style={{ marginLeft: 22, backgroundColor: '#2F5233' }} delay={700} />
            </View>

            <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#E8E4DC', padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10 }}>
                    <LightBox width={140} height={10} borderRadius={4} style={{ alignSelf: 'center', marginBottom: 24 }} delay={750} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                        <View>
                            <LightBox width={80} height={10} borderRadius={4} style={{ marginBottom: 8 }} delay={800} />
                            <LightBox width={120} height={36} borderRadius={8} delay={850} />
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <LightBox width={70} height={10} borderRadius={4} style={{ marginBottom: 8 }} delay={900} />
                            <LightBox width={60} height={24} borderRadius={6} delay={950} />
                        </View>
                    </View>
                    <LightBox width="100%" height={8} borderRadius={4} style={{ marginBottom: 10 }} color="#F0EDE7" delay={1000} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <LightBox width={50} height={12} borderRadius={4} delay={1050} />
                        <LightBox width={80} height={12} borderRadius={4} delay={1100} />
                    </View>
                </View>
                
                <LightBox width={140} height={10} borderRadius={4} style={{ marginBottom: 16, marginLeft: 4 }} delay={1150} />

                <View style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#E8E4DC', overflow: 'hidden' }}>
                    {[
                        { wT: "65%", wC: "35%", wA: 65 },
                        { wT: "45%", wC: "25%", wA: 45 },
                        { wT: "75%", wC: "40%", wA: 80 },
                        { wT: "55%", wC: "30%", wA: 55 }
                    ].map((item, i) => (
                        <View key={i} style={{
                            flexDirection: 'row', alignItems: 'center', padding: 16,
                            borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#F0EDE6'
                        }}>
                            <LightBox width={44} height={44} borderRadius={14} style={{ marginRight: 16 }} delay={600 + (i * 50)} />
                            <View style={{ flex: 1, paddingRight: 16 }}>
                                <LightBox width={item.wT} height={15} borderRadius={5} style={{ marginBottom: 8 }} delay={650 + (i * 50)} />
                                <LightBox width={item.wC} height={12} borderRadius={4} delay={700 + (i * 50)} />
                            </View>
                            <LightBox width={item.wA} height={16} borderRadius={5} delay={750 + (i * 50)} />
                        </View>
                    ))}
                </View>

                <LightBox width={90} height={12} borderRadius={4} style={{ marginTop: 32, marginBottom: 16, marginLeft: 4 }} delay={800} />
                <View style={{ backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#E8E4DC', overflow: 'hidden' }}>
                    {[
                        { wT: "50%", wC: "30%", wA: 50 },
                        { wT: "80%", wC: "45%", wA: 70 }
                    ].map((item, i) => (
                        <View key={i} style={{
                            flexDirection: 'row', alignItems: 'center', padding: 16,
                            borderBottomWidth: i < 1 ? 1 : 0, borderBottomColor: '#F0EDE6'
                        }}>
                            <LightBox width={44} height={44} borderRadius={14} style={{ marginRight: 16 }} delay={850 + (i * 50)} />
                            <View style={{ flex: 1, paddingRight: 16 }}>
                                <LightBox width={item.wT} height={15} borderRadius={5} style={{ marginBottom: 8 }} delay={900 + (i * 50)} />
                                <LightBox width={item.wC} height={12} borderRadius={4} delay={950 + (i * 50)} />
                            </View>
                            <LightBox width={item.wA} height={16} borderRadius={5} delay={1000 + (i * 50)} />
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📚 ACADEMICS SKELETON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const AcademicsSkeleton = () => {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#F7F7FE' }}>
            <LinearGradient
                colors={['#6366F1', '#797CF7', '#939BF4']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingBottom: 24, paddingTop: insets.top }}
            >
                <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, height: 40 }}>
                        <DarkBox width={40} height={40} borderRadius={12} delay={0} />
                        <DarkBox width={80} height={14} borderRadius={4} delay={50} />
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={{ marginBottom: 24 }}>
                        <DarkBox width={90} height={12} borderRadius={4} style={{ marginBottom: 12 }} delay={100} />
                        <DarkBox width="70%" height={32} borderRadius={8} style={{ marginBottom: 8 }} delay={150} />
                        <DarkBox width="45%" height={14} borderRadius={4} delay={200} />
                    </View>

                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 12 }}>
                        {[1, 2, 3].map(i => (
                            <View key={i} style={{
                                flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
                                paddingVertical: 20, alignItems: 'center',
                                borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
                            }}>
                                <DarkBox width={40} height={28} borderRadius={6} style={{ marginBottom: 12 }} delay={250 + (i * 50)} />
                                <DarkBox width={60} height={12} borderRadius={4} delay={300 + (i * 50)} />
                            </View>
                        ))}
                    </View>
                </View>
            </LinearGradient>

            <View style={{ backgroundColor: '#fff', flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F0EDE6' }}>
                <LightBox width={80} height={15} borderRadius={5} style={{ marginRight: 32 }} delay={400} />
                <LightBox width={90} height={15} borderRadius={5} delay={450} />
            </View>

            <View style={{ padding: 20, gap: 14 }}>
                {[
                    { w1: "45%", w2: "80%", w3: "50%" },
                    { w1: "35%", w2: "60%", w3: "40%" },
                    { w1: "55%", w2: "90%", w3: "60%" },
                    { w1: "40%", w2: "70%", w3: "45%" }
                ].map((widths, i) => (
                    <View key={i} style={{
                        backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#F0EDE6',
                        padding: 18, flexDirection: 'row', alignItems: 'center',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10,
                    }}>
                        <LightBox width={48} height={48} borderRadius={16} style={{ marginRight: 16 }} delay={500 + (i * 100)} />
                        <View style={{ flex: 1, paddingRight: 10 }}>
                            <LightBox width={widths.w1} height={16} borderRadius={5} style={{ marginBottom: 8 }} delay={550 + (i * 100)} />
                            <LightBox width={widths.w2} height={12} borderRadius={4} style={{ marginBottom: 8 }} delay={600 + (i * 100)} />
                            <LightBox width={widths.w3} height={12} borderRadius={4} delay={650 + (i * 100)} />
                        </View>
                        <LightBox width={44} height={44} borderRadius={22} delay={700 + (i * 100)} />
                    </View>
                ))}
            </View>
        </View>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚡ WORKS DASHBOARD SKELETON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const WorksDashboardSkeleton = () => (
    <View style={{
        flex: 1, marginHorizontal: 16, borderRadius: 28, overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)', marginBottom: 100, marginTop: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 24,
    }}>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E8E4DC', height: 48 }}>
            <View style={{ width: 44, borderRightWidth: 1, borderRightColor: '#E8E4DC' }} />
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: i < 7 ? 1 : 0, borderRightColor: '#E8E4DC' }}>
                    <LightBox width={26} height={10} borderRadius={4} style={{ marginBottom: 6 }} delay={i * 50} />
                    <LightBox width={24} height={24} borderRadius={12} delay={(i * 50) + 50} />
                </View>
            ))}
        </View>
        
        <View style={{ flexDirection: 'row', height: 24, borderBottomWidth: 1, borderBottomColor: '#E8E4DC' }}>
            <View style={{ width: 44, borderRightWidth: 1, borderRightColor: '#E8E4DC' }} />
            <View style={{ flex: 1, justifyContent: 'center', paddingLeft: 12 }}>
                <LightBox width={60} height={8} borderRadius={4} delay={400} />
            </View>
        </View>
        
        <View style={{ flex: 1, flexDirection: 'row' }}>
            <View style={{ width: 44, borderRightWidth: 1, borderRightColor: '#E8E4DC' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <View key={i} style={{ height: 60, alignItems: 'flex-end', paddingTop: 8, paddingRight: 8 }}>
                        <LightBox width={22} height={10} borderRadius={4} delay={i * 50} />
                    </View>
                ))}
            </View>
            
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <View key={i} style={{ flex: 1, borderRightWidth: i < 7 ? 1 : 0, borderRightColor: 'rgba(232, 228, 220, 0.5)' }}>
                    {i % 2 !== 0 && (
                        <LightBox
                            width="90%" height={i === 1 ? 80 : i === 3 ? 140 : 100}
                            borderRadius={12}
                            style={{ 
                                marginTop: i === 1 ? 80 : i === 3 ? 40 : 180, 
                                alignSelf: 'center' 
                            }}
                            color="rgba(99, 102, 241, 0.08)"
                            delay={400 + (i * 100)}
                        />
                    )}
                </View>
            ))}
        </View>
    </View>
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎓 COURSE DETAILS SKELETON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const CourseDetailsSkeleton = ({ theme }: { theme?: any } = {}) => {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <LinearGradient
                colors={theme ? [theme.deep, theme.primary, theme.light] : ['#60587A', '#7D739C', '#A8A0C2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ paddingBottom: 0 }}
            >
                <View style={{ paddingTop: insets.top }}>
                    <View style={{ paddingHorizontal: 22, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <DarkBox width={22} height={22} borderRadius={11} delay={0} />
                        <DarkBox width={60} height={24} borderRadius={12} delay={50} />
                    </View>

                    <View style={{ paddingHorizontal: 22, paddingBottom: 22 }}>
                        <DarkBox width={80} height={14} borderRadius={4} style={{ marginBottom: 8 }} delay={100} />
                        <DarkBox width="70%" height={32} borderRadius={8} style={{ marginBottom: 16 }} delay={150} />

                        <View style={{ gap: 12 }}>
                            {[1, 2].map(i => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <DarkBox width={40} height={16} borderRadius={4} delay={200 + (i * 50)} />
                                    <DarkBox width={140} height={14} borderRadius={4} delay={250 + (i * 50)} />
                                </View>
                            ))}
                        </View>
                    </View>

                    <View style={{ paddingHorizontal: 22 }}>
                        <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <DarkBox width={60} height={60} borderRadius={30} delay={400} />
                            <View style={{ flex: 1 }}>
                                <DarkBox width={80} height={10} borderRadius={4} style={{ marginBottom: 6 }} delay={450} />
                                <DarkBox width={120} height={14} borderRadius={4} delay={500} />
                            </View>
                            <DarkBox width={50} height={40} borderRadius={12} delay={550} />
                        </View>
                    </View>
                </View>
            </LinearGradient>

            <View style={{ flexDirection: 'row', paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}><LightBox width={50} height={14} borderRadius={4} delay={600} /></View>
                <View style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}><LightBox width={50} height={14} borderRadius={4} delay={650} /></View>
            </View>

            <View style={{ padding: 20 }}>
                <LightBox width="100%" height={48} borderRadius={16} style={{ marginBottom: 20 }} delay={700} />
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                    <LightBox width={100} height={12} borderRadius={4} delay={750} />
                    <LightBox width={80} height={24} borderRadius={12} delay={800} />
                </View>

                {[1, 2, 3].map((_, i) => (
                    <View key={i} style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, borderColor: '#F1F5F9', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                        <LightBox width={26} height={26} borderRadius={13} delay={850 + (i * 100)} />
                        <View style={{ flex: 1 }}>
                            <LightBox width="70%" height={16} borderRadius={4} style={{ marginBottom: 6 }} delay={900 + (i * 100)} />
                            <LightBox width="40%" height={12} borderRadius={4} delay={950 + (i * 100)} />
                        </View>
                        <LightBox width={40} height={20} borderRadius={10} delay={1000 + (i * 100)} />
                    </View>
                ))}
            </View>
        </View>
    );
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LEGACY EXPORTS (kept for backward compatibility)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export const DashboardSkeleton = MealDashboardSkeleton;
export const CardListSkeleton = () => (
    <View style={{ flex: 1, padding: 20, gap: 14 }}>
        {[
            { w1: "40%", w2: "75%", w3: "50%" },
            { w1: "30%", w2: "60%", w3: "40%" },
            { w1: "50%", w2: "85%", w3: "55%" },
            { w1: "45%", w2: "70%", w3: "45%" }
        ].map((w, i) => (
            <View key={i} style={{
                backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#F0EDE6',
                padding: 18, flexDirection: 'row', alignItems: 'center',
            }}>
                <LightBox width={48} height={48} borderRadius={16} style={{ marginRight: 16 }} delay={i * 100} />
                <View style={{ flex: 1 }}>
                    <LightBox width={w.w1} height={16} borderRadius={5} style={{ marginBottom: 8 }} delay={(i * 100) + 50} />
                    <LightBox width={w.w2} height={12} borderRadius={4} style={{ marginBottom: 8 }} delay={(i * 100) + 100} />
                    <LightBox width={w.w3} height={12} borderRadius={4} delay={(i * 100) + 150} />
                </View>
                <LightBox width={44} height={44} borderRadius={22} delay={(i * 100) + 200} />
            </View>
        ))}
    </View>
);
export const ListSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#F9F7F2', padding: 24, paddingTop: 60 }}>
        <LightBox width="60%" height={40} borderRadius={10} style={{ marginBottom: 40 }} delay={0} />
        {[
            { w1: "75%", w2: "45%" },
            { w1: "60%", w2: "40%" },
            { w1: "85%", w2: "50%" },
            { w1: "70%", w2: "35%" },
            { w1: "55%", w2: "40%" }
        ].map((w, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
                <LightBox width={28} height={28} borderRadius={8} style={{ marginRight: 20 }} delay={100 + (i * 50)} />
                <View style={{ flex: 1 }}>
                    <LightBox width={w.w1} height={18} borderRadius={6} style={{ marginBottom: 8 }} delay={150 + (i * 50)} />
                    <LightBox width={w.w2} height={14} borderRadius={4} delay={200 + (i * 50)} />
                </View>
            </View>
        ))}
    </View>
);
export const FormSkeleton = () => (
    <View style={{ flex: 1, padding: 24, paddingTop: 40, backgroundColor: '#fff' }}>
        <LightBox width="50%" height={40} borderRadius={10} style={{ marginBottom: 16 }} delay={0} />
        <LightBox width="90%" height={24} borderRadius={6} style={{ marginBottom: 40 }} delay={50} />
        <LightBox width="40%" height={32} borderRadius={8} style={{ marginBottom: 20 }} delay={100} />
        <View style={{ flexDirection: 'row', gap: 14, marginBottom: 40 }}>
            <LightBox width={90} height={48} borderRadius={24} delay={150} />
            <LightBox width={110} height={48} borderRadius={24} delay={200} />
            <LightBox width={100} height={48} borderRadius={24} delay={250} />
        </View>
    </View>
);
export const ContentSkeleton = FormSkeleton;
