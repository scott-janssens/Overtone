import { Injectable } from "@angular/core";
import { AnyMetaEvent, MidiFile, SetTempoEvent, TimeSignatureEvent, TrackNameEvent, read } from "midifile-ts";
import { MidiTrack } from "./MidiTrack";
import { Subject } from "rxjs";

// https://github.com/ryohey/midifile-ts

@Injectable({
    providedIn: "root"
})
export class MidiService {
    private _trackColors: string[] = [
        "green",
        "blue",
        "yellow",
        "orange",
        "red"
    ];

    private _midiFile: MidiFile | undefined;
    get midiFile(): MidiFile | undefined { return this._midiFile; }
    midiFileLoaded: Subject<MidiService> = new Subject<MidiService>();

    private _title: string = "";
    get title() { return this._title; }

    private _timeSigNumerator: number = 4;
    get timeSigNumerator(): number { return this._timeSigNumerator; }

    private _timeSigDenominator: number = 4;
    get timeSigDenominator(): number { return this._timeSigDenominator; }

    private _tempo: number = 120;
    get tempo(): number { return this._tempo; }

    private _tracks: MidiTrack[] = [];
    get tracks(): MidiTrack[] { return this._tracks; }

    private _showHeatMap: boolean = false;
    get showHeatMap(): boolean { return this._showHeatMap; }
    set showHeatMap(value: boolean) {
        if (this._showHeatMap != value) {
            this._showHeatMap = value;
            this.showHeatMapChange.next(value);
        }
    }
    showHeatMapChange: Subject<boolean> = new Subject<boolean>();

    private _heatMapThreshold: number = 10;
    get heatMapThreshold(): number { return this._heatMapThreshold; }
    set heatMapThreshold(value: number) {
        if (this._heatMapThreshold != value) {
            this._heatMapThreshold = value;
            this.heatMapThresholdChange.next(value);
        }
    }
    heatMapThresholdChange: Subject<number> = new Subject<number>();

    constructor() {
    }

    private reset(): void {
        this._tracks = [];
        this._title = "";
        this._timeSigNumerator = 4;
        this._timeSigDenominator = 4;
        this._tempo = 120;
    }

    async loadMidiFileAsync(file: File): Promise<void> {
        this.reset();
        const reader = new FileReader();
        reader.onload = e => {
            // TODO: Don't assume file read in one go.

            if (e.target != null) {
                this._midiFile = read(e.target.result as ArrayBuffer);

                if (this._midiFile.header.trackCount > 0) {
                    this.getMetaData(this._midiFile);

                    for (let i = 1; i < this._midiFile.tracks.length; i++) {
                        let track = new MidiTrack(this._midiFile.tracks[i]);
                        track.color = this._trackColors[i % this._trackColors.length];
                        this._tracks.push(track);
                    }
                }

                this.midiFileLoaded.next(this);
            }
        };

        reader.readAsArrayBuffer(file);

        while (this._midiFile === null) {
            await new Promise((r) => setTimeout(r, 100));
        }
    }

    private getMetaData(midi: MidiFile): void {
        for (let event of midi.tracks[0]) {
            if (event.type == "meta") {
                let meta = event as AnyMetaEvent;
                switch (meta.subtype) {
                    case "trackName":
                        this._title = (meta as TrackNameEvent).text;
                        break;
                    case "setTempo":
                        this._tempo = Math.round(60000000 / (meta as SetTempoEvent).microsecondsPerBeat);
                        break;
                    case "timeSignature":
                        let sig = meta as TimeSignatureEvent;
                        this._timeSigNumerator = sig.numerator
                        this._timeSigDenominator = Math.pow(2, sig.denominator);
                        break;
                }
            }
        }
    }
}
