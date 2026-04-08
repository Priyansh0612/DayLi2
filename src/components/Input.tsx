import React, { useState, forwardRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, TextInputProps, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface InputProps extends TextInputProps {
    icon?: LucideIcon;
    rightIcon?: LucideIcon;
    onRightIconPress?: () => void;
    containerStyle?: StyleProp<ViewStyle>;
    error?: string | null;
    onPress?: () => void; // If provided, makes the input act as a button
}

const Input = forwardRef<TextInput, InputProps>(({
    icon: Icon,
    rightIcon: RightIcon,
    onRightIconPress,
    containerStyle,
    error,
    onPress,
    style, // Extract style to avoid passing it directly to TextInput container
    editable = true,
    ...props
}, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    // Common text style fix for "jumping" text
    const textInputStyle: StyleProp<TextStyle> = {
        flex: 1,
        height: '100%',
        paddingVertical: 0,
        textAlignVertical: 'center' as const,
        includeFontPadding: false,
        lineHeight: 20,
        fontSize: 14, // Slightly smaller to give letters breathing room in confined space
        color: '#4A3B43', // text-primary
        fontFamily: 'PlusJakartaSans_400Regular',
        ...(Platform.OS === 'web' ? { outline: 'none', whiteSpace: 'nowrap' } : {}),
    } as any;


    const ContainerComponent = onPress ? TouchableOpacity : View;

    return (
        <View className="mb-4" style={containerStyle}>
            {/* Input Wrapper */}
            <ContainerComponent
                activeOpacity={onPress ? 0.7 : 1}
                onPress={onPress}
                className={`w-full h-14 bg-white border rounded-xl px-4 flex-row items-center ${error ? 'border-red-400 bg-red-50' : isFocused ? 'border-primary' : 'border-gray-300'
                    }`}
            >
                {Icon && (
                    <View className="mr-3">
                        <Icon size={20} color={isFocused ? '#4A3B43' : '#94a3b8'} />
                    </View>
                )}

                <TextInput
                    ref={ref}
                    {...props}
                    multiline={false}
                    scrollEnabled={true}
                    editable={editable && !onPress}
                    placeholderTextColor="#94a3b8"
                    style={[textInputStyle, style]}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    pointerEvents={onPress ? 'none' : 'auto'}
                />

                {RightIcon && (
                    <TouchableOpacity onPress={onRightIconPress} disabled={!onRightIconPress}>
                        <RightIcon size={20} color="#52525b" />
                    </TouchableOpacity>
                )}
            </ContainerComponent>

            {/* Error Message */}
            {error && (
                <Text className="text-red-500 text-sm mt-1 ml-1 font-body">
                    {error}
                </Text>
            )}
        </View>
    );
});

export default Input;
