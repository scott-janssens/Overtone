import { Component, OnInit } from "@angular/core";
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
export class LoadMidiFileComponent implements OnInit {
    private _fileInput: HTMLInputElement | undefined;

    private _filename: string | null = null;
    get filename(): string | null { return this._filename; }

    constructor(private _midiService: MidiService) {
    }

    ngOnInit(): void {
        this._fileInput = document.getElementById("file-input") as HTMLInputElement;
    }

    public async onLoad(event: any) {
        const file: File = event.target.files[0];

        if (file) {
            this._filename = file.name;
            await this._midiService.loadMidiFileAsync(file);
        }

        this._fileInput!.value = "";
    }
}