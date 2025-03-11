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
 * Interfejs kontekstu dźwiękowego
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
    { type: "pause", duration: 2000 },
];

// Tworzenie kontekstu z wartością null (będzie nadpisana przez provider)
const SoundContext = createContext<SoundContextType | null>(null);

/**
 * Hook do używania kontekstu dźwiękowego
 * @returns Kontekst dźwiękowy
 * @throws Error jeśli używany poza SoundProvider
 */
export function useSoundContext(): SoundContextType {
    const context = useContext(SoundContext);

    if (!context) {
        throw new Error("useSoundContext must be used within a SoundProvider");
    }

    return context;
}

/**
 * Props dla SoundProvider
 */
interface SoundProviderProps {
    children: ReactNode;
}

/**
 * Provider kontekstu dźwiękowego
 * Inicjalizuje serwis dźwiękowy i udostępnia jego funkcje
 * @param children Komponenty potomne
 */
export function SoundProvider({ children }: SoundProviderProps) {
    // Referencja do serwisu dźwiękowego
    const [soundService] = useState<SoundService>(() => new SoundService());

    // Stan odtwarzania
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // Efekt do synchronizacji stanu isPlaying z serwisem
    useEffect(() => {
        // Funkcja do aktualizacji stanu isPlaying
        const updatePlayingState = () => {
            setIsPlaying(soundService.getIsPlaying());
        };

        // Aktualizuj stan co 100ms
        const intervalId = setInterval(updatePlayingState, 100);

        // Nasłuchuj na zdarzenie visibilitychange
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

    // Funkcja do odtwarzania dźwięku
    const playSound = useCallback(
        (name: string) => {
            return soundService.playSound(name);
        },
        [soundService]
    );

    // Funkcja do odtwarzania sekwencji dźwięków
    const playSequence = useCallback(
        (sequence: SoundSequence, onEnd?: () => void) => {
            return soundService.playSequence(sequence, onEnd);
        },
        [soundService]
    );

    // Funkcja do zatrzymywania odtwarzania
    const stopPlayback = useCallback(() => {
        soundService.stopPlayback();
    }, [soundService]);

    // Wartość kontekstu
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
