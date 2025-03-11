"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from "react";
import { SoundService, type SoundSequence } from "@/services/sound-service";

/**
 * Sound context interface
 */
interface SoundContextType {
    isPlaying: boolean;
    playSound: (name: string) => Promise<void>;
    playSequence: (
        sequence: SoundSequence,
        onEnd?: () => void
    ) => Promise<void>;
    stopPlayback: () => void;
}

// Default sound sequence played when an interval ends
export const defaultIntervalEndSequence: SoundSequence = [
    { type: "sound", name: "sound1" },
    { type: "pause", duration: 1000 },
    { type: "sound", name: "sound2" },
    { type: "pause", duration: 800 },
    { type: "sound", name: "sound2" },
    { type: "pause", duration: 800 },
    { type: "sound", name: "sound2" },
    { type: "pause", duration: 800 },
    { type: "sound", name: "sound2" },
    { type: "pause", duration: 800 },
    { type: "sound", name: "sound2" },
    { type: "pause", duration: 1000 },
    { type: "sound", name: "sound3" },
];

// Creating context with null value (will be overwritten by provider)
const SoundContext = createContext<SoundContextType | null>(null);

/**
 * Hook for using sound context
 * @returns Sound context
 * @throws Error if used outside of SoundProvider
 */
export function useSoundContext(): SoundContextType {
    const context = useContext(SoundContext);

    if (!context) {
        throw new Error("useSoundContext must be used within a SoundProvider");
    }

    return context;
}

/**
 * Props for SoundProvider
 */
interface SoundProviderProps {
    children: ReactNode;
}

/**
 * Sound context provider
 * Initializes sound service and provides its functions
 * @param children Child components
 */
export function SoundProvider({ children }: SoundProviderProps) {
    // Reference to the sound service
    const [soundService] = useState<SoundService>(() => new SoundService());

    // Playback state
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Effect to synchronize isPlaying state with the service
    useEffect(() => {
        // Function to update isPlaying state
        const updatePlayingState = () => {
            setIsPlaying(soundService.getIsPlaying());
        };

        // Update state every 100ms
        const intervalId = setInterval(updatePlayingState, 100);

        // Listen for visibilitychange event
        const handleVisibilityChange = () => {
            if (document.hidden && soundService.getIsPlaying()) {
                soundService.stopPlayback();
                updatePlayingState();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Cleanup
        return () => {
            clearInterval(intervalId);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [soundService]);

    // Function to play sound
    const playSound = useCallback(
        (name: string) => {
            return soundService.playSound(name);
        },
        [soundService]
    );

    // Function to play sound sequences
    const playSequence = useCallback(
        (sequence: SoundSequence, onEnd?: () => void) => {
            return soundService.playSequence(sequence, onEnd);
        },
        [soundService]
    );

    // Function to stop playback
    const stopPlayback = useCallback(() => {
        soundService.stopPlayback();
    }, [soundService]);

    // Context value
    const value: SoundContextType = {
        isPlaying,
        playSound,
        playSequence,
        stopPlayback,
    };

    return (
        <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
    );
}
