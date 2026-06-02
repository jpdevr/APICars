import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchSuggestionsComponent } from '../search-suggestions/search-suggestions.component';
import { SearchCar, carDisplay, mapSearchCar } from '../models';
import { environment } from '../../environments/environment';
import { CelebrationService } from '../celebration.service';
import { getSaoPauloDateKey, getSaoPauloRelativeDate } from '../date-utils';

interface EmojiTodayResponse {
  challengeId: string;
  emojis: string[];
}

interface EmojiGuessResponse {
  result?: 'true' | 'false' | 'partial' | boolean;
  status?: 'true' | 'false' | 'partial' | boolean;
  correct?: 'true' | 'false' | 'partial' | boolean;
  emojis: string[];
}

interface EmojiGuessRow {
  carId: string;
  marca?: string;
  nome: string;
  foto?: string;
  status: 'true' | 'false' | 'partial';
}

interface EmojiPersistState {
  activeDate: string;
  challengeId: string;
  emojis: string[];
  solved: boolean;
  guesses: EmojiGuessRow[];
  guessedCarIds?: string[];
}

interface GameStats {
  streak: number;
  lastWinDate: string | null;
  attemptsByDate: Record<string, number>;
}

@Component({
  selector: 'app-emoji-game',
  imports: [CommonModule, FormsModule, SearchSuggestionsComponent],
  templateUrl: './emoji-game.component.html',
  styleUrl: './emoji-game.component.scss'
})
export class EmojiGameComponent implements OnInit, OnDestroy {
  query = '';
  searching = false;
  submitting = false;
  loadingChallenge = false;
  suggestions: SearchCar[] = [];
  selectedCar: SearchCar | null = null;

  challengeId = '';
  emojis: string[] = [];
  guesses: EmojiGuessRow[] = [];
  solved = false;
  guessedCarIds = new Set<string>();
  stats: GameStats;

  private readonly apiBase = environment.apiBaseUrl;
  private activeDate = getSaoPauloDateKey();
  private readonly stateKey = 'carsdle_emoji_state';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private daySyncTimer: ReturnType<typeof setInterval> | null = null;
  private loadVersion = 0;

  constructor(
    private readonly http: HttpClient,
    private readonly celebrationService: CelebrationService
  ) {
    this.stats = this.loadStats();
  }

  ngOnInit(): void {
    this.loadTodayChallenge();
    this.startDaySync();
  }

  ngOnDestroy(): void {
    this.loadVersion += 1;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (this.daySyncTimer) {
      clearInterval(this.daySyncTimer);
    }
  }

  onSearchChange(value: string): void {
    this.query = value;
    this.selectedCar = null;

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      this.suggestions = [];
      return;
    }

