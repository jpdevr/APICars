import { Routes } from '@angular/router';
import { ClassicGameComponent } from './classic-game/classic-game.component';
import { EmojiGameComponent } from './emoji-game/emoji-game.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'classic' },
  { path: 'classic', component: ClassicGameComponent },
  { path: 'emoji', component: EmojiGameComponent },
  { path: '**', redirectTo: 'classic' }
];
