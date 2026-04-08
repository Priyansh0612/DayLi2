import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, useWindowDimensions, Platform, InteractionManager } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Shadow, Rect } from '@shopify/react-native-skia';

const EtherealBackground = () => {
    const { width, height } = useWindowDimensions();
    // Default to false initially for both to ensure safe mounting
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'android') {
            // THE SAFE RENDER FIX: Wait for all navigation animations and layout
            // calculations to finish, THEN add a tiny 150ms buffer before hitting the GPU.
            const task = InteractionManager.runAfterInteractions(() => {
                setTimeout(() => {
                    setIsReady(true);
                }, 150);
            });
            return () => task.cancel();
        } else {
            // iOS handles Skia GPU threading synchronously without panicking
            setIsReady(true);
        }
    }, []);

    // ... Path definitions ...
    // 1. Top Canopy (Sweeps down from the top right to cradle the logo)
    const topWavePath = `M 0 0 
                         L ${width} 0 
                         L ${width} ${height * 0.45} 
                         C ${width * 0.6} ${height * 0.25}, 
                           ${width * 0.3} ${height * 0.5}, 
                           0 ${height * 0.2} Z`;


    // 3. Mid-Layer Flow (Rises from the middle-left to create depth)
    const midWavePath = `M 0 ${height * 0.4} 
                         C ${width * 0.4} ${height * 0.75}, 
                           ${width * 0.8} ${height * 0.55}, 
                           ${width} ${height * 0.7} 
                         L ${width} ${height} 
                         L 0 ${height} Z`;

    // 4. Foreground Matte Clay (Anchors the bottom for your login buttons)
    const bottomWavePath = `M 0 ${height * 0.75} 
                            C ${width * 0.35} ${height * 0.65}, 
                              ${width * 0.7} ${height * 0.9}, 
                              ${width} ${height * 0.8} 
                            L ${width} ${height} 
                            L 0 ${height} Z`;

    return (
        <View style={StyleSheet.absoluteFillObject}>
            {isReady ? (
                <Canvas style={{ flex: 1 }}>

                    {/* Base Canvas Gradient (Removes all "flat" white spots) */}
                    <Rect x={0} y={0} width={width} height={height}>
                        <LinearGradient
                            start={vec(0, 0)}
                            end={vec(width, height)}
                            colors={['#FDFCFE', '#F4F0FF']}
                        />
                    </Rect>

                    {/* Layer 1: Top Canopy (Vibrant Lavender/Periwinkle) */}
                    <Path path={topWavePath}>
                        <LinearGradient
                            start={vec(width, 0)}
                            end={vec(0, height * 0.4)}
                            colors={['#D5CDFB', '#FDFCFE']}
                        />
                        <Shadow dx={0} dy={15} blur={40} color="rgba(147, 112, 240, 0.06)" />
                    </Path>

                    {/* Layer 2: Mid-Layer Flow */}
                    <Path path={midWavePath}>
                        <LinearGradient
                            // Secret Trick: Push the start vector OFF the screen to the left
                            start={vec(-width * 0.3, height * 0.4)}
                            end={vec(width, height * 0.8)}
                            // Softened the starting color slightly
                            colors={['#EAE0FF', '#FDFCFE']}
                        />
                        {/* Slightly reduced the shadow opacity so it doesn't add fake darkness */}
                        <Shadow dx={0} dy={-15} blur={35} color="rgba(147, 112, 240, 0.05)" />
                    </Path>



                    {/* Layer 3: Foreground Matte Clay */}
                    <Path path={bottomWavePath}>
                        <LinearGradient
                            start={vec(0, height * 0.7)}
                            end={vec(width, height)}
                            colors={['#FFFFFF', '#F0E6FF']}
                        />
                        <Shadow dx={0} dy={-20} blur={40} color="rgba(0, 0, 0, 0.04)" />
                    </Path>

                </Canvas>
            ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#FDFCFE' }]} />
            )}

            {/* Tactile Paper / Film Grain Overlay */}
            <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
                <Image
                    source={{ uri: 'https://www.transparenttextures.com/patterns/stardust.png' }}
                    style={[StyleSheet.absoluteFillObject, { opacity: 0.06 }]}
                    resizeMode="repeat"
                />
            </View>
        </View>
    );
};

export default EtherealBackground;