    this.searching = true;
    this.searchTimer = setTimeout(() => {
      this.http
        .get<unknown[]>(`${this.apiBase}/api/cars/search`, {
          params: { query: trimmed }
        })
        .subscribe({
          next: (data) => {
            this.suggestions = (data ?? [])
              .map((item) => mapSearchCar(item))
              .filter((car): car is SearchCar => Boolean(car))
              .filter((car) => !this.guessedCarIds.has(car.id));
            this.searching = false;
          },
          error: () => {
            this.searching = false;
            this.suggestions = [];
          }
        });
    }, 250);
  }

  chooseSuggestion(car: SearchCar): void {
    if (this.guessedCarIds.has(car.id)) {
      return;
    }
    this.selectedCar = car;
    this.query = carDisplay(car);
    this.suggestions = [];
  }

  submitGuess(): void {
    if (
      !this.selectedCar ||
      this.submitting ||
      this.solved ||
      !this.challengeId ||
      this.guessedCarIds.has(this.selectedCar.id)
    ) {
      return;
    }

    this.submitting = true;
    const guessedCarId = this.selectedCar.id;

    this.http
      .post<EmojiGuessResponse>(`${this.apiBase}/api/game/emoji/guess`, {
        carId: this.selectedCar.id,
        carID: this.selectedCar.id
      })
      .subscribe({
        next: (result) => {
          const status = this.normalizeStatus(result.result ?? result.status ?? result.correct);

          this.guesses = [
            {
              carId: this.selectedCar!.id,
              marca: this.selectedCar!.marca,
              nome: this.selectedCar!.nome,
              foto: this.selectedCar!.foto,
              status
            },
            ...this.guesses
          ];
          this.guessedCarIds.add(guessedCarId);
          this.increaseAttempts();

          if (Array.isArray(result.emojis) && result.emojis.length > 0) {
            this.emojis = result.emojis;
          }

          if (status === 'true') {
            this.solved = true;
            this.registerWin();
            this.celebrationService.trigger();
          }

          this.persistState();
          this.query = '';
          this.selectedCar = null;
          this.submitting = false;
        },
        error: () => {
          this.submitting = false;
        }
      });
  }

  visibleEmojiCount(): number {
    if (this.solved) {
      return this.emojis.length;
    }

    return Math.min(this.guesses.length + 1, this.emojis.length);
  }

  emojiVisible(index: number): boolean {
    return index < this.visibleEmojiCount();
  }

  guessLabel(row: EmojiGuessRow): string {
    return row.marca ? `${row.marca} ${row.nome}` : row.nome;
  }

  getTodayAttempts(): number {
    return this.stats.attemptsByDate[this.activeDate] ?? 0;
  }

  private loadTodayChallenge(): void {
    const requestVersion = ++this.loadVersion;
    this.loadingChallenge = true;

    this.http.get<EmojiTodayResponse>(`${this.apiBase}/api/game/emoji/today`).subscribe({
      next: (data) => {
        if (requestVersion !== this.loadVersion) {
          return;
        }

        const persisted = this.loadState();
        this.challengeId = data.challengeId;
        this.emojis = data.emojis ?? [];

        if (persisted && persisted.challengeId === data.challengeId) {
          this.solved = persisted.solved;
          this.guesses = this.normalizeGuesses(persisted.guesses ?? []);
          this.guessedCarIds = new Set(persisted.guessedCarIds ?? this.guesses.map((guess) => guess.carId));
          if (persisted.emojis?.length) {
            this.emojis = persisted.emojis;
          }
        } else {
          this.solved = false;
          this.guesses = [];
          this.guessedCarIds = new Set<string>();
          this.persistState();
        }

        this.loadingChallenge = false;
      },
      error: () => {
        if (requestVersion !== this.loadVersion) {
          return;
        }

        this.loadingChallenge = false;
      }
    });
  }

  private startDaySync(): void {
    this.daySyncTimer = setInterval(() => {
      const currentDate = getSaoPauloDateKey();
      if (currentDate === this.activeDate) {
        return;
      }

      this.activeDate = currentDate;
      this.solved = false;
      this.guesses = [];
      this.guessedCarIds = new Set<string>();
      this.query = '';
      this.selectedCar = null;
      this.suggestions = [];
      this.loadTodayChallenge();
    }, 1_000);
  }

  private loadState(): EmojiPersistState | null {
    const raw = localStorage.getItem(this.stateKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as EmojiPersistState;
      if (parsed.activeDate !== this.activeDate) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private persistState(): void {
    const state: EmojiPersistState = {
      activeDate: this.activeDate,
      challengeId: this.challengeId,
      emojis: this.emojis,
      solved: this.solved,
      guesses: this.guesses,
      guessedCarIds: Array.from(this.guessedCarIds)
    };

    localStorage.setItem(this.stateKey, JSON.stringify(state));
  }

  private normalizeGuesses(rawGuesses: unknown[]): EmojiGuessRow[] {
    const normalized: EmojiGuessRow[] = [];

    for (const item of rawGuesses) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const source = item as Record<string, unknown>;
      const carId = String(source['carId'] ?? '');
      const nome = String(source['nome'] ?? '');
      if (!carId || !nome) {
        continue;
      }

      const status = this.normalizeStatus(source['status'] ?? source['correct']);

      normalized.push({
        carId,
        nome,
        marca: typeof source['marca'] === 'string' ? source['marca'] : undefined,
        foto: typeof source['foto'] === 'string' ? source['foto'] : undefined,
        status
      });
    }

    return normalized;
  }

  private normalizeStatus(value: unknown): 'true' | 'false' | 'partial' {
    if (value === 'true' || value === true) {
      return 'true';
    }
    if (value === 'partial') {
      return 'partial';
    }
    return 'false';
  }

  private loadStats(): GameStats {
    const raw = this.readCookie('carsdle_emoji_stats');
    if (!raw) {
      return { streak: 0, lastWinDate: null, attemptsByDate: {} };
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as GameStats;
      return {
        streak: Number(parsed.streak || 0),
        lastWinDate: parsed.lastWinDate || null,
        attemptsByDate: parsed.attemptsByDate || {}
      };
    } catch {
      return { streak: 0, lastWinDate: null, attemptsByDate: {} };
    }
  }

  private persistStats(): void {
    const safeStats: GameStats = {
      ...this.stats,
      attemptsByDate: {
        [this.activeDate]: this.stats.attemptsByDate[this.activeDate] ?? 0
      }
    };

    const encoded = encodeURIComponent(JSON.stringify(safeStats));
    document.cookie = `carsdle_emoji_stats=${encoded}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
  }

  private increaseAttempts(): void {
    const current = this.stats.attemptsByDate[this.activeDate] ?? 0;
    this.stats.attemptsByDate[this.activeDate] = current + 1;
    this.persistStats();
  }

  private registerWin(): void {
    if (this.stats.lastWinDate === this.activeDate) {
      return;
    }

    const yesterday = this.relativeDate(-1);
    if (this.stats.lastWinDate === yesterday) {
      this.stats.streak += 1;
    } else {
      this.stats.streak = 1;
    }

    this.stats.lastWinDate = this.activeDate;
    this.persistStats();
  }

  private readCookie(name: string): string | null {
    const prefix = `${name}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return trimmed.substring(prefix.length);
      }
    }
    return null;
  }

  private relativeDate(offsetDays: number): string {
    return getSaoPauloRelativeDate(offsetDays);
  }
}
