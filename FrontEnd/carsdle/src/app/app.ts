import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { CelebrationService } from './celebration.service';

declare global {
  interface Window {
    lottie?: {
      loadAnimation: (config: {
        container: Element;
        renderer: 'svg' | 'canvas' | 'html';
        loop: boolean;
        autoplay: boolean;
        path: string;
      }) => { destroy: () => void };
    };
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  showAboutModal = false;
  showHowToPlayModal = false;
  showUpdatesModal = false;
  countdown = '00:00:00';
  showCelebration = false;
  trophyExiting = false;
  confettiPieces = Array.from({ length: 40 }, (_, i) => i);

  private timerId: ReturnType<typeof setInterval> | null = null;
  private celebrationSub: Subscription | null = null;
  private celebrationExitTimer: ReturnType<typeof setTimeout> | null = null;
  private celebrationHideTimer: ReturnType<typeof setTimeout> | null = null;
  private lottieInstance: { destroy: () => void } | null = null;

  constructor(private readonly celebrationService: CelebrationService) {}

  ngOnInit(): void {
    this.updateCountdown();
    this.timerId = setInterval(() => this.updateCountdown(), 1000);
    this.celebrationSub = this.celebrationService.celebration$.subscribe(() => {
      this.playCelebration();
    });
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
    this.celebrationSub?.unsubscribe();
    if (this.celebrationExitTimer) {
      clearTimeout(this.celebrationExitTimer);
    }
    if (this.celebrationHideTimer) {
      clearTimeout(this.celebrationHideTimer);
    }
    this.lottieInstance?.destroy();
  }

  openAbout(): void {
    this.showAboutModal = true;
  }

  openHowToPlay(): void {
    this.showHowToPlayModal = true;
  }

  openUpdates(): void {
    this.showUpdatesModal = true;
  }

  closeModals(): void {
    this.showAboutModal = false;
    this.showHowToPlayModal = false;
    this.showUpdatesModal = false;
  }

  private playCelebration(): void {
    this.showCelebration = true;
    this.trophyExiting = false;

    if (this.celebrationExitTimer) {
      clearTimeout(this.celebrationExitTimer);
    }
    if (this.celebrationHideTimer) {
      clearTimeout(this.celebrationHideTimer);
    }

    setTimeout(() => {
      const container = document.getElementById('trophy-lottie-container');
      if (!container || !window.lottie) {
        return;
      }
      container.innerHTML = '';
      this.lottieInstance?.destroy();
      this.lottieInstance = window.lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: false,
        autoplay: true,
        path: '/trophy-entry.json'
      });
    }, 0);

    this.celebrationExitTimer = setTimeout(() => {
      this.trophyExiting = true;
    }, 1900);

    this.celebrationHideTimer = setTimeout(() => {
      this.showCelebration = false;
      this.trophyExiting = false;
      this.lottieInstance?.destroy();
      this.lottieInstance = null;
    }, 3200);
  }

  private updateCountdown(): void {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(new Date());

    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
    const second = Number(parts.find((p) => p.type === 'second')?.value ?? '0');

    const elapsed = hour * 3600 + minute * 60 + second;
    const remaining = Math.max(0, 24 * 3600 - elapsed);

    const h = Math.floor(remaining / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;

    this.countdown = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
