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
 * Defines the shape of the Sound Context.
 * It provides the state of audio playback and functions to control it.
 */
interface SoundContextType {
    /** @property {boolean} isPlaying - A boolean indicating if any sound is currently playing. */
    isPlaying: boolean;
    /**
     * A function to play a single sound by name.
     * @param {string} name - The name of the sound to play.
     * @returns {Promise<void>} A promise that resolves when the sound finishes playing.
     */
    playSound: (name: string) => Promise<void>;
    /**
     * A function to play a sequence of sounds and pauses.
     * @param {SoundSequence} sequence - The sequence to play.
     * @param {() => void} [onEnd] - An optional callback to run when the sequence finishes.
     * @returns {Promise<void>} A promise that resolves when the sequence starts.
     */
    playSequence: (
        sequence: SoundSequence,
        onEnd?: () => void
    ) => Promise<void>;
    /**
     * A function to play a sequence in a loop.
     * @param {SoundSequence} sequence - The sequence to loop.
     * @param {number} [maxLoops] - The number of times to loop.
     * @param {() => void} [onEnd] - An optional callback to run when looping finishes.
     * @returns {Promise<void>} A promise that resolves when the sequence starts.
     */
    playSequenceLoop: (
        sequence: SoundSequence,
        maxLoops?: number,
        onEnd?: () => void
    ) => Promise<void>;
    /** A function to stop all current audio playback immediately. */
    stopPlayback: () => void;
}

/**
 * The default sound sequence played when a work interval successfully ends.
 */
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

/**
 * The default sound sequence played while waiting for the user to start the next interval.
 * This is typically a short, repeating sound to get the user's attention.
 */
export const defaultIntervalWaitingSequence: SoundSequence = [
    { type: "sound", name: "sound4" },
    { type: "pause", duration: 1000 },
];

/**
 * The React Context object for sound-related functionalities.
 * It is initialized with `null` and will be provided a value by the `SoundProvider`.
 */
const SoundContext = createContext<SoundContextType | null>(null);

/**
 * A custom hook to easily access the SoundContext.
 * @returns {SoundContextType} The sound context.
 * @throws {Error} If used outside of a `SoundProvider`.
 */
export function useSoundContext(): SoundContextType {
    const context = useContext(SoundContext);

    if (!context) {
        throw new Error("useSoundContext must be used within a SoundProvider");
    }

    return context;
}

/**
 * Defines the props for the SoundProvider component.
 */
interface SoundProviderProps {
    /** @property {ReactNode} children - The child components that will have access to this context. */
    children: ReactNode;
}

/**
 * The provider component for the SoundContext.
 * It instantiates the `SoundService` on the client-side and exposes its
 * functionalities through the context to the rest of the application.
 */
export function SoundProvider({ children }: SoundProviderProps) {
    // A state to hold the instance of the SoundService. Initialized as null on the server.
    const [soundService, setSoundService] = useState<SoundService | null>(null);

    // A state to track the current playback status of the sound service.
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    /**
     * An effect hook that initializes the SoundService instance, but only on the client-side.
     * This prevents server-side rendering errors since SoundService uses browser-only APIs.
     */
    useEffect(() => {
        setSoundService(new SoundService());
    }, []);

    /**
     * An effect hook to periodically synchronize the `isPlaying` state
     * with the actual state from the `soundService`.
     */
    useEffect(() => {
        if (!soundService) return;

        // Function to update the local `isPlaying` state from the service.
        const updatePlayingState = () => {
            setIsPlaying(soundService.getIsPlaying());
        };

        // Poll the service every 300ms to check the playback status.
        const intervalId = setInterval(updatePlayingState, 300);

        // Cleanup the interval when the component unmounts or the service changes.
        return () => {
            clearInterval(intervalId);
        };
    }, [soundService]);

    /**
     * A memoized callback to play a single sound.
     * It guards against calls before the sound service is initialized.
     */
    const playSound = useCallback(
        (name: string) => {
            if (!soundService) return Promise.resolve();
            return soundService.playSound(name);
        },
        [soundService]
    );

    /**
     * A memoized callback to play a sound sequence.
     */
    const playSequence = useCallback(
        (sequence: SoundSequence, onEnd?: () => void) => {
            if (!soundService) return Promise.resolve();
            return soundService.playSequence(sequence, onEnd);
        },
        [soundService]
    );

    /**
     * A memoized callback to play a sound sequence in a loop.
     */
    const playSequenceLoop = useCallback(
        (sequence: SoundSequence, maxLoops = 3, onEnd?: () => void) => {
            if (!soundService) return Promise.resolve();
            return soundService.playSequenceLoop(sequence, maxLoops, onEnd);
        },
        [soundService]
    );

    /**
     * A memoized callback to stop all playback.
     */
    const stopPlayback = useCallback(() => {
        if (!soundService) return;
        soundService.stopPlayback();
    }, [soundService]);

    // The value object provided to the context consumers.
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
