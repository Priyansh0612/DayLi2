import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ActivityIndicator, Image, StatusBar, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { supabase } from '../config/supabase';
import * as ImagePicker from 'expo-image-picker';
import { Camera, User, School, MapPin, GraduationCap, Mail, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing, FadeIn, FadeOut } from 'react-native-reanimated';
import { searchUniversities, University } from '../data/universities';
import EtherealBackground from '../components/EtherealBackground';
import { LinearGradient } from 'expo-linear-gradient';

// --- FROSTED INPUT COMPONENT ---
const FrostedInput = React.forwardRef<TextInput, any>(({ icon: Icon, rightIcon: RightIcon, onRightIconPress, onPress, error, containerStyle, disabled, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    const iconAndTextColor = '#5A5370';
    const placeholderColor = '#8A849E';
    const focusBrandColor = '#7C61EE'; // Used to highlight active state

    const textInputStyle: any = {
        flex: 1,
        height: '100%',
        paddingVertical: 0,
        textAlignVertical: 'center' as const,
        includeFontPadding: false,
        lineHeight: 20,
        fontSize: 16,
        color: '#1A1630',
        fontFamily: 'PlusJakartaSans_500Medium',
        ...(Platform.OS === 'web' ? { outline: 'none', whiteSpace: 'nowrap' } : {}),
    };

    const inner = (
        <>
            {Icon && <Icon size={20} color={isFocused ? focusBrandColor : iconAndTextColor} strokeWidth={1.8} style={{ marginRight: 12 }} />}
            <TextInput
                ref={ref}
                {...props}
                multiline={false}
                scrollEnabled={false}
                editable={!disabled && !onPress}
                placeholderTextColor={placeholderColor}
                style={textInputStyle}
                onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
                onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
                autoCapitalize={props.autoCapitalize || "none"}
            />
            {RightIcon && (
                <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress} style={{ padding: 4 }}>
                    <RightIcon size={20} color={iconAndTextColor} strokeWidth={1.8} />
                </TouchableOpacity>
            )}
        </>
    );

    return (
        <View style={[{ marginBottom: 16, opacity: disabled ? 0.6 : 1 }, containerStyle]}>
            {/* 1. THE LIFT: A dedicated wrapper to cast a soft drop shadow without getting clipped */}
            <View style={{
                shadowColor: '#1A1630', // Deep ink color for the shadow
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isFocused ? 0.12 : 0.05, // Shadow deepens when focused
                shadowRadius: 16,
                elevation: isFocused ? 4 : 2,
            }}>
                {/* 2. THE GLASS: The actual input container */}
                <View style={{
                    height: 60,
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderWidth: 1.5,
                    // 3. THE SNAP: Border turns brand purple when tapped, stays bright white otherwise
                    borderColor: error ? '#ef4444' : (isFocused ? focusBrandColor : 'rgba(255, 255, 255, 0.9)'),
                }}>
                    {Platform.OS === 'ios' ? (
                        <BlurView
                            intensity={isFocused ? 40 : 50}
                            tint="light"
                            style={{
                                flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
                                // Slightly thicker white base to ensure text remains readable
                                backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.25)',
                            }}
                        >
                            {inner}
                        </BlurView>
                    ) : (
                        <View style={{
                            flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18,
                            backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.6)',
                        }}>
                            {inner}
                        </View>
                    )}
                </View>
            </View>
            {error && <Text style={{ color: '#ef4444', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 6, marginLeft: 16 }}>{error}</Text>}
        </View>
    );
});

