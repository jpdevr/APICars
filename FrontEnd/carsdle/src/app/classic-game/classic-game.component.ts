import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchSuggestionsComponent } from '../search-suggestions/search-suggestions.component';
import { SearchCar, carDisplay, mapSearchCar } from '../models';
import { environment } from '../../environments/environment';

type GuessStatus = 'correct' | 'partial' | 'wrong';
type GuessFieldKey =
  | 'foto'
  | 'marca'
  | 'nome'
  | 'periodoLancamento'
  | 'carroceria'
  | 'transmissao'
  | 'tipoMotor'
  | 'categoria';

interface GuessField {
  value: string | number;
  status: GuessStatus;
  direction: 'up' | 'down' | null;
}

interface GuessResponse {
  correct: boolean;
  guess: Record<GuessFieldKey, GuessField>;
}

interface GuessRow {
  attempt: GuessResponse;
  revealedCount: number;
}

interface GameStats {
  streak: number;
  lastWinDate: string | null;
  attemptsByDate: Record<string, number>;
}

interface ClassicPersistState {
  activeDate: string;
  solved: boolean;
  rows: GuessRow[];
}

@Component({
  selector: 'app-classic-game',
  imports: [CommonModule, FormsModule, SearchSuggestionsComponent],
  templateUrl: './classic-game.component.html',
  styleUrl: './classic-game.component.scss'
})
export class ClassicGameComponent {
  readonly fieldOrder: GuessFieldKey[] = [
    'foto',
    'marca',
    'nome',
    'periodoLancamento',
    'carroceria',
    'transmissao',
    'tipoMotor',
    'categoria'
  ];

  readonly fieldLabels: Record<GuessFieldKey, string> = {
    foto: 'Foto',
    marca: 'Marca',
    nome: 'Nome',
    periodoLancamento: 'Lancamento',
    carroceria: 'Carroceria',
    transmissao: 'Transmissao',
    tipoMotor: 'Motor',
    categoria: 'Categoria'
  };

  query = '';
  searching = false;
  submitting = false;
  suggestions: SearchCar[] = [];
  rows: GuessRow[] = [];
  solved = false;
  activeDate = this.today();
  selectedCar: SearchCar | null = null;
  stats: GameStats;

  private readonly apiBase = environment.apiBaseUrl;
  private readonly gameStateKey = 'carsdle_classic_state';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly http: HttpClient) {
    this.stats = this.loadStats();
    this.loadGameState();
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
    if (!this.selectedCar || this.submitting || this.solved) {
      return;
    }

    this.submitting = true;

    this.http
      .post<GuessResponse>(`${this.apiBase}/api/game/classic/guess`, {
        carId: this.selectedCar.id
      })
      .subscribe({
        next: (result) => {
          const row: GuessRow = {
            attempt: result,
            revealedCount: 0
          };
          this.rows = [row, ...this.rows];
          this.increaseAttempts();
          this.revealRow(0);

          if (result.correct) {
            this.solved = true;
            this.registerWin();
          }

          this.query = '';
          this.selectedCar = null;
          this.submitting = false;
          this.persistGameState();
        },
        error: () => {
          this.submitting = false;
        }
      });
  }

  getTodayAttempts(): number {
    return this.stats.attemptsByDate[this.activeDate] ?? 0;
  }

  getCellStatusClass(field: GuessField): string {
    if (field.status === 'correct') {
      return 'status-correct';
    }

    if (field.status === 'partial') {
      return 'status-partial';
    }

    return 'status-wrong';
  }

  isFieldVisible(row: GuessRow, index: number): boolean {
    return index < row.revealedCount;
  }

  getFieldValue(fieldKey: GuessFieldKey, field: GuessField): string {
    if (fieldKey === 'foto' && !field.value) {
      return 'Sem foto';
    }

    return String(field.value || '-');
  }

  directionArrow(direction: 'up' | 'down' | null): string {
    if (direction === 'up') {
      return '?';
    }

    if (direction === 'down') {
      return '?';
    }

    return '';
  }

  private revealRow(rowIndex: number): void {
    const total = this.fieldOrder.length;
    let step = 0;

    const interval = setInterval(() => {
      const row = this.rows[rowIndex];
      if (!row) {
        clearInterval(interval);
        return;
      }

      row.revealedCount = Math.min(step + 1, total);
      this.rows = [...this.rows];
      this.persistGameState();

      step += 1;
      if (step >= total) {
        clearInterval(interval);
      }
    }, 230);
  }

  private loadGameState(): void {
    const raw = localStorage.getItem(this.gameStateKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ClassicPersistState;
      if (parsed.activeDate !== this.activeDate) {
        return;
      }

      this.solved = Boolean(parsed.solved);
      this.rows = (parsed.rows ?? []).map((row) => ({
        ...row,
        revealedCount: this.fieldOrder.length
      }));
    } catch {
      this.rows = [];
      this.solved = false;
    }
  }

  private persistGameState(): void {
    const payload: ClassicPersistState = {
      activeDate: this.activeDate,
      solved: this.solved,
      rows: this.rows.map((row) => ({
        ...row,
        revealedCount: this.fieldOrder.length
      }))
    };

    localStorage.setItem(this.gameStateKey, JSON.stringify(payload));
  }

  private loadStats(): GameStats {
    const raw = this.readCookie('carsdle_stats');
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
    document.cookie = `carsdle_stats=${encoded}; max-age=${60 * 60 * 24 * 365}; path=/; SameSite=Lax`;
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

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private relativeDate(offsetDays: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    return date.toISOString().split('T')[0];
  }
}
