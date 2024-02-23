import { Component, OnInit, ViewChild } from "@angular/core";
import { MidiService } from "../services/midi/midi.service";
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NgFor, NgIf } from "@angular/common";
import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Component({
    selector: "ot-file",
    templateUrl: "./load-midi-file.component.html",
    styleUrl: "./load-midi-file.component.scss",
    imports: [MatProgressSpinner, MatIcon, MatMenuModule, MatMenuTrigger, MatDividerModule, NgFor, NgIf],
    standalone: true
})
export class LoadMidiFileComponent implements OnInit {
    fileNames: string[] = [
        "Beethoven - Symphony 5 (Mvmt 1)",
        "Holst - The Planets (Jupiter)",
        "Mozart - Symphony 40 (Mvmt 1)",
        "Orff - Carmina Burana (O Fortuna)",
    ];

    private _fileInput!: HTMLInputElement;
    private _file: File | undefined;

    private _display: string | undefined;
    get display(): string | undefined { return this._display; }
    set display(value: string | undefined) { this._display = value; }

    @ViewChild(MatMenuTrigger) fileMenu!: MatMenuTrigger;

    isLoading: boolean = false;
    menuPosition = { x: '0px', y: '0px' };

    constructor(private _midiService: MidiService, private _http: HttpClient) {
        _midiService.midiFileLoaded.subscribe(e => this.onLoaded(e));
    }

    ngOnInit(): void {
        this._fileInput = document.getElementById("file-input") as HTMLInputElement;
    }

    onContextMenu(event: MouseEvent, file: string) {
        event.preventDefault();
        this.menuPosition.x = event.clientX + 'px';
        this.menuPosition.y = event.clientY + 'px';
        this.fileMenu.menuData = { track: file };
        this.fileMenu.openMenu();
    }

    onMenuSelect(filename: string) {
        this.isLoading = true;

        const fullFilename = filename + ".mid";
        let url = "./assets/" + fullFilename;
        const options = {
            headers: new HttpHeaders({
                'Accept': '*/*'
            }),
            responseType: 'blob' as 'json',
        };

        console.log("Loading file from: " + url);
        let data: Observable<Blob> = this._http.get<Blob>(url, options);
        data.subscribe(
            (response: Blob) => {
                console.log(fullFilename + " blob retrieved.");
                const file = new File([response], fullFilename);
                this._midiService.loadMidiFile(file);
                console.log(fullFilename + " loaded.");
            },
            (error: HttpErrorResponse) => {
                this._midiService.abortLoad();
                console.log("HttpClient.get() message: " + error.message);
                console.log("HttpClient.get() error: " + JSON.stringify(error.error));
            }
        );
    }

    async onLoad(event: any) {
        this.isLoading = true;
        this._file = event.target.files[0];

        if (this._file) {
            this._midiService.loadMidiFile(this._file);
        }

        this._fileInput!.value = "";
    }

    onLoaded(midiService: MidiService | null) {
        this.display = midiService === null ? undefined : midiService.title || this._file?.name;
        this.isLoading = false;
    }
}