import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';
import { MidiTrack } from '../services/midi/MidiTrack';

@Component({
  selector: 'ot-track-item',
  standalone: true,
  imports: [MatCheckbox, FormsModule, ColorPickerModule],
  templateUrl: './track-item.component.html',
  styleUrl: './track-item.component.css'
})
export class TrackItemComponent {
  @Input() track: MidiTrack | undefined;
  @Output() notify: EventEmitter<MidiTrack> = new EventEmitter<MidiTrack>();
}
