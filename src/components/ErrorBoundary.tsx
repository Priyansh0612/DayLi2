import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F5F0', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                    <StatusBar barStyle="dark-content" />
                    <Text style={{ fontSize: 48, marginBottom: 24 }}>🚧</Text>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: '#1C1917', textAlign: 'center', marginBottom: 12 }}>Something went wrong</Text>
                    <Text style={{ fontSize: 16, color: '#78716C', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
                        The app ran into an unexpected issue. Don't worry, your data is safe!
                    </Text>
                    <TouchableOpacity
                        onPress={() => this.setState({ hasError: false })}
                        style={{
                            backgroundColor: '#1C1917',
                            paddingHorizontal: 24,
                            paddingVertical: 16,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 4
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Try Again</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
