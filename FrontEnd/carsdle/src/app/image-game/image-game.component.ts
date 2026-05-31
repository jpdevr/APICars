import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SearchSuggestionsComponent } from '../search-suggestions/search-suggestions.component';
import { SearchCar, carDisplay, mapSearchCar } from '../models';
import { environment } from '../../environments/environment';

type GuessStatus = 'true' | 'false' | 'partial';

interface ImageGameGetResponse {
  challengeId?: string;
  imageUrl?: string;
  image?: string;
  foto?: string;
  images?: string[];
}

interface ImageGameGuessResponse {
  result?: GuessStatus | boolean;
  status?: GuessStatus | boolean;
  correct?: GuessStatus | boolean;
}

interface ImageGuessRow {
  carId: string;
  marca?: string;
  nome: string;
  foto?: string;
  status: GuessStatus;
}

interface ImageGamePersistState {
  activeDate: string;
  challengeId: string;
  imageUrl: string;
  solved: boolean;
  failed: boolean;
  guesses: ImageGuessRow[];
  guessedCarIds: string[];
  revealOrder: number[];
  revealedCount: number;
}

@Component({
  selector: 'app-image-game',
  imports: [CommonModule, FormsModule, SearchSuggestionsComponent],
  templateUrl: './image-game.component.html',
  styleUrl: './image-game.component.scss'
})
export class ImageGameComponent implements OnInit {
  query = '';
  searching = false;
  submitting = false;
  loadingChallenge = false;

  suggestions: SearchCar[] = [];
  selectedCar: SearchCar | null = null;

  challengeId = '';
  imageUrl = '';
  pixelatedImageUrl = '';
  guesses: ImageGuessRow[] = [];
  guessedCarIds = new Set<string>();
  solved = false;
  failed = false;

  readonly totalParts = 9;
  readonly initialRevealedCount = 1;

  revealOrder: number[] = [];
  revealedCount = this.initialRevealedCount;

  private readonly apiBase = environment.apiBaseUrl;
  private readonly activeDate = new Date().toISOString().split('T')[0];
  private readonly stateKey = 'carsdle_image_game_state';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadChallenge();
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
        .get<unknown[]>(`${this.apiBase}/api/cars/search`, { params: { query: trimmed } })
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
    if (!this.selectedCar || this.submitting || this.solved || this.failed || !this.challengeId) {
      return;
    }

    if (this.guessedCarIds.has(this.selectedCar.id)) {
      return;
    }

    this.submitting = true;
    const guessedCar = this.selectedCar;

