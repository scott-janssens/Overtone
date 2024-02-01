import { Component, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadMidiFileComponent } from './file/load-midi-file.component';
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
  title: string = 'Overtone';
}
