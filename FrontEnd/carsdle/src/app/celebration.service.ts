import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CelebrationService {
  private readonly celebrationSubject = new Subject<void>();
  readonly celebration$ = this.celebrationSubject.asObservable();

  trigger(): void {
    this.celebrationSubject.next();
  }
}
