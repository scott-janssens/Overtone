import { Component } from "@angular/core";
import { LoadMidiFileComponent } from "../file/load-midi-file.component";
import { MatList, MatListItem } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { TrackItemComponent } from "./track-item.component";
import { MidiService } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";

@Component({
    selector: "ot-controls",
    templateUrl: "./controls.component.html",
    styleUrl: "./controls.component.css",
    imports: [LoadMidiFileComponent, TrackItemComponent, MatList, MatListItem, CommonModule],
    standalone: true
})
export class ControlsComponent {
    get tracks(): MidiTrack[] { return this._midiService.tracks; }

    constructor(readonly _midiService: MidiService) {
    }
}
