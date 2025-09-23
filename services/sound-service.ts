/**
 * Type representing a sound sequence item
 * Can be a sound to play or a pause
 */
export type SoundSequenceItem =
    | { type: "sound"; name: string }
    | { type: "pause"; duration: number }; // in milliseconds

/**
 * Type representing a sound sequence
 * A sequence is an array of sequence items
 */
export type SoundSequence = SoundSequenceItem[];

/**
 * Manages loading, buffering, and playback of audio sounds and sequences.
 * This service can play individual sounds, sequences of sounds and pauses, and loop sequences.
 * It is intended to be used as a singleton within a client-side context.
 */
export class SoundService {
    /** @private A map to store preloaded HTMLAudioElement instances, keyed by a friendly name. */
    private audioElements: Map<string, HTMLAudioElement> = new Map();

    /** @private A flag indicating if a sound or sequence is currently playing. */
    private isPlaying = false;

    /** @private The current sequence of sounds and pauses being played. */
    private currentSequence: SoundSequence | null = null;

    /** @private The index of the item currently being played in the `currentSequence`. */
    private currentSequenceIndex = 0;

    /** @private The timer ID for the current pause in a sequence, used to clear the timeout if playback is stopped. */
    private pauseTimerId: NodeJS.Timeout | null = null;

    /** @private A callback function to be executed when the current sequence finishes. */
    private onSequenceEndCallback: (() => void) | null = null;

    /** @private A counter for the number of times a sequence has been looped. */
    private loopCount = 0;

    /** @private The maximum number of times a sequence should loop. 0 means infinite. */
    private maxLoops = 0;

    /**
     * Initializes the SoundService.
     * This constructor should only be called on the client-side, as it interacts with browser APIs.
     */
    constructor() {
        console.log("[SOUND][01] Initializing sound service");
        this.loadDefaultSounds();
    }

    /**
     * Loads default sounds used in the application
     */
    private loadDefaultSounds(): void {
        this.loadSound("sound1", "/sounds/sound1.mp3");
        this.loadSound("sound2", "/sounds/sound2.mp3");
        this.loadSound("sound3", "/sounds/sound3.mp3");
        this.loadSound("sound4", "/sounds/sound4.mp3");
    }

    /**
     * Loads a sound from a given URL and prepares it for playback.
     * The loaded sound is stored in the `audioElements` map.
     * This method should only be called on the client-side.
     *
     * @param name - A friendly name to identify the sound later.
     * @param url - The URL of the audio file to load.
     */
    public loadSound(name: string, url: string): void {
        try {
            const audio = new Audio(url);
            audio.preload = "auto";

            // Add error handling for loading
            audio.onerror = (error) => {
                console.error(
                    `[SOUND][02] Error loading sound ${name}:`,
                    error
                );
            };

            // Add sound to the map
            this.audioElements.set(name, audio);
            console.log(`[SOUND][03] Sound ${name} loaded from ${url}`);
        } catch (error) {
            console.error(
                `[SOUND][04] Error creating audio element for ${name}:`,
                error
            );
        }
    }

