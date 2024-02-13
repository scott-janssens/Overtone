import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatSelect, MatOption } from '@angular/material/select';
import { MidiTrack } from '../services/midi/MidiTrack';
import { ProgramChange, ProgramChanges } from '../services/midi/ProgramChanges';

@Component({
  selector: 'ot-track-item',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCheckbox, MatSelect, MatOption], //, ColorPickerModule],
  templateUrl: './track-item.component.html',
  styleUrl: './track-item.component.scss'
})
export class TrackItemComponent {
  @Input() track: MidiTrack | undefined;
  @Output() notify: EventEmitter<MidiTrack> = new EventEmitter<MidiTrack>();
  @ViewChild("colorPickerContainer", { static: false }) colorPickerContainer!: HTMLDivElement;
  @ViewChild("colorPicker", { read: ElementRef, static: false }) colorPicker!: HTMLInputElement;

  get programChanges(): ProgramChange[] {
    return ProgramChanges.programChanges.sort((a, b) => (a.instrument > b.instrument ? 1 : -1));
  }
}
