import { Component, OnInit, ViewChild } from "@angular/core";
import { MidiService } from "../services/midi/midi.service";
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NgFor } from "@angular/common";
import { HttpClient, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

@Component({
    selector: "ot-file",
    templateUrl: "./load-midi-file.component.html",
    styleUrl: "./load-midi-file.component.css",
    imports: [MatProgressSpinner, MatIcon, MatMenuModule, MatMenuTrigger, MatDividerModule, NgFor],
    standalone: true
})
export class LoadMidiFileComponent implements OnInit {
    fileNames: string[] = [
        "Beethoven - Symphony 5 (Mvmt 1)",
        "Holst - The Planets (Jupiter)",
        "Mozart - Symphony 40 (Mvmt 1)",
        "Orff - Carmina Burana (O Fortuna)",
    ];

    private _fileInput: HTMLInputElement | undefined;
    private _file: File | undefined;

    private _display: string | undefined;
    get display(): string | undefined { return this._display; }

    @ViewChild(MatMenuTrigger) fileMenu!: MatMenuTrigger;

    menuPosition = { x: '0px', y: '0px' };

    constructor(private _midiService: MidiService, private _http: HttpClient) {
        _midiService.midiFileLoaded.subscribe(e => { this._display = this._midiService.title || this._file?.name; });
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
        const fullFilename = filename + ".mid";
        let url = "./assets/" + fullFilename;
        const headers = {
            headers: new HttpHeaders({
                'Accept': 'blob'
            }),
            'responseType': 'blob' as 'json'
        };

        let data: Observable<Blob> = this._http.get<Blob>(url, headers);
        data.subscribe((response: Blob) => {
            const file = new File([response], fullFilename);
            this._midiService.loadMidiFileAsync(file);
        }, (error: HttpErrorResponse) => {
            console.log(error.error.text);
        });
    }

    public onLoad(event: any) {
        this._file = event.target.files[0];

        if (this._file) {
            this._midiService.loadMidiFileAsync(this._file);
        }

        this._fileInput!.value = "";
    }
}