    this.http
      .post<ImageGameGuessResponse>(`${this.apiBase}/api/game/image-game/guess`, {
        carId: guessedCar.id
      })
      .subscribe({
        next: (result) => {
          const status = this.normalizeStatus(result.result ?? result.status ?? result.correct);
          this.guesses = [
            {
              carId: guessedCar.id,
              marca: guessedCar.marca,
              nome: guessedCar.nome,
              foto: guessedCar.foto,
              status
            },
            ...this.guesses
          ];
          this.guessedCarIds.add(guessedCar.id);

          if (status === 'true') {
            this.solved = true;
            this.revealedCount = this.totalParts;
          } else {
            this.revealedCount = Math.min(this.revealedCount + 1, this.totalParts);
            if (this.revealedCount >= this.totalParts) {
              this.failed = true;
            }
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

  isPieceRevealed(pieceIndex: number): boolean {
    const revealRank = this.revealOrder.indexOf(pieceIndex);
    return revealRank !== -1 && revealRank < this.revealedCount;
  }

  guessLabel(row: ImageGuessRow): string {
    return row.marca ? `${row.marca} ${row.nome}` : row.nome;
  }

  private loadChallenge(): void {
    this.loadingChallenge = true;

    this.http.get<ImageGameGetResponse>(`${this.apiBase}/api/game/image-game`).subscribe({
      next: (response) => {
        const challengeId = this.pickString(response, ['challengeId']) ?? '';
        const imageUrl =
          this.pickFirstArrayString(response, ['images']) ??
          this.pickString(response, ['imageUrl', 'image', 'foto']) ??
          '';

        this.challengeId = challengeId;
        this.imageUrl = imageUrl;
        this.pixelatedImageUrl = '';
        this.generatePixelatedImage(imageUrl);

        const persisted = this.loadState();
        if (persisted && persisted.challengeId === challengeId) {
          this.solved = persisted.solved;
          this.failed = persisted.failed;
          this.guesses = this.normalizeGuesses(persisted.guesses ?? []);
          this.guessedCarIds = new Set(persisted.guessedCarIds ?? this.guesses.map((guess) => guess.carId));
          this.revealOrder = this.normalizeRevealOrder(persisted.revealOrder);
          this.revealedCount = this.clampRevealedCount(persisted.revealedCount);
          if (persisted.imageUrl) {
            this.imageUrl = persisted.imageUrl;
          }
        } else {
          this.resetForNewChallenge();
          this.persistState();
        }

        this.loadingChallenge = false;
      },
      error: () => {
        this.loadingChallenge = false;
      }
    });
  }

  private resetForNewChallenge(): void {
    this.solved = false;
    this.failed = false;
    this.guesses = [];
    this.guessedCarIds = new Set<string>();
    this.revealOrder = this.generateRevealOrder();
    this.revealedCount = this.initialRevealedCount;
  }

  private generatePixelatedImage(sourceUrl: string): void {
    if (!sourceUrl) {
      this.pixelatedImageUrl = '';
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetWidth = 1280;
      const targetHeight = 720;
      const pixelWidth = 48;
      const pixelHeight = 27;

      const tinyCanvas = document.createElement('canvas');
      tinyCanvas.width = pixelWidth;
      tinyCanvas.height = pixelHeight;
      const tinyCtx = tinyCanvas.getContext('2d');
      if (!tinyCtx) {
        this.pixelatedImageUrl = sourceUrl;
        return;
      }
      tinyCtx.imageSmoothingEnabled = false;
      tinyCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);

      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) {
        this.pixelatedImageUrl = sourceUrl;
        return;
      }
      finalCtx.imageSmoothingEnabled = false;
      finalCtx.drawImage(tinyCanvas, 0, 0, targetWidth, targetHeight);

      this.pixelatedImageUrl = finalCanvas.toDataURL('image/jpeg', 0.9);
    };
    img.onerror = () => {
      this.pixelatedImageUrl = sourceUrl;
    };
    img.src = sourceUrl;
  }

  private generateRevealOrder(): number[] {
    const list = Array.from({ length: this.totalParts }, (_, i) => i);
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  private normalizeRevealOrder(input: unknown): number[] {
    if (!Array.isArray(input)) {
      return this.generateRevealOrder();
    }

    const valid = input.filter((n): n is number => typeof n === 'number' && n >= 0 && n < this.totalParts);
    const unique = Array.from(new Set(valid));
    if (unique.length !== this.totalParts) {
      return this.generateRevealOrder();
    }
    return unique;
  }

  private clampRevealedCount(value: unknown): number {
    const num = typeof value === 'number' ? value : this.initialRevealedCount;
    const min = this.initialRevealedCount;
    const max = this.totalParts;
    return Math.max(min, Math.min(max, Math.floor(num)));
  }

  private loadState(): ImageGamePersistState | null {
    const raw = localStorage.getItem(this.stateKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as ImageGamePersistState;
      if (parsed.activeDate !== this.activeDate) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private persistState(): void {
    const payload: ImageGamePersistState = {
      activeDate: this.activeDate,
      challengeId: this.challengeId,
      imageUrl: this.imageUrl,
      solved: this.solved,
      failed: this.failed,
      guesses: this.guesses,
      guessedCarIds: Array.from(this.guessedCarIds),
      revealOrder: this.revealOrder,
      revealedCount: this.revealedCount
    };

    localStorage.setItem(this.stateKey, JSON.stringify(payload));
  }

  private normalizeGuesses(rawGuesses: unknown[]): ImageGuessRow[] {
    const normalized: ImageGuessRow[] = [];

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

      normalized.push({
        carId,
        nome,
        marca: typeof source['marca'] === 'string' ? source['marca'] : undefined,
        foto: typeof source['foto'] === 'string' ? source['foto'] : undefined,
        status: this.normalizeStatus(source['status'] ?? source['correct'])
      });
    }

    return normalized;
  }

  private normalizeStatus(value: unknown): GuessStatus {
    if (value === 'true' || value === true) {
      return 'true';
    }
    if (value === 'partial') {
      return 'partial';
    }
    return 'false';
  }

  private pickString(source: unknown, keys: string[]): string | null {
    if (!source || typeof source !== 'object') {
      return null;
    }
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private pickFirstArrayString(source: unknown, keys: string[]): string | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === 'string' && item.trim());
        if (typeof first === 'string') {
          return first.trim();
        }
      }
    }
    return null;
  }
}
