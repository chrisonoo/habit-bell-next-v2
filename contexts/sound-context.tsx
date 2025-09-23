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
    playSequenceLoop: (
        sequence: SoundSequence,
        maxLoops?: number,
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

// Add the new sequence after the defaultIntervalEndSequence
// Default sound sequence played when waiting for user to start next interval
export const defaultIntervalWaitingSequence: SoundSequence = [
    { type: "sound", name: "sound4" },
    { type: "pause", duration: 1000 },
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
    // Reference to the sound service, initialized to null on the server
    const [soundService, setSoundService] = useState<SoundService | null>(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Initialize sound service on the client side
    useEffect(() => {
        setSoundService(new SoundService());
    }, []);

    // Effect to synchronize isPlaying state with the service
    useEffect(() => {
        if (!soundService) return;

        // Function to update isPlaying state
        const updatePlayingState = () => {
            setIsPlaying(soundService.getIsPlaying());
        };

        // Update state every 300ms
        const intervalId = setInterval(updatePlayingState, 300);

        // Cleanup
        return () => {
            clearInterval(intervalId);
        };
    }, [soundService]);

    // Function to play sound
    const playSound = useCallback(
        (name: string) => {
            if (!soundService) return Promise.resolve();
            return soundService.playSound(name);
        },
        [soundService]
    );

    // Function to play sound sequences
    const playSequence = useCallback(
        (sequence: SoundSequence, onEnd?: () => void) => {
            if (!soundService) return Promise.resolve();
            return soundService.playSequence(sequence, onEnd);
        },
        [soundService]
    );

    // Function to play sound sequences in a loop
    const playSequenceLoop = useCallback(
        (sequence: SoundSequence, maxLoops = 3, onEnd?: () => void) => {
            if (!soundService) return Promise.resolve();
            return soundService.playSequenceLoop(sequence, maxLoops, onEnd);
        },
        [soundService]
    );

    // Function to stop playback
    const stopPlayback = useCallback(() => {
        if (!soundService) return;
        soundService.stopPlayback();
    }, [soundService]);

    const value: SoundContextType = {
        isPlaying,
        playSound,
        playSequence,
        playSequenceLoop,
        stopPlayback,
    };

    return (
        <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
    );
}
