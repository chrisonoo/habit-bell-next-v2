"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { TimerDisplay } from "@/components/timer-display"
import { BellLogo } from "@/components/bell-logo"
import { TimerControls } from "@/components/timer-controls"
import { TimerSettingsDialog } from "@/components/timer-settings-dialog"
import { formatTime } from "@/lib/utils"
import { RotateCcw, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"

// Interfejs dla stanu timera zarządzanego przez workera
interface TimerState {
  sessionTimeLeft: number
  intervalTimeLeft: number
  isRunning: boolean
}

// Interfejs dla ustawień timera
interface TimerSettings {
  sessionDuration: number
  intervalDuration: number
}

export function HabitTimer() {
  // Referencja do przechowywania stanu timera z workera
  const timerStateRef = useRef<TimerState>({
    sessionTimeLeft: 0,
    intervalTimeLeft: 0,
    isRunning: false,
  })

  // Referencja do przechowywania ustawień timera z workera
  const settingsRef = useRef<TimerSettings>({
    sessionDuration: 30 * 60, // 30 minut w sekundach
    intervalDuration: 5 * 60, // 5 minut w sekundach
  })

  // Stan do wymuszania przerenderowania komponentu
  const [timerVersion, setTimerVersion] = useState(0)

  // Stan do śledzenia inicjalizacji workera
  const [initialized, setInitialized] = useState(false)

  const [isFullscreen, setIsFullscreen] = useState(false)

  // Stan do śledzenia, czy dialog ustawień jest otwarty
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Web Worker reference
  const workerRef = useRef<Worker | null>(null)

  // Flag to track if worker is initialized
  const workerInitializedRef = useRef(false)

  // Flag to track if settings were sent to worker
  const settingsSentRef = useRef(false)

  // Initialize Web Worker
  useEffect(() => {
    // Create worker only on client side and only once
    if (typeof window !== "undefined" && !workerInitializedRef.current) {
      console.log("[MAIN] Initializing Web Worker")

      // Cleanup any existing worker
      if (workerRef.current) {
        console.log("[MAIN] Terminating existing worker")
        workerRef.current.terminate()
      }

      // Create new worker
      workerRef.current = new Worker("/timer-worker.js")
      workerInitializedRef.current = true

      // Set up message handler
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data

        if (type === "LOG") {
          // Wyświetl log z workera w konsoli głównego wątku
          console.log(payload)
          return
        }

        console.log(`[MAIN] Received message from worker (${type}):`, payload)

        if (type === "UPDATE") {
          // Aktualizuj referencję stanu timera
          timerStateRef.current = {
            sessionTimeLeft: payload.sessionTimeLeft,
            intervalTimeLeft: payload.intervalTimeLeft,
            isRunning: payload.isRunning,
          }

          // Wymuś przerenderowanie komponentu
          setTimerVersion((prev) => prev + 1)

          // Oznacz jako zainicjalizowany po pierwszej aktualizacji
          if (!initialized) {
            setInitialized(true)
          }

          console.log("[MAIN] Updated state from worker:", {
            sessionTimeLeft: `${Math.floor(payload.sessionTimeLeft / 60)}:${String(payload.sessionTimeLeft % 60).padStart(2, "0")}`,
            intervalTimeLeft: `${Math.floor(payload.intervalTimeLeft / 60)}:${String(payload.intervalTimeLeft % 60).padStart(2, "0")}`,
            isRunning: payload.isRunning,
          })
        } else if (type === "SETTINGS_UPDATE") {
          // Aktualizuj referencję ustawień timera
          settingsRef.current = {
            sessionDuration: payload.sessionDuration,
            intervalDuration: payload.intervalDuration,
          }

          console.log("[MAIN] Updated settings from worker:", {
            sessionDuration: `${Math.floor(payload.sessionDuration / 60)} minutes`,
            intervalDuration: `${Math.floor(payload.intervalDuration / 60)} minutes`,
          })

          // Wymuś przerenderowanie komponentu
          setTimerVersion((prev) => prev + 1)
        }
      }

      // Po inicjalizacji workera, pobierz początkowe ustawienia
      setTimeout(() => {
        if (workerRef.current) {
          console.log("[MAIN] Requesting initial settings from worker")
          workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" })
        }
      }, 100)

      return () => {
        console.log("[MAIN] Cleaning up worker")
        workerRef.current?.terminate()
        workerInitializedRef.current = false
        settingsSentRef.current = false
      }
    }
  }, [initialized])

  // Reset timer to initial state
  const resetTimer = useCallback(() => {
    if (workerRef.current) {
      console.log("[MAIN] Sending RESET to worker")
      // Wysyłamy tylko komendę RESET bez dodatkowych danych
      workerRef.current.postMessage({ type: "RESET" })
    }
  }, [])

  // Save settings
  const saveSettings = useCallback((newSessionDuration: number, newIntervalDuration: number) => {
    console.log(`[MAIN] Saving new settings: session=${newSessionDuration}, interval=${newIntervalDuration}`)

    // Send to worker (convert minutes to seconds)
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "UPDATE_SETTINGS",
        payload: {
          sessionDuration: newSessionDuration * 60,
          intervalDuration: newIntervalDuration * 60,
        },
      })
    }
  }, [])

  // Pobierz aktualne ustawienia z workera przed otwarciem dialogu ustawień
  const handleSettingsOpen = useCallback(() => {
    if (workerRef.current) {
      console.log("[MAIN] Requesting current settings before opening dialog")
      workerRef.current.postMessage({ type: "GET_INITIAL_SETTINGS" })
    }
    setIsSettingsOpen(true)
  }, [])

  // Toggle timer running state
  const toggleTimer = useCallback(() => {
    if (!workerRef.current) {
      console.log("[MAIN] Worker not initialized, cannot toggle timer")
      return
    }

    // Używamy aktualnego stanu z referencji
    if (!timerStateRef.current.isRunning) {
      console.log("[MAIN] Sending START to worker")
      // Wysyłamy tylko komendę START bez dodatkowych danych
      workerRef.current.postMessage({ type: "START" })
    } else {
      console.log("[MAIN] Sending PAUSE to worker")
      workerRef.current.postMessage({ type: "PAUSE" })
    }
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      console.log("[MAIN] Entering fullscreen mode")
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`[MAIN] Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      console.log("[MAIN] Exiting fullscreen mode")
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [])

  // Update fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const newIsFullscreen = !!document.fullscreenElement
      console.log(`[MAIN] Fullscreen state changed: ${newIsFullscreen}`)
      setIsFullscreen(newIsFullscreen)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Obsługa widoczności strony
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === "visible"
      console.log(`[MAIN] Page visibility changed: ${isVisible ? "visible" : "hidden"}`)

      if (workerRef.current) {
        // Informujemy workera o zmianie widoczności strony
        console.log("[MAIN] Informing worker about visibility change")
        workerRef.current.postMessage({
          type: "VISIBILITY_CHANGE",
          payload: { isVisible },
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  // Debug logging for state changes
  useEffect(() => {
    console.log("[MAIN] Timer state updated in UI:", {
      isRunning: timerStateRef.current.isRunning,
      sessionTimeLeft: `${Math.floor(timerStateRef.current.sessionTimeLeft / 60)}:${String(timerStateRef.current.sessionTimeLeft % 60).padStart(2, "0")}`,
      intervalTimeLeft: `${Math.floor(timerStateRef.current.intervalTimeLeft / 60)}:${String(timerStateRef.current.intervalTimeLeft % 60).padStart(2, "0")}`,
      sessionDuration: `${Math.floor(settingsRef.current.sessionDuration / 60)} minutes`,
      intervalDuration: `${Math.floor(settingsRef.current.intervalDuration / 60)} minutes`,
    })
  }, [timerVersion]) // Reaguj na zmiany timerVersion

  // Pokaż ekran ładowania, dopóki worker nie zostanie zainicjalizowany
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl">Initializing timer...</div>
      </div>
    )
  }

  // Formatuj czas z aktualnych wartości w referencji
  const sessionTime = formatTime(timerStateRef.current.sessionTimeLeft)
  const intervalTime = formatTime(timerStateRef.current.intervalTimeLeft)

  // Konwertuj sekundy na minuty dla ustawień
  const sessionDurationMinutes = Math.floor(settingsRef.current.sessionDuration / 60)
  const intervalDurationMinutes = Math.floor(settingsRef.current.intervalDuration / 60)

  return (
    <div className="relative flex flex-col items-center justify-between min-h-screen p-4 overflow-hidden">
      {/* Menu/Settings Button (Top Left) */}
      <TimerSettingsDialog
        sessionDuration={sessionDurationMinutes}
        intervalDuration={intervalDurationMinutes}
        onSave={saveSettings}
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        onOpen={handleSettingsOpen}
      />

      {/* Reset Button (Top Right) */}
      <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10" onClick={resetTimer}>
        <RotateCcw className="h-6 w-6" />
        <span className="sr-only">Reset timer</span>
      </Button>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <BellLogo />

        <div className="flex-1 flex items-center justify-center">
          <TimerDisplay minutes={intervalTime.minutes} seconds={intervalTime.seconds} size="large" />
        </div>

        <div className="mb-32">
          <TimerDisplay minutes={sessionTime.minutes} seconds={sessionTime.seconds} size="small" color="text-primary" />
        </div>
      </div>

      {/* Fullscreen Button (Bottom Right) */}
      <Button variant="ghost" size="icon" className="absolute bottom-4 right-4 z-10" onClick={toggleFullscreen}>
        <Maximize className="h-6 w-6" />
        <span className="sr-only">Toggle fullscreen</span>
      </Button>

      {/* Timer Controls (Center Bottom) */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <TimerControls isRunning={timerStateRef.current.isRunning} onToggle={toggleTimer} />
      </div>
    </div>
  )
}

