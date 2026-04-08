import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    Platform, Keyboard, ActivityIndicator, Alert,
    Modal, KeyboardAvoidingView, StyleSheet
} from 'react-native';
import { BlurView } from 'expo-blur';
import { X, MailOpen } from 'lucide-react-native';
import { supabase } from '../../config/supabase';

const CODE_LENGTH = 6;

const C = {
    ink: '#1A1916',
    muted: '#7A6E68',
    ghost: '#B2A89E',
    primary: '#4A3B43',
    academic: '#6366f1',
    line: '#EBEBEB',
    tint: '#F3F4FF',
    surface: '#FFFFFF',
};

interface OTPModalProps {
    visible: boolean;
    email: string;
    onClose: () => void;
    onSuccess?: () => void;
}

const OTPModal: React.FC<OTPModalProps> = ({ visible, email, onClose, onSuccess }) => {
    // 🌟 CHANGED: Code is now just a simple string instead of an array!
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    
    // 🌟 CHANGED: Only one reference needed now
    const inputRef = useRef<TextInput | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (visible) {
            setCode('');
            setLoading(false);
            resetCountdown();
            // Increased delay slightly to 600ms to ensure layout measurement is ready
            setTimeout(() => inputRef.current?.focus(), 600);
        } else {

            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [visible]);

    const resetCountdown = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCountdown(60);
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // 🌟 CHANGED: Much simpler handler for the single input
    const handleChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, ''); // Ensure only numbers
        setCode(cleaned);

        if (cleaned.length === CODE_LENGTH) {
            Keyboard.dismiss();
            handleVerify(cleaned);
        }
    };

    const handleVerify = async (otp?: string) => {
        const token = otp ?? code;
        if (token.length < CODE_LENGTH) return;
        
        setLoading(true);
        try {
            const { error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup',
            });
            if (error) throw error;
            
            if (onSuccess) onSuccess();
            onClose(); 
        } catch (err: any) {
            Alert.alert('Invalid Code', err.message ?? 'The code entered is incorrect. Please try again.');
            setCode(''); // Reset on failure
            inputRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) throw error;
            resetCountdown();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1, justifyContent: 'flex-end' }}
            >
                {/* Dark/Blur Backdrop */}
                <View style={StyleSheet.absoluteFill}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill}>
                        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
                    </BlurView>
                </View>

                {/* Bottom Sheet Content */}
                <View style={{ 
                    backgroundColor: C.surface, 
                    borderTopLeftRadius: 32, 
                    borderTopRightRadius: 32, 
                    paddingHorizontal: 24, 
                    paddingTop: 12, 
                    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    elevation: 20
                }}>
                    <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 20 }} />

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                        <View style={{ flex: 1 }}>
                            <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: C.tint, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                <MailOpen size={24} color={C.academic} strokeWidth={2} />
                            </View>
                            <Text style={{ fontSize: 24, fontFamily: 'Outfit_700Bold', color: C.ink, marginBottom: 8 }}>
                                Verify email
                            </Text>
                            <Text style={{ fontSize: 14, color: C.muted, lineHeight: 20 }}>
                                We sent a 6-digit code to{'\n'}
                                <Text style={{ color: C.academic, fontWeight: '600' }}>{email}</Text>
                            </Text>
                        </View>
                        
                        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} color={C.muted} strokeWidth={2.5} />
                        </TouchableOpacity>
                    </View>

                    {/* 🌟 THE INVISIBLE INPUT TRICK 🌟 */}
                    <View style={{ position: 'relative', marginBottom: 32 }}>
                        {/* 1. The Real (Invisible) Input */}
                        <TextInput
                            ref={inputRef}
                            value={code}
                            onChangeText={handleChange}
                            maxLength={CODE_LENGTH}
                            keyboardType="number-pad"
                            autoComplete="one-time-code" // Helps iOS auto-fill from messages!
                            style={{
                                position: 'absolute',
                                width: '100%',
                                height: 56, // Match the visual box height
                                zIndex: 10,
                                opacity: 0.01, // Using 0.01 instead of 0 to fix "Error measuring text field"
                            }}
                        />


                        {/* 2. The Fake Visual Boxes underneath */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', pointerEvents: 'none' }}>
                            {Array(CODE_LENGTH).fill(0).map((_, i) => {
                                const char = code[i] || '';
                                // Highlight the box that is currently active
                                const isFocused = code.length === i || (code.length === CODE_LENGTH && i === CODE_LENGTH - 1);
                                
                                return (
                                    <View key={i} style={{
                                        width: 46,
                                        height: 56,
                                        borderRadius: 14,
                                        borderWidth: char ? 2 : (isFocused ? 2 : 1.5),
                                        borderColor: char ? C.academic : (isFocused ? C.academic : C.line),
                                        backgroundColor: char ? C.tint : '#FAFAFA',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Text style={{ fontSize: 22, fontFamily: 'Outfit_700Bold', color: C.academic }}>
                                            {char}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        onPress={() => handleVerify()}
                        disabled={loading || code.length < CODE_LENGTH}
                        style={{
                            height: 56,
                            borderRadius: 18,
                            backgroundColor: code.length === CODE_LENGTH ? C.academic : 'rgba(99,102,241,0.15)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={{ color: code.length === CODE_LENGTH ? '#fff' : 'rgba(99,102,241,0.5)', fontSize: 16, fontWeight: '700' }}>
                                Verify Code
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Resend Logic */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Text style={{ color: C.ghost, fontSize: 13 }}>Didn't receive it?</Text>
                        {resendLoading ? (
                            <ActivityIndicator size="small" color={C.academic} />
                        ) : countdown > 0 ? (
                            <Text style={{ color: C.muted, fontSize: 13, fontWeight: '600' }}>Resend in {countdown}s</Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                                <Text style={{ color: C.academic, fontSize: 13, fontWeight: '700' }}>Resend code</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default OTPModal;
