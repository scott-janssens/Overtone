import { Component, OnChanges, OnInit, SimpleChanges } from "@angular/core";
import { AnyEvent, AnyMetaEvent, MidiFile, SetTempoEvent, TimeSignatureEvent, TrackNameEvent } from "midifile-ts";
import { OvertoneSequence } from "../../overtone/OvertoneSequence";
import { Pitch } from "../../overtone/Pitch";
import { MidiService } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";

const trackDrawHeight: number = 9;
let quarterNoteWidth: number = trackDrawHeight * 4;

@Component({
    selector: "ot-canvas",
    templateUrl: "./canvas.component.html",
    styleUrl: "./canvas.component.css",
    standalone: true
})

export class CanvasComponent implements OnInit {
    private _ctx: CanvasRenderingContext2D | undefined;
    private _trackDrawWidth: number = 1200;
    private readonly _trackDrawHeight = trackDrawHeight;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";
    private _trackName: string = "";
    private readonly _trackCount = 96;

    zoom: number = 1;

    constructor(private _midiService: MidiService) {
    }

    ngOnInit(): void {
        let canvas = document.getElementById('canvas') as HTMLCanvasElement;

        if (canvas === null) {
            throw new Error("no id 'canvas' found.");
        }

        this._trackDrawWidth = canvas.parentElement?.offsetWidth!;
        canvas.width = this._trackDrawWidth;
        canvas.height = this._trackDrawHeight * this._trackCount;
        this._ctx = canvas.getContext("2d")!;
        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e, this));
        this._midiService.showHeatMapChange.subscribe(e => this.redraw());
        this._midiService.heatMapThresholdChange.subscribe(e => this.redraw());
    }

    public onFileLoaded(midiService: MidiService, comp: CanvasComponent): void {
        for (let i = 1; i < midiService.tracks.length; i++) {
            midiService.tracks[i].trackVisibilityChange.subscribe(e => this.redraw());
            midiService.tracks[i].colorChange.subscribe(e => this.redraw());
        }

        comp.redraw();
    }

    private redraw(): void {
        this.drawBackground();
        this.drawBarLines();

        for (let i = 1; i < this._midiService.tracks.length; i++) {
            this.drawMidiTrack(this._midiService.tracks[i]);
        }
    }

    private drawMidiTrack(track: MidiTrack): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        if (track.isTrackVisible) {
            let time = 0;
            let notes: { [Key: number]: Note | null } = {};

            this._ctx.fillStyle = track.color;

            for (let event of track.events) {
                if (event.type == "channel") {
                    switch (event.subtype) {
                        case "noteOn":
                            if (notes[event.noteNumber] == null) {
                                notes[event.noteNumber] = new Note(time + event.deltaTime, event.noteNumber, event.velocity);
                            }
                            break;
                        case "noteOff":
                            let note = notes[event.noteNumber];
                            if (note != null) {
                                this._ctx.fillRect(note.x + 2 * this._trackDrawHeight + 1, note.y, quarterNoteWidth - 1, this._trackDrawHeight - 2);
                                notes[event.noteNumber] = null;
                                this.drawOvertones(event.noteNumber, note.x + 2 * this._trackDrawHeight + 1, quarterNoteWidth, track.color);
                            }
                            break;
                        case "controller":
                            break;
                    }

                    time += event.deltaTime;
                }
            }
        }
    }

    private drawOvertones(midiNote: number, x: number, width: number, color: string): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        const sequence = new OvertoneSequence(Pitch.fromMidi(midiNote).frequency, 4068);
        const halfHeight = this._trackDrawHeight / 2;

        this._ctx.strokeStyle = color;
        this._ctx.lineWidth = 1;

        for (let i = 1; i < sequence.length; i++) {
            let overtone = sequence[i];

            if (this._midiService.showHeatMap) {
                this._ctx.strokeStyle = this._midiService.heatMapThreshold > Math.abs(overtone.cents) ? "green" : "red";
            }

            let y = -(overtone.closestPitch.midi - 107) * this._trackDrawHeight + halfHeight - this._trackDrawHeight * overtone.cents / 100;
            this._ctx.beginPath();
            this._ctx.moveTo(x, y);
            this._ctx.lineTo(x + width, y);
            this._ctx.stroke();
        }
    }

    private drawBarLines(): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        let barWidth = quarterNoteWidth * this._midiService.timeSigNumerator;
        this._ctx.strokeStyle = "black";
        this._ctx.lineWidth = 1;

        for (let i = 2 * this._trackDrawHeight; i < this._trackDrawWidth; i += barWidth) {
            this._ctx.beginPath();
            this._ctx.moveTo(i, 0);
            this._ctx.lineTo(i, this._trackDrawHeight * this._trackCount);
            this._ctx.stroke();
        }
    }

    private drawBackground(): void {
        if (this._ctx == null) { throw new Error("Canvas context not set."); }

        this._ctx.strokeStyle = this._blackKey;

        for (let i = 0; i < this._trackCount; i += 12) {
            this._ctx.fillRect(0, i * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.beginPath();
            this._ctx.moveTo(0, i * this._trackDrawHeight);
            this._ctx.lineTo(this._trackDrawWidth, i * this._trackDrawHeight);
            this._ctx.stroke();
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, i * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 1) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 2) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 3) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 4) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 5) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 6) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.beginPath();
            this._ctx.moveTo(0, (i + 7) * this._trackDrawHeight);
            this._ctx.lineTo(this._trackDrawWidth, (i + 7) * this._trackDrawHeight);
            this._ctx.stroke();
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 7) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 8) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 9) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._blackKey;
            this._ctx.fillRect(0, (i + 10) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
            this._ctx.fillStyle = this._whiteKey;
            this._ctx.fillRect(0, (i + 11) * this._trackDrawHeight, this._trackDrawWidth, this._trackDrawHeight);
        }

        const rollHeight = this._trackCount * this._trackDrawHeight;
        const octaveHeight = 12 * this._trackDrawHeight;
        this._ctx.fillStyle = this._whiteKey;
        this._ctx.fillRect(0, 0, 2 * this._trackDrawHeight, rollHeight);

        for (let i = 0; i < 10; i++) {
            this._ctx.strokeStyle = this._blackKey;
            this._ctx.beginPath();
            this._ctx.moveTo(0, rollHeight - i * octaveHeight);
            this._ctx.lineTo(2 * this._trackDrawHeight, rollHeight - i * octaveHeight);
            this._ctx.stroke();
        }

        const font = this._trackDrawHeight * 1.5;
        this._ctx.font = font + "px Arial sans-serif";
        this._ctx.fillStyle = "white";
        this._ctx.textAlign = "center";

        for (let i = 0; i < 10; i++) {
            this._ctx.save();
            let text = String(i);
            this._ctx.translate(font, rollHeight - octaveHeight * i - octaveHeight / 2);
            this._ctx.rotate(-Math.PI / 2);
            this._ctx.fillText(text, 0, 0, octaveHeight);
            this._ctx.restore();
        }

        this._ctx.fillStyle = "gold";
        this._ctx.fillRect(0, 43 * this._trackDrawHeight, this._trackDrawHeight, this._trackDrawHeight);
    }
}

class Note {
    public start: number;
    public noteNumber: number;
    public velocity: number;
    public x: number;
    public y: number;

    constructor(start: number, noteNumber: number, velocity: number) {
        this.start = start;
        this.velocity = velocity;
        this.noteNumber = noteNumber;
        this.x = quarterNoteWidth * (start / 240);
        this.y = (107 - noteNumber) * trackDrawHeight;
    }
}
