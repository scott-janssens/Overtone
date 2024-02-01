import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MidiTrackMetaData } from '../services/midi/MidiTrackMetaData';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { ColorPickerModule } from 'ngx-color-picker';

@Component({
  selector: 'ot-track-item',
  standalone: true,
  imports: [MatCheckbox, FormsModule, ColorPickerModule],
  templateUrl: './track-item.component.html',
  styleUrl: './track-item.component.css'
})
export class TrackItemComponent {
  @Input() track: MidiTrackMetaData | undefined;
  @Output() notify: EventEmitter<MidiTrackMetaData> = new EventEmitter<MidiTrackMetaData>();

  color: string = "red";
}
