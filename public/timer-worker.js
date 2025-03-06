// Zmienne do przechowywania stanu timera
let isRunning = false
let sessionTimeLeft = 0
let intervalTimeLeft = 0
let timerId = null
let intervalDuration = 5 * 60 // Domyślna wartość
let sessionDuration = 30 * 60 // Domyślna wartość

// Funkcja do wysyłania logów do głównego wątku
function workerLog(...args) {
  const message = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")

  self.postMessage({
    type: "LOG",
    payload: message,
  })

  // Zachowaj również standardowe logowanie w konsoli workera
  console.log(...args)
}

// Funkcja do wysyłania aktualizacji stanu do głównego wątku
function sendStateUpdate(reason) {
  self.postMessage({
    type: "UPDATE",
    payload: {
      sessionTimeLeft,
      intervalTimeLeft,
      isRunning,
    },
  })

  workerLog(`[WORKER] Sent update (${reason}):`, {
    sessionTimeLeft: `${sessionTimeLeft} sec`,
    intervalTimeLeft: `${intervalTimeLeft} sec`,
    isRunning,
  })
}

// Funkcja do wysyłania aktualizacji ustawień do głównego wątku
function sendSettingsUpdate(reason) {
  self.postMessage({
    type: "SETTINGS_UPDATE",
    payload: {
      sessionDuration,
      intervalDuration,
    },
  })

  workerLog(`[WORKER] Sent settings update (${reason}):`, {
    sessionDuration: `${sessionDuration} sec`,
    intervalDuration: `${intervalDuration} sec`,
  })
}

// Obsługa wiadomości od głównego wątku
self.onmessage = (e) => {
  const { type, payload } = e.data

  workerLog(`[WORKER] Received message: ${type}`, payload)

  switch (type) {
    case "START":
      // Rozpocznij odliczanie - używamy tylko flagi isRunning
      isRunning = true

      // Uruchom timer tylko jeśli nie jest już uruchomiony
      if (!timerId) {
        startTimer()
      }

      // Natychmiast wyślij potwierdzenie zmiany stanu
      sendStateUpdate("START command")
      break

    case "PAUSE":
      // Zatrzymaj odliczanie
      isRunning = false

      // Wyślij aktualizację stanu po zapauzowaniu
      sendStateUpdate("PAUSE command")
      break

    case "RESET":
      // Zresetuj timer - używamy tylko flagi isRunning
      isRunning = false

      // Resetujemy czasy na podstawie przechowywanych ustawień
      sessionTimeLeft = sessionDuration
      intervalTimeLeft = intervalDuration

      // Wyślij zaktualizowany stan do głównego wątku
      sendStateUpdate("RESET command")
      break

    case "UPDATE_SETTINGS":
      // Aktualizuj ustawienia
      isRunning = false

      // Aktualizujemy ustawienia
      if (payload && payload.sessionDuration !== undefined) {
        sessionDuration = payload.sessionDuration
      }
      if (payload && payload.intervalDuration !== undefined) {
        intervalDuration = payload.intervalDuration
      }

      // Resetujemy czasy na podstawie nowych ustawień
      sessionTimeLeft = sessionDuration
      intervalTimeLeft = intervalDuration

      // Wyślij zaktualizowany stan do głównego wątku
      sendStateUpdate("UPDATE_SETTINGS command")

      // Wyślij również aktualizację ustawień
      sendSettingsUpdate("UPDATE_SETTINGS command")
      break

    case "GET_INITIAL_SETTINGS":
      // Wyślij aktualne ustawienia do głównego wątku
      sendSettingsUpdate("GET_INITIAL_SETTINGS command")

      // Wyślij również aktualny stan timera
      sendStateUpdate("GET_INITIAL_SETTINGS command")
      break

    case "VISIBILITY_CHANGE":
      // Strona zmieniła widoczność
      if (payload && payload.isVisible) {
        workerLog("[WORKER] Page became visible")
        // Wyślij aktualny stan do głównego wątku
        sendStateUpdate("visibility change")
      }
      break
  }
}

// Funkcja rozpoczynająca odliczanie
function startTimer() {
  if (timerId) {
    clearInterval(timerId)
  }

  workerLog("[WORKER] Starting timer")

  // Używamy Date.now() do dokładnego śledzenia czasu
  let lastTickTime = Date.now()

  timerId = setInterval(() => {
    const now = Date.now()
    const deltaSeconds = Math.floor((now - lastTickTime) / 1000)
    lastTickTime = now

    // Aktualizuj czas tylko jeśli timer jest uruchomiony
    if (isRunning && deltaSeconds > 0) {
      // Aktualizuj czas sesji
      if (sessionTimeLeft > 0) {
        sessionTimeLeft = Math.max(0, sessionTimeLeft - deltaSeconds)
      }

      // Aktualizuj czas interwału
      if (intervalTimeLeft > deltaSeconds) {
        intervalTimeLeft -= deltaSeconds
      } else {
        // Resetuj interwał, gdy osiągnie zero
        intervalTimeLeft = intervalDuration
      }

      // Sprawdź, czy sesja się zakończyła
      if (sessionTimeLeft <= 0) {
        isRunning = false
        workerLog("[WORKER] Session ended, stopping timer")
      }

      // Wyślij zaktualizowany stan do głównego wątku
      sendStateUpdate("tick")
    }
  }, 1000)
}

// Inicjalizacja workera
workerLog("[WORKER] Worker initialized with settings:", { sessionDuration, intervalDuration })
// Inicjalizacja początkowych wartości
sessionTimeLeft = sessionDuration
intervalTimeLeft = intervalDuration

