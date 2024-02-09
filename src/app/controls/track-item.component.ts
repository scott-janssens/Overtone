import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { ColorPickerModule } from 'ngx-color-picker';
import { MatSelect, MatOption } from '@angular/material/select';
import { MidiTrack } from '../services/midi/MidiTrack';
import { ProgramChange, ProgramChanges } from '../services/midi/ProgramChanges';

@Component({
  selector: 'ot-track-item',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckbox, MatSelect, MatOption, ColorPickerModule],
  templateUrl: './track-item.component.html',
  styleUrl: './track-item.component.css'
})
export class TrackItemComponent {
  @Input() track: MidiTrack | undefined;
  @Output() notify: EventEmitter<MidiTrack> = new EventEmitter<MidiTrack>();

  get programChanges(): ProgramChange[] {
    let l = ProgramChanges.programChanges.sort((a, b) => (a.instrument > b.instrument ? 1 : -1));
    return l;
  }
}
