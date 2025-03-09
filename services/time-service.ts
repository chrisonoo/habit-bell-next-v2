/**
 * Formatuje czas w sekundach na obiekt zawierający minuty i sekundy
 * @param timeInSeconds Czas w sekundach
 * @returns Obiekt zawierający minuty i sekundy
 */
export function formatTime(timeInSeconds: number): {
    minutes: number;
    seconds: number;
} {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return { minutes, seconds };
}
