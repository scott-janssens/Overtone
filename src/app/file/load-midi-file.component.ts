import { Component } from "@angular/core";
import { MidiService } from "../services/midi/midi.service";
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon} from '@angular/material/icon';

@Component({
    selector: "ot-file",
    templateUrl: "./load-midi-file.component.html",
    styleUrl: "./load-midi-file.component.css",
    imports: [MatProgressSpinner, MatIcon],
    standalone: true
})
export class LoadMidiFileComponent {
    private _filename: string | null = null;
    get filename(): string | null { return this._filename; }

    constructor(private _midiService: MidiService) {
    }

    public async onLoad(event: any) {
        const file: File = event.target.files[0];

        if (file) {
            this._filename = file.name;
            await this._midiService.loadMidiFileAsync(file);
        }
    }
}