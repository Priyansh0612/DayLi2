import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Platform,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    ActivityIndicator,
    Animated,
    Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Camera, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../config/supabase';
import { C } from './homeTokens';

// ─── Edit Profile Sheet ───────────────────────────────────────
const EditProfileSheet: React.FC<{
    visible: boolean;
    onClose: () => void;
    userId: string | null;
    currentProfile: any;
    onProfileUpdated: (updatedData: any) => void;
}> = ({ visible, onClose, userId, currentProfile, onProfileUpdated }) => {
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(600)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [username, setUsername] = useState('');
    const [institution, setInstitution] = useState('');
    const [campus, setCampus] = useState<'Thunder Bay' | 'Orillia' | null>(null);
    const [program, setProgram] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sync initial data when sheet opens
    useEffect(() => {
        if (visible && currentProfile) {
            setUsername(currentProfile.username || '');
            setInstitution(currentProfile.institution || '');
            setCampus(currentProfile.campus || null);
            setProgram(currentProfile.program || '');
            setAvatarUrl(currentProfile.avatar_url || null);

            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, bounciness: 6, speed: 14, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 600, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, currentProfile]);

    const handlePickImage = async () => {
        const options: any[] = [
            {
                text: "Choose from Library",
                onPress: async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                    if (!result.canceled && result.assets) uploadAvatar(result.assets[0].uri);
                }
            },
            { text: "Cancel", style: "cancel" }
        ];

        // 🔴 NEW: Add Remove option
        if (avatarUrl) {
            options.splice(1, 0, {
                text: "Remove Photo",
                style: "destructive",
                onPress: () => setAvatarUrl(null)
            });
        }

        Alert.alert("Profile Photo", "Choose a source", options);
    };

    const uploadAvatar = async (uri: string) => {
        try {
            setIsUploading(true);
            const response = await fetch(uri);
            const arrayBuffer = await response.arrayBuffer();
            const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const fileName = `${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, arrayBuffer, { contentType: `image/${fileExt}` });
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
            if (data) setAvatarUrl(data.publicUrl);
        } catch (error: any) {
            Alert.alert('Upload Failed', 'Could not upload image.');
        } finally {
            setIsUploading(false);
        }
    };


    const handleSave = async () => {
        if (!userId || !username.trim()) {
            Alert.alert("Required", "Username cannot be empty.");
            return;
        }
        setIsSaving(true);
        try {
            const updates = {
                id: userId,
                username,
                institution,
                campus,
                program,
                avatar_url: avatarUrl,
                updated_at: new Date()
            };
            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;

            onProfileUpdated(updates);
            onClose();
        } catch (error: any) {
            Alert.alert("Error", "Could not save profile details.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!currentProfile) return null;

    return (
        <View pointerEvents={visible ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 500, justifyContent: 'flex-end' }}>
            <Animated.View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(26,25,22,0.42)', opacity: fadeAnim }}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxHeight: '90%' }}>
                <Animated.View style={{ backgroundColor: C.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : Math.max(insets.bottom + 20, 28), shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.14, shadowRadius: 36, elevation: 20, transform: [{ translateY: slideAnim }] }}>

                    <View style={{ width: 34, height: 4, borderRadius: 4, backgroundColor: C.line, alignSelf: 'center', marginBottom: 18 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Text style={{ fontSize: 20, fontFamily: 'Outfit_700Bold', color: C.primary }}>Edit Profile</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={22} color={C.muted} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Avatar Picker */}
                        <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={{ alignSelf: 'center', marginBottom: 24, position: 'relative' }}>
                            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.tint, borderWidth: 1, borderColor: C.line, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                                {/* 🔴 NEW: Unified Fallback UI */}
                                {isUploading ? (
                                    <ActivityIndicator color={C.academic} />
                                ) : avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                                ) : username ? (
                                    <LinearGradient colors={['#818cf8', '#6366f1']} style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontSize: 36, fontWeight: 'bold', color: '#FFF', fontFamily: 'Outfit_700Bold' }}>
                                            {username.charAt(0).toUpperCase()}
                                        </Text>
                                    </LinearGradient>
                                ) : (
                                    <User size={36} color={C.muted} />
                                )}
                            </View>
                            <View style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.primary, borderWidth: 2, borderColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
                                <Camera size={14} color="#FFF" />
                            </View>
                        </TouchableOpacity>

                        {/* Fields */}
                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Username</Text>
                        <TextInput style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: C.ink, marginBottom: 16 }} value={username} onChangeText={setUsername} placeholder="e.g. Priyansh" />

                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Institution</Text>
                                <TextInput style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: C.ink }} value={institution} onChangeText={setInstitution} placeholder="e.g. Lakehead" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Program</Text>
                                <TextInput style={{ height: 54, backgroundColor: C.tint, borderRadius: 16, paddingHorizontal: 16, fontSize: 16, color: C.ink }} value={program} onChangeText={setProgram} placeholder="e.g. Comp Sci" />
                            </View>
                        </View>

                        <Text style={{ fontSize: 12, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.8 }} className="font-body-bold">Campus</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
                            {['Thunder Bay', 'Orillia'].map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    onPress={() => setCampus(c as any)}
                                    style={{ flex: 1, height: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: campus === c ? C.academicL : C.tint, borderColor: campus === c ? C.academic : C.line }}
                                >
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: campus === c ? C.academic : C.muted }} className="font-body-bold">{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={isSaving}
                            style={{ height: 56, borderRadius: 18, backgroundColor: C.academic, alignItems: 'center', justifyContent: 'center', shadowColor: C.academic, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, marginBottom: 10 }}
                        >
                            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }} className="font-body-bold">
                                {isSaving ? "Saving..." : "Save Profile"}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
};

export default EditProfileSheet;