    /**
     * Plays a preloaded sound by its name.
     *
     * @param name - The name of the sound to play.
     * @returns A promise that resolves when the sound has finished playing.
     */
    public async playSound(name: string): Promise<void> {
        const audio = this.audioElements.get(name);

        if (!audio) {
            console.error(`[SOUND][05] Sound ${name} not found`);
            return Promise.reject(new Error(`Sound ${name} not found`));
        }

        try {
            this.isPlaying = true;
            console.log(`[SOUND][06] Playing sound ${name}`);

            // Reset sound to the beginning (in case of replay)
            audio.currentTime = 0;

            // Play the sound and handle potential autoplay restrictions
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                // Use .then() without returning the promise to avoid type issues
                await playPromise
                    .then(() => {
                        // Play succeeded, wait for it to end
                        return new Promise<void>((resolve) => {
                            audio.onended = () => {
                                console.log(`[SOUND][07] Sound ${name} ended`);
                                this.isPlaying = false;
                                resolve(); // Explicitly typed Promise<void> above, so no argument needed
                            };
                        });
                    })
                    .catch((error) => {
                        // Play was prevented (e.g., autoplay policy)
                        console.error(
                            `[SOUND][08] Browser blocked sound playback: ${error.message}`
                        );
                        this.isPlaying = false;
                        // No need to return anything here
                    });

                return; // Explicit return to satisfy Promise<void>
            }

            // Fallback for browsers that don't return a promise from play()
            return new Promise<void>((resolve) => {
                audio.onended = () => {
                    console.log(`[SOUND][07] Sound ${name} ended`);
                    this.isPlaying = false;
                    resolve();
                };
            });
        } catch (error) {
            console.error(`[SOUND][08] Error playing sound ${name}:`, error);
            this.isPlaying = false;
            return Promise.reject(error);
        }
    }

    /**
     * Plays a sequence of sounds and pauses.
     * If another sequence is already playing, it will be stopped first.
     *
     * @param sequence - An array of `SoundSequenceItem` objects to play in order.
     * @param onEnd - An optional callback function to execute when the entire sequence has finished playing.
     * @returns A promise that resolves when the sequence playback is initiated.
     */
    public async playSequence(
        sequence: SoundSequence,
        onEnd?: () => void
    ): Promise<void> {
        // Stop currently playing sequence, if any
        this.stopPlayback();

        this.currentSequence = sequence;
        this.currentSequenceIndex = 0;
        this.onSequenceEndCallback = onEnd || null;

        console.log(
            `[SOUND][09] Starting sequence with ${sequence.length} items`
        );

        return this.playNextInSequence();
    }

    /**
     * Plays a sequence of sounds and pauses in a loop.
     *
     * @param sequence - The sequence to play.
     * @param maxLoops - The maximum number of times to loop the sequence. Defaults to 3.
     * @param onEnd - An optional callback to run when the looping is complete.
     * @returns A promise that resolves when the sequence loop is initiated.
     */
    public async playSequenceLoop(
        sequence: SoundSequence,
        maxLoops = 3,
        onEnd?: () => void
    ): Promise<void> {
        // Stop currently playing sequence, if any
        this.stopPlayback();

        this.currentSequence = sequence;
        this.currentSequenceIndex = 0;
        this.onSequenceEndCallback = onEnd || null;
        this.loopCount = 0;
        this.maxLoops = maxLoops;

        console.log(
            `[SOUND][15] Starting sequence loop with ${sequence.length} items, max loops: ${maxLoops}`
        );

        return this.playNextInSequenceLoop();
    }

    /**
     * @private Internal method to recursively play the next item in the current sequence.
     * This method is called by `playSequence`.
     */
    private async playNextInSequence(): Promise<void> {
        if (
            !this.currentSequence ||
            this.currentSequenceIndex >= this.currentSequence.length
        ) {
            console.log(`[SOUND][10] Sequence completed`);
            this.isPlaying = false;

            // Call the callback after sequence ends
            if (this.onSequenceEndCallback) {
                this.onSequenceEndCallback();
                this.onSequenceEndCallback = null;
            }

            return Promise.resolve();
        }

        const item = this.currentSequence[this.currentSequenceIndex];
        this.currentSequenceIndex++;

        try {
            if (item.type === "sound") {
                // Play the sound
                await this.playSound(item.name);
                // After the sound ends, play the next item
                return this.playNextInSequence();
            } else if (item.type === "pause") {
                // Introduce a pause
                console.log(`[SOUND][11] Pausing for ${item.duration}ms`);
                this.isPlaying = true;

                return new Promise<void>((resolve) => {
                    this.pauseTimerId = setTimeout(() => {
                        console.log(`[SOUND][12] Pause ended`);
                        this.pauseTimerId = null;
                        resolve(this.playNextInSequence());
                    }, item.duration);
                });
            }
        } catch (error) {
            console.error(`[SOUND][13] Error in sequence playback:`, error);
            this.isPlaying = false;

            // Call the callback after sequence ends (even in case of error)
            if (this.onSequenceEndCallback) {
                this.onSequenceEndCallback();
                this.onSequenceEndCallback = null;
            }

            return Promise.reject(error);
        }
    }

    /**
     * @private Internal method to recursively play the next item in the current sequence with looping.
     * This method is called by `playSequenceLoop`.
     */
    private async playNextInSequenceLoop(): Promise<void> {
        if (!this.currentSequence) {
            console.log(`[SOUND][16] No sequence to play`);
            this.isPlaying = false;

            if (this.onSequenceEndCallback) {
                this.onSequenceEndCallback();
                this.onSequenceEndCallback = null;
            }

            return Promise.resolve();
        }

        // If we reached the end of the sequence
        if (this.currentSequenceIndex >= this.currentSequence.length) {
            this.loopCount++;
            console.log(`[SOUND][17] Loop ${this.loopCount} completed`);

            // Check if we reached the maximum number of loops
            if (this.maxLoops > 0 && this.loopCount >= this.maxLoops) {
                console.log(
                    `[SOUND][18] Maximum number of loops (${this.maxLoops}) reached`
                );
                this.isPlaying = false;

                if (this.onSequenceEndCallback) {
                    this.onSequenceEndCallback();
                    this.onSequenceEndCallback = null;
                }

                return Promise.resolve();
            }

            // Reset index to start the sequence again
            this.currentSequenceIndex = 0;
        }

        const item = this.currentSequence[this.currentSequenceIndex];
        this.currentSequenceIndex++;

        try {
            if (item.type === "sound") {
                // Play the sound
                await this.playSound(item.name);
                // After the sound ends, play the next item
                return this.playNextInSequenceLoop();
            } else if (item.type === "pause") {
                // Introduce a pause
                console.log(`[SOUND][19] Pausing for ${item.duration}ms`);
                this.isPlaying = true;

                return new Promise<void>((resolve) => {
                    this.pauseTimerId = setTimeout(() => {
                        console.log(`[SOUND][20] Pause ended`);
                        this.pauseTimerId = null;
                        resolve(this.playNextInSequenceLoop());
                    }, item.duration);
                });
            }
        } catch (error) {
            console.error(
                `[SOUND][21] Error in sequence loop playback:`,
                error
            );
            this.isPlaying = false;

            if (this.onSequenceEndCallback) {
                this.onSequenceEndCallback();
                this.onSequenceEndCallback = null;
            }

            return Promise.reject(error);
        }
    }

    /**
     * Stops all currently playing sounds and sequences immediately.
     * It pauses all audio, clears any pending pauses, and resets the playback state.
     */
    public stopPlayback(): void {
        // Stop all sounds
        this.audioElements.forEach((audio) => {
            audio.pause();
            audio.currentTime = 0;
        });

        // Clear pause timer
        if (this.pauseTimerId) {
            clearTimeout(this.pauseTimerId);
            this.pauseTimerId = null;
        }

        // Reset state
        this.isPlaying = false;
        this.currentSequence = null;
        this.currentSequenceIndex = 0;

        console.log(`[SOUND][14] Playback stopped`);
    }

    /**
     * Checks if a sound or sequence is currently playing.
     * @returns `true` if audio is active, `false` otherwise.
     */
    public getIsPlaying(): boolean {
        return this.isPlaying;
    }
}
