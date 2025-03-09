/**
 * Formats time in seconds to an object containing minutes and seconds
 *
 * This utility function converts a total number of seconds into a structured
 * object with separate minutes and seconds components. This is useful for
 * displaying time in a more human-readable format.
 *
 * The function handles the conversion by:
 * 1. Dividing the total seconds by 60 and flooring to get minutes
 * 2. Using modulo 60 to get the remaining seconds
 *
 * @param timeInSeconds Time in seconds to format
 * @returns Object containing minutes and seconds components
 *
 * @example
 * // Returns { minutes: 1, seconds: 30 }
 * formatTime(90);
 *
 * @example
 * // Returns { minutes: 0, seconds: 45 }
 * formatTime(45);
 */
export function formatTime(timeInSeconds: number): {
    minutes: number;
    seconds: number;
} {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return { minutes, seconds };
}
