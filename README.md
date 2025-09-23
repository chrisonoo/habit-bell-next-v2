# Habit Bell: Przewodnik po Aplikacji

Witaj w przewodniku po aplikacji Habit Bell! Cieszę się, że chcesz nauczyć się, jak ta aplikacja jest zbudowana. Pomyśl o mnie jak o Twoim osobistym nauczycielu. Przejdziemy przez wszystko krok po kroku, bez pośpiechu.

Celem tego dokumentu jest wyjaśnienie struktury aplikacji, działania poszczególnych plików i, co najważniejsze, jak wszystkie te elementy układanki łączą się w jedną, działającą całość.

## Spis Treści
1.  [Czym jest Habit Bell?](#czym-jest-habit-bell)
2.  [Struktura Projektu](#struktura-projektu)
3.  [Jak to wszystko działa razem? Magia Hooks, Services i Context](#jak-to-wszystko-działa-razem-magia-hooks-services-i-context)
    *   [Analogia: Restauracja](#analogia-restauracja)
    *   [Services (Kucharze)](#services-kucharze)
    *   [Contexts (Kelnerzy i Manager)](#contexts-kelnerzy-i-manager)
    *   [Components (Wystrój i Klienci)](#components-wystrój-i-klienci)
4.  [Szczegółowy Opis Plików](#szczegółowy-opis-plików)
5.  [Jak uruchomić aplikację?](#jak-uruchomić-aplikację)

## Czym jest Habit Bell?

Habit Bell to prosta aplikacja typu "timer", która pomaga w budowaniu nawyków. Działa na zasadzie interwałów - ustawiasz czas pracy (sesji) i czas przerw. Aplikacja odlicza czas i informuje Cię dźwiękiem o zakończeniu każdego interwału. Dodatkowo, śledzi Twoje postępy, zliczając ukończone sesje i interwały.

## Struktura Projektu

Nasza aplikacja jest zbudowana przy użyciu [Next.js](https://nextjs.org/), popularnego frameworka do tworzenia aplikacji React. Korzysta on z najnowszych standardów, w tym z tzw. **App Router**, co wpływa na organizację plików.

Oto widok na najważniejsze foldery w naszym projekcie:

```
.
├── app/                  # Główny folder aplikacji (widoki, strony)
├── components/           # "Klocki" interfejsu użytkownika (UI)
├── contexts/             # "Mózg" aplikacji - zarządza stanem
├── services/             # "Specjaliści" od konkretnych zadań
├── public/               # Pliki statyczne (obrazki, dźwięki)
└── ...                   # Pliki konfiguracyyjne
```

*   **`app/`**: Tutaj mieszka wszystko, co użytkownik widzi w przeglądarce. Każdy folder wewnątrz `app` odpowiada za konkretną stronę (np. `/about`, `/help`). Plik `layout.tsx` definiuje ogólny wygląd, a `page.tsx` to treść danej strony.
*   **`components/`**: Wyobraź sobie, że budujesz z klocków LEGO. Każdy klocek to komponent. Może to być mały przycisk (`Button`), większy element jak menu (`AppDropdownMenu`), albo cała sekcja jak wyświetlacz timera (`TimerDisplay`). Dzielenie UI na komponenty sprawia, że kod jest czysty i łatwy w zarządzaniu.
*   **`contexts/`**: To serce naszej aplikacji. Zarządza danymi i logiką, która musi być dostępna w wielu miejscach. Jeśli aplikacja byłaby firmą, `Contexts` to byliby managerowie poszczególnych działów.
*   **`services/`**: To nasi specjaliści. Każdy serwis ma jedną, konkretną odpowiedzialność. `SoundService` wie wszystko o odtwarzaniu dźwięków, ale nic o timerach. `TimeService` potrafi tylko formatować czas. Dzięki temu nasza logika jest uporządkowana.
*   **`public/`**: Tutaj trzymamy wszystkie pliki, które muszą być dostępne publicznie, jak obrazki, czcionki czy pliki dźwiękowe.

## Jak to wszystko działa razem? Magia Hooks, Services i Context

To najważniejsza część! Zrozumienie, jak te trzy elementy współpracują, jest kluczem do zrozumienia nowoczesnych aplikacji React.

### Analogia: Restauracja

Wyobraźmy sobie, że nasza aplikacja to restauracja.

*   **`Components` (Wystrój i Klienci)**: To wszystko, co widzi gość restauracji - stoliki, menu, wystrój. Klient (użytkownik) wchodzi w interakcję z tymi elementami (np. klika przycisk w menu).
*   **`Services` (Kucharze)**: To mistrzowie w swojej dziedzinie, pracujący na zapleczu (w kuchni). Mamy kucharza od zup (`TimeService`), kucharza od dań głównych (`SoundService`) itd. Nie mają oni bezpośredniego kontaktu z klientem. Wykonują tylko precyzyjne zadania.
*   **`Contexts` (Kelnerzy i Manager)**: To pośrednicy. Kelner (`Hook`, np. `useTimer`) przyjmuje zamówienie od klienta (komponentu) i przekazuje je do kuchni (do serwisu). Manager (`Provider`, np. `TimerProvider`) nadzoruje pracę całego stolika (np. stan timera), wie, którego kucharza poprosić o pomoc i informuje kelnera o statusie zamówienia.

### Services (Kucharze)

W naszym kodzie, `services` to zwykłe klasy lub funkcje, które wykonują konkretną pracę.

*   `services/sound-service.ts`: Ten "kucharz" wie, jak załadować i odtworzyć plik dźwiękowy. Komponenty UI nie muszą wiedzieć, jak to się dzieje. Po prostu proszą o "odtwarzanie dźwięku".
*   `services/time-service.ts`: Ten "kucharz" potrafi zamienić sekundy na format `minuty:sekundy`. Nic więcej, nic mniej.

### Contexts (Kelnerzy i Manager)

Context to mechanizm w React, który pozwala przekazywać dane w dół drzewa komponentów bez potrzeby podawania ich przez propsy na każdym poziomie. To idealne miejsce na "stan globalny" dla pewnej części aplikacji.

W naszej restauracji, `TimerContext` to "manager" od timera.

1.  **`TimerProvider` (Manager)**:
    *   Jest szefem. Obejmuje całą aplikację (w `layout.tsx`), więc każdy w środku ma do niego dostęp.
    *   Zatrudnia kucharzy! Tworzy instancję `SoundService` i `ActivityService` (choć ten drugi jest w innym kontekście, ale zasada jest ta sama).
    *   Trzyma w głowie stan: "Czy timer jest uruchomiony?", "Ile czasu zostało?".
    *   Definiuje, co można zrobić: "Uruchom timer", "Zatrzymaj timer", "Zresetuj". Kiedy dostaje takie polecenie, używa swoich kucharzy (serwisów) do wykonania pracy.

2.  **`useTimer` (Kelner / Hook)**:
    *   To jest "hak" (ang. *hook*), który pozwala komponentom "zaczepić się" o kontekst. To jak bezpośrednia linia do managera.
    *   Komponent `HabitTimer` (nasz główny widok) woła: `const { startTimer, timerState } = useTimer();`.
    *   Dzięki temu dostaje dwie rzeczy: aktualny stan (`timerState`) oraz funkcję, by ten stan zmienić (`startTimer`).

### Components (Wystrój i Klienci)

Komponenty są "głupie" w dobrym tego słowa znaczeniu. One tylko wyświetlają dane i mówią kontekstowi, co użytkownik chce zrobić.

*   Komponent `TimerDisplay` dostaje informację `minutes` i `seconds` i po prostu je wyświetla. Nie wie, skąd się wzięły.
*   Komponent `TimerControls` ma przycisk "Start". Kiedy użytkownik go klika, komponent woła funkcję `toggleTimer()`, którą dostał od "kelnera" (`useTimer`). Nie obchodzi go, co ta funkcja robi. On tylko przekazuje prośbę klienta.

**Podsumowując przepływ:**

1.  Użytkownik klika przycisk "Start" w komponencie `TimerControls`.
2.  Komponent `TimerControls` woła funkcję `toggleTimer()` otrzymaną z hooka `useTimer()`.
3.  Hook `useTimer()` to tak naprawdę funkcja z `TimerContext`.
4.  `TimerProvider` (manager) otrzymuje polecenie `toggleTimer`.
5.  `TimerProvider` zmienia swój wewnętrzny stan (np. `isRunning: true`) i komunikuje się z Web Workerem (naszym super-dokładnym zegarmistrzem), żeby zaczął odliczać czas.
6.  Gdy stan w `TimerProvider` się zmienia, wszystkie komponenty, które używają hooka `useTimer()`, automatycznie otrzymują nową informację (np. nowy `timerState`) i odświeżają swój wygląd.

Ten model sprawia, że logika jest oddzielona od prezentacji, co jest fundamentem czystego i skalowalnego kodu.

## Szczegółowy Opis Plików

Tutaj znajdziesz ściągawkę z najważniejszych plików w projekcie.

### `app/[locale]/`
*   `layout.tsx`: Główny szablon aplikacji. To tutaj "wpinamy" nasze Context Providers (`TimerProvider`, `ActivityProvider` itd.), aby były dostępne w całej aplikacji.
*   `page.tsx`: Główna strona, którą widzi użytkownik. Wyświetla komponent `HabitTimer`.
*   `about/page.tsx` & `help/page.tsx`: Proste podstrony informacyjne.

### `components/`
*   `habit-timer.tsx`: Główny komponent, który składa całą aplikację w całość.
*   `timer-display.tsx`: Wyświetla czas w formacie `MM:SS`.
*   `timer-controls.tsx`: Przyciski "Start", "Pauza", "Reset".
*   `timer-settings-dialog.tsx`: Okno dialogowe do zmiany ustawień timera.
*   `statistics.tsx`: Małe ikonki w rogu ekranu pokazujące dzisiejsze statystyki.
*   `statistics-dialog.tsx`: Pełnoekranowe okno ze szczegółowymi statystykami.
*   `app-dropdown-menu.tsx`: Główne menu aplikacji (to z trzema kropkami).
*   `bell-logo.tsx`: Logo aplikacji.

### `contexts/`
*   `timer-context.tsx`: Zarządza całą logiką timera, czasem, stanem (działa/nie działa) i komunikacją z Web Workerem.
*   `activity-context.tsx`: Zarządza śledzeniem aktywności użytkownika (sesje, pauzy). Zapisuje i odczytuje dane z pamięci przeglądarki (IndexedDB).
*   `sound-context.tsx`: Zarządza odtwarzaniem dźwięków.
*   `app-settings-context.tsx`: Zarządza ustawieniami globalnymi - motywem (jasny/ciemny) i językiem.

### `services/`
*   `time-service.ts`: Zawiera funkcje pomocnicze do pracy z czasem.
*   `sound-service.ts`: Klasa odpowiedzialna za logikę ładowania i odtwarzania dźwięków.

### `public/`
*   `sounds/`: Zawiera pliki `.mp3` używane w aplikacji.
*   `workers/`: Zawiera pliki JavaScript dla Web Workerów. `timer-worker.js` to serce naszego timera, które działa w osobnym wątku, dzięki czemu jest bardzo precyzyjne.

## Jak uruchomić aplikację?

Do zarządzania zależnościami w projekcie używamy `pnpm`.

1.  **Instalacja zależności:**
    ```bash
    pnpm install
    ```
2.  **Uruchomienie serwera deweloperskiego:**
    ```bash
    pnpm run dev
    ```
Aplikacja będzie dostępna pod adresem `http://localhost:3000`.

Mam nadzieję, że ten przewodnik był pomocny! Nie bój się eksperymentować z kodem. To najlepszy sposób na naukę. Powodzenia!
