import { Component } from "@angular/core";
import { LoadMidiFileComponent } from "../file/load-midi-file.component";
import { EventAggregator } from "../services/event-aggregator/event-aggregator.service";
import { MatList, MatListItem } from '@angular/material/list';
import { CommonModule } from '@angular/common';
import { TrackItemComponent } from "./track-item.component";
import { MidiTrackMetaData } from "../services/midi/MidiTrackMetaData";
import { MidiService } from "../services/midi/midi.service";

@Component({
    selector: "ot-controls",
    templateUrl: "./controls.component.html",
    styleUrl: "./controls.component.css",
    imports: [LoadMidiFileComponent, TrackItemComponent, MatList, MatListItem, CommonModule],
    standalone: true
})
export class ControlsComponent {
    title: string = "";
    tracks: MidiTrackMetaData[] = [];

    constructor(readonly _midiService: MidiService, private _eventAggregator: EventAggregator) {
        this._eventAggregator.subscribe("MidiFileLoaded", this.onFileLoaded, this);
    }

    onFileLoaded(midiService: MidiService, comp: ControlsComponent): void {
        for (let track of midiService.tracks) {
            comp.tracks.push(track.meta);
        }
    }
}
