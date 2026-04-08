import React, { ReactNode } from 'react';
import { View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebSidebar } from './WebSidebar';
import { StatusBar } from 'expo-status-bar';

interface WebLayoutProps {
    children: ReactNode;
    // Optional: Right sidebar content?
    rightPanel?: ReactNode;
}

export const WebLayout = ({ children, rightPanel }: WebLayoutProps) => {
    if (Platform.OS !== 'web') {
        return <>{children}</>;
    }

    return (
        <View className="flex-1 bg-gray-50 flex-row h-screen w-screen overflow-hidden">
            <StatusBar style="dark" />

            {/* Left Sidebar (Navigation) */}
            <WebSidebar />

            {/* Main Content Area */}
            <View className="flex-1 h-full flex-col">
                {/* 
                   We create a "mock" safe area for web content so it doesn't hit the top edge 
                   too harshly if not desired, but usually sidebar handles spacing.
                   Most importantly, we want a scrollable area or a fixed area depending on screen.
                */}
                <View className="flex-1 overflow-auto bg-gray-50 relative">
                    {/* Max-width container for content readability if needed, or full width */}
                    <View className="flex-1 h-full w-full">
                        {children}
                    </View>
                </View>
            </View>

            {/* Right Panel (Optional Global Context) */}
            {rightPanel && (
                <View className="w-80 h-full bg-white border-l border-gray-200 hidden lg:flex flex-col p-6">
                    {rightPanel}
                </View>
            )}
        </View>
    );
};
