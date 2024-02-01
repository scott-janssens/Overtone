import { Injectable } from "@angular/core";
import { AnyMetaEvent, MidiFile, SetTempoEvent, TimeSignatureEvent, TrackNameEvent, read } from "midifile-ts";
import { MidiTrack } from "./MidiTrack";
import { Subject } from "rxjs";

// https://github.com/ryohey/midifile-ts

@Injectable({
    providedIn: "root"
})
export class MidiService {
    private _midiFile: MidiFile | undefined;
    get midiFile() { return this._midiFile; }
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

    constructor() {
    }

    async loadMidiFileAsync(file: File): Promise<void> {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const reader = new FileReader();
        reader.onload = e => {
            // TODO: Don't assume file read in one go.

            if (e.target != null) {
                this._midiFile = read(e.target.result as ArrayBuffer);

                if (this._midiFile.header.trackCount > 0) {
                    this.getMetaData(this._midiFile);

                    for (let i = 1; i < this._midiFile.tracks.length; i++) {
                        let track = new MidiTrack(this._midiFile.tracks[i]);
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
