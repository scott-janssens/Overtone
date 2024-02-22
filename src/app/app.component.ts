import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CanvasComponent } from './canvas/canvas.component';
import { ControlsComponent } from './controls/controls.component';

@Component({
  selector: 'ot-root',
  standalone: true,
  imports: [RouterOutlet, ControlsComponent, CanvasComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly title: string = 'Overtone';
}
