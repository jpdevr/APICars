import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { SearchCar } from '../models';

@Component({
  selector: 'app-search-suggestions',
  imports: [CommonModule],
  templateUrl: './search-suggestions.component.html',
  styleUrl: './search-suggestions.component.scss'
})
export class SearchSuggestionsComponent {
  @Input() suggestions: SearchCar[] = [];
  @Input() searching = false;
  @Input() query = '';
  @Input() showImage = true;
  @Output() choose = new EventEmitter<SearchCar>();

  get shouldShow(): boolean {
    return this.searching || (this.query.trim().length >= 2 && this.suggestions.length > 0);
  }

  onChoose(car: SearchCar): void {
    this.choose.emit(car);
  }

  trackById(_: number, car: SearchCar): string {
    return car.id;
  }
}
