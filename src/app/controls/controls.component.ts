import { Component } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadMidiFileComponent } from "../file/load-midi-file.component";
import { MatList, MatListItem } from '@angular/material/list';
import { MatSliderModule } from '@angular/material/slider';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckbox } from '@angular/material/checkbox';
import { TrackItemComponent } from "./track-item.component";
import { MidiService } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";

@Component({
    selector: "ot-controls",
    templateUrl: "./controls.component.html",
    styleUrl: "./controls.component.css",
    imports: [LoadMidiFileComponent, TrackItemComponent, MatList, MatListItem, MatSliderModule, MatRadioModule, MatCheckbox, CommonModule, FormsModule], 
    standalone: true
})
export class ControlsComponent {
    get tracks(): MidiTrack[] { return this.midiService.tracks; }

    constructor(readonly midiService: MidiService) {
    }
}
