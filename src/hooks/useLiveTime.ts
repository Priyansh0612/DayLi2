import { useState, useEffect } from 'react';
import { AppState } from 'react-native';

export const useLiveTime = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        // 1. Update the clock every 60 seconds
        const timer = setInterval(() => setNow(new Date()), 60000);

        // 2. Instantly update the clock if they close and reopen the app
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                setNow(new Date());
            }
        });

        return () => {
            clearInterval(timer);
            subscription.remove();
        };
    }, []);

    // 3. Calculate "The Vibe"
    const hour = now.getHours();
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isNight = hour >= 17 || hour < 5;

    let greeting = 'Good Evening';
    if (isMorning) greeting = 'Good Morning';
    if (isAfternoon) greeting = 'Good Afternoon';

    // Format YYYY-MM-DD safely for your database filters
    const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return {
        now,
        todayString,
        isMorning,
        isAfternoon,
        isNight,
        greeting,
    };
};
