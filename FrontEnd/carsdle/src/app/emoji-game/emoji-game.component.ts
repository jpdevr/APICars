import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchSuggestionsComponent } from '../search-suggestions/search-suggestions.component';
import { SearchCar, carDisplay, mapSearchCar } from '../models';
import { environment } from '../../environments/environment';

interface EmojiTodayResponse {
  challengeId: string;
  emojis: string[];
}

interface EmojiGuessResponse {
  correct: boolean;
  emojis: string[];
}

interface EmojiGuessRow {
  carId: string;
  marca?: string;
  nome: string;
  foto?: string;
  correct: boolean;
}

interface EmojiPersistState {
  activeDate: string;
  challengeId: string;
  emojis: string[];
  solved: boolean;
  guesses: EmojiGuessRow[];
}

@Component({
  selector: 'app-emoji-game',
  imports: [CommonModule, FormsModule, SearchSuggestionsComponent],
  templateUrl: './emoji-game.component.html',
  styleUrl: './emoji-game.component.scss'
})
export class EmojiGameComponent implements OnInit {
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

  private readonly apiBase = environment.apiBaseUrl;
  private readonly activeDate = new Date().toISOString().split('T')[0];
  private readonly stateKey = 'carsdle_emoji_state';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadTodayChallenge();
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
              .filter((car): car is SearchCar => Boolean(car));
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
    this.selectedCar = car;
    this.query = carDisplay(car);
    this.suggestions = [];
  }

  submitGuess(): void {
    if (!this.selectedCar || this.submitting || this.solved || !this.challengeId) {
      return;
    }

    this.submitting = true;

    this.http
      .post<EmojiGuessResponse>(`${this.apiBase}/api/game/emoji/guess`, {
        carId: this.selectedCar.id,
        carID: this.selectedCar.id
      })
      .subscribe({
        next: (result) => {
          this.guesses = [
            {
              carId: this.selectedCar!.id,
              marca: this.selectedCar!.marca,
              nome: this.selectedCar!.nome,
              foto: this.selectedCar!.foto,
              correct: result.correct
            },
            ...this.guesses
          ];

          if (Array.isArray(result.emojis) && result.emojis.length > 0) {
            this.emojis = result.emojis;
          }

          if (result.correct) {
            this.solved = true;
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

  private loadTodayChallenge(): void {
    this.loadingChallenge = true;

    this.http.get<EmojiTodayResponse>(`${this.apiBase}/api/game/emoji/today`).subscribe({
      next: (data) => {
        const persisted = this.loadState();
        this.challengeId = data.challengeId;
        this.emojis = data.emojis ?? [];

        if (persisted && persisted.challengeId === data.challengeId) {
          this.solved = persisted.solved;
          this.guesses = persisted.guesses ?? [];
          if (persisted.emojis?.length) {
            this.emojis = persisted.emojis;
          }
        } else {
          this.solved = false;
          this.guesses = [];
          this.persistState();
        }

        this.loadingChallenge = false;
      },
      error: () => {
        this.loadingChallenge = false;
      }
    });
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
      guesses: this.guesses
    };

    localStorage.setItem(this.stateKey, JSON.stringify(state));
  }
}