// --- INLINE AUTOCOMPLETE INSTITUTION FIELD (FROSTED) ---
const InstitutionField = ({ value, onSelect, error }: {
    value: string;
    onSelect: (name: string) => void;
    error?: string | null;
}) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<University[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        if (isFocused && query.trim().length >= 2) {
            const found = searchUniversities(query);
            setResults(found);
            setShowDropdown(found.length > 0);
        } else {
            setResults([]);
            setShowDropdown(false);
        }
    }, [query, isFocused]);

    const handleSelect = (name: string) => {
        setQuery(name);
        setShowDropdown(false);
        setIsFocused(false);
        onSelect(name);
    };

    const handleChangeText = (text: string) => {
        setQuery(text);
        if (text.trim() === '') {
            onSelect('');
        }
    };

    return (
        <View style={{ marginBottom: 16, zIndex: 100 }}>
            <FrostedInput
                icon={School}
                placeholder="Search your university..."
                value={query}
                onChangeText={handleChangeText}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setTimeout(() => {
                        setIsFocused(false);
                        setShowDropdown(false);
                    }, 150);
                }}
                error={error}
                containerStyle={{ marginBottom: 0 }}
            />

            {/* Dropdown */}
            {showDropdown && (
                <View
                    style={{
                        marginTop: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderWidth: 1,
                        borderColor: 'rgba(124, 97, 238, 0.2)',
                        borderRadius: 16,
                        maxHeight: 220,
                        overflow: 'hidden',
                        shadowColor: '#7C61EE',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.1,
                        shadowRadius: 16,
                        elevation: 8,
                    }}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled={true}
                    >
                        {results.map((item, idx) => (
                            <TouchableOpacity
                                key={`${item.name}-${idx}`}
                                onPress={() => handleSelect(item.name)}
                                style={{
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderTopWidth: idx === 0 ? 0 : 1,
                                    borderTopColor: 'rgba(124, 97, 238, 0.1)',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(124, 97, 238, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                                    <School size={14} color="#7C61EE" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#1A1630' }}>{item.name}</Text>
                                    {item.province && (
                                        <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', color: '#5A5370', marginTop: 2 }}>
                                            {item.province} · {item.country}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

export default function ProfileSetupScreen({ onProfileComplete }: { onProfileComplete: () => void }) {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [savedState, setSavedState] = useState(false);

    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [institution, setInstitution] = useState('');
    const [campus, setCampus] = useState('');
    const [program, setProgram] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.email) setEmail(user.email);
        });
    }, []);

    const pickImage = async () => {
        const options: any[] = [
            {
                text: "Take Photo", onPress: async () => {
                    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
                    if (!granted) return Alert.alert("Camera permission required!");
                    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, aspect: [1, 1], quality: 0.8 });
                    if (!result.canceled && result.assets) uploadAvatar(result.assets[0].uri);
                }
            },
            {
                text: "Choose from Library", onPress: async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                    if (!result.canceled && result.assets) uploadAvatar(result.assets[0].uri);
                }
            },
            { text: "Cancel", style: "cancel" }
        ];
        if (avatarUrl) {
            options.splice(2, 0, { text: "Remove Photo", style: "destructive", onPress: () => setAvatarUrl(null) });
        }
        Alert.alert("Profile Photo", "Choose a source", options);
    };

    const uploadAvatar = async (uri: string) => {
        try {
            setUploading(true);
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const fileName = `${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, arrayBuffer, { contentType: `image/${fileExt}` });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            if (data) setAvatarUrl(data.publicUrl);
        } catch (error: any) {
            Alert.alert('Upload Failed', error.message || 'Could not upload image.');
        } finally {
            setUploading(false);
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!username.trim()) newErrors.username = "Required";
        if (!institution.trim()) newErrors.institution = "Required";
        if (!program.trim()) newErrors.program = "Required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            let currentTermId = null;
            const { data: term } = await supabase
                .from('academic_terms')
                .select('id')
                .eq('university_name', institution.trim())
                .eq('term_name', 'Winter 2026')
                .single();
            if (term) currentTermId = term.id;

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username,
                institution,
                campus: campus.trim() || null,
                program,
                email,
                avatar_url: avatarUrl,
                current_term_id: currentTermId,
                updated_at: new Date()
            });
            if (error) throw error;

            setSavedState(true);
            setTimeout(() => onProfileComplete(), 1500);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white relative overflow-hidden">
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            {/* Ethereal Ambient Mesh Background */}
            <EtherealBackground />

            <View style={{ flex: 1, paddingTop: insets.top }} className="relative z-10 w-full">
                <KeyboardAwareScrollView
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                    enableOnAndroid={true}
                    extraScrollHeight={Platform.OS === 'ios' ? 20 : 0}
                    enableAutomaticScroll={Platform.OS === 'ios'}
                >
                    <View style={{ flex: 1, paddingBottom: insets.bottom > 0 ? insets.bottom : 24, paddingTop: 48 }}>
                        {savedState ? (
                            <Animated.View entering={FadeIn.duration(400)} className="items-center justify-center flex-1" style={{ paddingTop: 40, paddingBottom: 60 }}>
                                <View style={{
                                    width: 100, height: 100, borderRadius: 50,
                                    backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                    borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.8)',
                                    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
                                    shadowColor: '#7C61EE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24,
                                    overflow: 'hidden'
                                }}>
                                    <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                                    <Sparkles size={40} color="#7C61EE" strokeWidth={1.5} />
                                </View>
                                <Text style={{ color: '#1A1630', fontFamily: 'Outfit_700Bold', fontSize: 32, marginBottom: 8, textAlign: 'center' }}>
                                    You're In.
                                </Text>
                                <Text style={{ color: '#5A5370', fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16, textAlign: 'center', paddingHorizontal: 24, lineHeight: 24 }}>
                                    Profile successfully created. Taking you to your dashboard, {username}...
                                </Text>
                                <ActivityIndicator color="#7C61EE" size="large" style={{ marginTop: 32 }} />
                            </Animated.View>
                        ) : (
                            <Animated.View exiting={FadeOut.duration(300)}>
                                {/* Welcome Block */}
                                <View style={{ paddingHorizontal: 8, marginBottom: 28 }}>
                                    <Text style={{ color: '#1A1630', fontFamily: 'Outfit_700Bold', fontSize: 30, marginBottom: 4 }}>
                                        Complete Your Profile
                                    </Text>
                                    <Text style={{ color: '#5A5370', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 15 }}>
                                        Tell us a bit about yourself.
                                    </Text>
                                </View>

                                {/* Avatar Picker */}
                                <View className="items-center mb-8">
                                    <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={{ alignItems: 'center' }}>
                                        <View
                                            style={{
                                                width: 100,
                                                height: 100,
                                                borderRadius: 50,
                                                backgroundColor: 'rgba(255,255,255,0.4)',
                                                borderWidth: 2,
                                                borderColor: 'rgba(255,255,255,0.8)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden',
                                                shadowColor: '#7C61EE',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 10,
                                            }}
                                        >
                                            <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                                            {uploading ? (
                                                <ActivityIndicator color="#7C61EE" />
                                            ) : avatarUrl ? (
                                                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                                            ) : username ? (
                                                <View style={{ width: '100%', height: '100%', backgroundColor: '#7C61EE', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 38, color: '#FFF', fontFamily: 'Outfit_700Bold' }}>{username.charAt(0).toUpperCase()}</Text>
                                                </View>
                                            ) : (
                                                <User size={36} color="#7C61EE" opacity={0.5} />
                                            )}
                                        </View>
                                        <View
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: 32,
                                                height: 32,
                                                borderRadius: 16,
                                                backgroundColor: '#7C61EE',
                                                borderWidth: 3,
                                                borderColor: '#FDFCFE',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                shadowColor: '#9370F0',
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.3,
                                                shadowRadius: 6,
                                            }}
                                        >
                                            <Camera color="white" size={14} />
                                        </View>
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 12, marginTop: 12, fontFamily: 'PlusJakartaSans_500Medium', color: '#5A5370' }}>Tap to add photo</Text>
                                </View>

                                {/* Form Fields */}
                                <FrostedInput
                                    icon={Mail}
                                    placeholder="Email"
                                    value={email || 'user@example.com'}
                                    disabled={true}
                                />
                                <FrostedInput
                                    icon={User}
                                    value={username}
                                    onChangeText={(t: string) => { setUsername(t); setErrors(p => ({ ...p, username: null })); }}
                                    placeholder="Username (e.g. Alex)"
                                    error={errors.username}
                                />

                                {/* Institution Autocomplete */}
                                <InstitutionField
                                    value={institution}
                                    onSelect={(name: string) => { setInstitution(name); setErrors(p => ({ ...p, institution: null })); }}
                                    error={errors.institution}
                                />

                                {/* Campus & Program */}
                                <FrostedInput
                                    icon={MapPin}
                                    value={campus}
                                    onChangeText={(t: string) => setCampus(t)}
                                    placeholder="Campus (Optional)"
                                />
                                <FrostedInput
                                    icon={GraduationCap}
                                    value={program}
                                    onChangeText={(t: string) => { setProgram(t); setErrors(p => ({ ...p, program: null })); }}
                                    placeholder="Program (e.g. Comp Sci)"
                                    error={errors.program}
                                />

                                {/* Spacer */}
                                <View style={{ height: 16 }} />

                                {/* Primary Save Button */}
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={loading}
                                    activeOpacity={0.88}
                                    style={{
                                        height: 58,
                                        borderRadius: 999,
                                        overflow: 'hidden',
                                        marginBottom: 32,
                                        shadowColor: '#9370F0',
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 15,
                                        elevation: 8
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#7C61EE', '#9370F0']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                                    >
                                        {loading ? (
                                            <>
                                                <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                                                <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, includeFontPadding: false }}>Saving Profile...</Text>
                                            </>
                                        ) : (
                                            <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, includeFontPadding: false }}>Save Profile & Continue</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>
                </KeyboardAwareScrollView>
            </View>
        </View>
    );
}
