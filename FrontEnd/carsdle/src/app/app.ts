import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchSuggestionsComponent } from './search-suggestions/search-suggestions.component';
import { SearchCar } from './models';

import { environment } from '../environments/environment';

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

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, SearchSuggestionsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
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
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly http: HttpClient) {
    this.stats = this.loadStats();
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
              .map((item) => this.mapSearchCar(item))
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
    this.query = this.carDisplay(car);
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
          this.rows = [...this.rows, row];
          this.increaseAttempts();
          this.revealRow(this.rows.length - 1);

          if (result.correct) {
            this.solved = true;
            this.registerWin();
          }

          this.query = '';
          this.selectedCar = null;
          this.submitting = false;
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
      return '↑';
    }

    if (direction === 'down') {
      return '↓';
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

      step += 1;
      if (step >= total) {
        clearInterval(interval);
      }
    }, 550);
  }

  private mapSearchCar(item: unknown): SearchCar | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const source = item as Record<string, unknown>;
    const id = this.pickString(source, ['id', '_id', 'carId']);
    const nome = this.pickString(source, ['nome', 'name', 'modelo']);

    if (!id || !nome) {
      return null;
    }

    return {
      id,
      nome,
      marca: this.pickString(source, ['marca', 'brand']) ?? undefined,
      foto: this.pickString(source, ['foto', 'imageUrl', 'imagem']) ?? undefined
    };
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return null;
  }

  private carDisplay(car: SearchCar): string {
    return car.marca ? `${car.marca} ${car.nome}` : car.nome;
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
