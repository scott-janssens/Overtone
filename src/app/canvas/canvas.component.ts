import { Component, HostListener, OnChanges, OnInit, SimpleChanges } from "@angular/core";
import { OvertoneSequence } from "../../overtone/OvertoneSequence";
import { Pitch } from "../../overtone/Pitch";
import { MidiService } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";
import Color from "color";

const trackDrawHeight: number = 9;
let quarterNoteWidth: number = trackDrawHeight * 4;

@Component({
    selector: "ot-canvas",
    templateUrl: "./canvas.component.html",
    styleUrl: "./canvas.component.css",
    standalone: true
})

export class CanvasComponent implements OnInit {
    private _container: HTMLDivElement | undefined;
    private _canvas: HTMLCanvasElement | undefined;
    private _ctx: CanvasRenderingContext2D | undefined;
    private _trackDrawWidth: number = 1200;
    private readonly _trackDrawHeight = trackDrawHeight;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";
    private readonly _trackCount = 96;

    private _isDragging: boolean = false;
    private _lastMouseX: number = -1;
    private _lastMouseY: number = -1;
    private _translateX: number = 0;
    private _translateY: number = 0;

    zoom: number = 1;

    constructor(private _midiService: MidiService) {
    }

    ngOnInit(): void {
        this._container = document.getElementsByClassName("canvas-container")[0] as HTMLDivElement;
        this._canvas = document.getElementById('canvas') as HTMLCanvasElement;

        if (this._canvas === null) {
            throw new Error("no id 'canvas' found.");
        }

        this._trackDrawWidth = this._canvas.parentElement?.offsetWidth!;
        this._canvas.width = this._trackDrawWidth;
        this._canvas.height = this._trackDrawHeight * this._trackCount;
        this._ctx = this._canvas.getContext("2d")!;
        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e, this));
        this._midiService.showHeatMapChange.subscribe(e => this.redraw());
        this._midiService.heatMapThresholdChange.subscribe(e => this.redraw());
    }

    // @HostListener('window:resize')
    // onResize() {
    //     this.canvaHeight = Math.floor(window.innerHeight * 0.91);
    //     this.canvaWidth = Math.floor(window.innerWidth * 0.75);
    //     this.canvas.nativeElement.height = this.canvaHeight;
    //     this.canvas.nativeElement.width = this.canvaWidth;
    //     this.update();
    // }

    public onFileLoaded(midiService: MidiService, comp: CanvasComponent): void {
        for (let i = 1; i < midiService.tracks.length; i++) {
            midiService.tracks[i].trackVisibilityChange.subscribe(e => this.redraw());
            midiService.tracks[i].colorChange.subscribe(e => this.redraw());
        }

        comp.redraw();
    }

    onWheelScroll(event: WheelEvent) {
        const oldVirtualWidth = this._canvas!.width * this.zoom;
        const oldVirtualHeight = this._canvas!.height * this.zoom;
        const newZoom = this.zoom + 0.00025 * event.deltaY;
        this.zoom = (newZoom < 1) ? 1 : newZoom;

        const oldTransX = this._translateX;
        const pctX = (event.clientX - this._translateX) / oldVirtualWidth;
        const newVirtualWidth = this._canvas!.offsetWidth * this.zoom;
        this._translateX = event.clientX - newVirtualWidth * pctX;

        const pctY = (event.clientY - this._translateY) / oldVirtualHeight;
        const newVirtualHeight = this._canvas!.height * this.zoom;
        this._translateY = event.clientY - newVirtualHeight * pctY;

        this.validateTranslation();
        this._canvas!.style.transform = "translate(" + this._translateX + "px," + this._translateY + "px) scale(" + this.zoom + "," + this.zoom + ")";
    }

    mouseDown(event: PointerEvent) {
        this._isDragging = true;
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        this._canvas!.setPointerCapture(event.pointerId);
        this._canvas!.onpointermove = e => this.mouseMove(e, this);
        this._canvas!.style.cursor = "grabbing";
    }

    mouseUp(event: PointerEvent) {
        this._isDragging = false;
        this._canvas!.releasePointerCapture(event.pointerId);
        this._canvas!.onpointermove = null;
        this._canvas!.style.cursor = "grab";
    }

    mouseMove(event: PointerEvent, comp: CanvasComponent) {
        comp._translateX += event.clientX - comp._lastMouseX;
        comp._translateY += event.clientY - comp._lastMouseY;

        comp.validateTranslation();

        comp._lastMouseX = event.clientX;
        comp._lastMouseY = event.clientY;
        comp._canvas!.style.transform = "translate(" + comp._translateX + "px," + comp._translateY + "px) scale(" + comp.zoom + "," + comp.zoom + ")";
    }

    private validateTranslation(): void {
        if (this._translateX > 0) {
            this._translateX = 0;
        }
        else {
            const minX = this._canvas!.width - this._canvas!.width * this.zoom;
            if (this._translateX < minX) {
                this._translateX = minX;
            }
        }

        if (this._translateY > 0) {
            this._translateY = 0;
        }
        else {
            const minY = this._canvas!.height - this._canvas!.height * this.zoom;
            if (this._translateY < minY) {
                this._translateY = minY;
            }
        }
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

        this._ctx.lineWidth = 1;
        let drawColor: Color;
        let greenColor: Color;
        let redColor: Color;

        if (this._midiService.showHeatMap) {
            greenColor = Color("lime");
            redColor = Color("red");
        }
        else {
            drawColor = Color(color);
        }

        for (let i = 1; i < sequence.length; i++) {
            let overtone = sequence[i];

            if (this._midiService.showHeatMap) {
                greenColor = greenColor!.darken(0.1);
                redColor = redColor!.darken(0.15);
                this._ctx.strokeStyle = this._midiService.heatMapThreshold > Math.abs(overtone.cents) ? greenColor.hex() : redColor.hex();
            }
            else {
                drawColor = drawColor!.darken(0.15);
                this._ctx.strokeStyle = drawColor.hex();
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
