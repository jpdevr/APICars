import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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

  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.updateCountdown();
    this.timerId = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
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
