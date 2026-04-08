import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, ChevronRight, User, Settings, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C } from './homeTokens';

// ─── Profile Sheet ────────────────────────────────────────────
const ProfileSheet: React.FC<{
    visible: boolean; onClose: () => void;
    username: string | null; avatarUrl: string | null;
    onLogout: () => void;
    onEditClick: () => void;
}> = ({ visible, onClose, username, avatarUrl, onLogout, onEditClick }) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, bounciness: 6, speed: 14, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const displayName = username || 'User';
    const initials = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

    return (
        <View pointerEvents={visible ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 100, justifyContent: 'flex-end' }}>
            <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,25,22,0.42)', opacity: fadeAnim }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
            </Animated.View>
            <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom + 20, 28), shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.14, shadowRadius: 36, elevation: 20, transform: [{ translateY: slideAnim }] }}>
                <View style={{ width: 34, height: 4, borderRadius: 4, backgroundColor: C.line, alignSelf: 'center', marginBottom: 18 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 20 }}>
                    <View style={{ width: 54, height: 54, borderRadius: 27, overflow: 'hidden', shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.20, shadowRadius: 12, elevation: 4 }}>
                        {avatarUrl
                            ? <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                            : <LinearGradient colors={['#818cf8', '#6366f1']} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 22, color: '#fff' }}>{initials}</Text>
                            </LinearGradient>
                        }
                    </View>
                    <View>
                        <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 20, color: C.primary }}>{displayName}</Text>
                        <Text style={{ fontSize: 12, color: C.muted, fontWeight: '500', marginTop: 2 }} className="font-body">Student Account</Text>
                    </View>
                </View>
                {[
                    { icon: <User size={17} color={C.muted} strokeWidth={2} />, label: 'Edit Profile', onPress: onEditClick },
                    { icon: <Settings size={17} color={C.muted} strokeWidth={2} />, label: 'Settings' },
                    { icon: <Bell size={17} color={C.muted} strokeWidth={2} />, label: 'Notifications' },
                ].map((item) => (
                    <TouchableOpacity key={item.label} onPress={item.onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 13, borderRadius: 15 }} activeOpacity={item.onPress ? 0.7 : 1}>
                        {item.icon}
                        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: C.ink }} className="font-body-bold">{item.label}</Text>
                        <ChevronRight size={14} color={C.ghost} strokeWidth={2} />
                    </TouchableOpacity>
                ))}
                <View style={{ height: 1, backgroundColor: C.line, marginVertical: 6 }} />
                <TouchableOpacity onPress={onLogout} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 13, borderRadius: 15 }} activeOpacity={0.7}>
                    <LogOut size={17} color={C.red} strokeWidth={2} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: C.red }} className="font-body-bold">Log Out</Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export default ProfileSheet;
