import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { CommonModule } from '@angular/common';
import { OvertoneSequence } from "../../overtone/OvertoneSequence";
import { Pitch } from "../../overtone/Pitch";
import { MidiService, OvertoneDisplay } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";
import Color from "color";
import { VirtualCanvasComponent } from "../virtual-canvas/virtual-canvas.component";

@Component({
    selector: "ot-canvas",
    templateUrl: "./canvas.component.html",
    styleUrl: "./canvas.component.scss",
    imports: [CommonModule, VirtualCanvasComponent],
    standalone: true
})

export class CanvasComponent implements AfterViewInit {
    @ViewChild("canvas") canvas!: VirtualCanvasComponent;

    private readonly _trackDrawHeight = 9;
    private readonly _pitchCount = 96;
    private _headerSize: number = 2 * this._trackDrawHeight;
    private _quarterNoteWidth: number = this._trackDrawHeight * 4;
    private _beatPos: number = 0;

    // private _pitchesContainer: HTMLDivElement | undefined;
    private _container: HTMLDivElement | undefined;
    // private _canvas: HTMLCanvasElement | undefined;
    private _canvasCtx!: CanvasRenderingContext2D;
    // private _pitches: HTMLCanvasElement | undefined;
    // private _canvasCtx: CanvasRenderingContext2D | undefined;
    // private _bars: HTMLCanvasElement | undefined;
    // private _barsCtx!: CanvasRenderingContext2D;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";

    private _lastVirtualWidth: number = 0;
    private _lastVirtualHeight: number = 0;
    private get zoom(): number { return this._midiService.zoomLevel; }
    private set zoom(value: number) { this._midiService.zoomLevel = value; }
    private _lastWheelEvent: WheelEvent | null = null;
    private _lastMouseX: number = -1;
    private _lastMouseY: number = -1;
    private _octaveHeight: number = 12 * this._trackDrawHeight;

    private _firstDrawBeat: number = 1;
    private _firstDrawBar: number = 1;
    private _viewRight: number = 0;

    constructor(protected _midiService: MidiService) {
        _midiService.zoomLevelChange.subscribe(v => this.performZoom(v));
        //_midiService.zoomLevelChange.subscribe(v => this.redraw());
    }

    windowWheelHandler(e: Event): void {
        if ((e?.target as HTMLCanvasElement)?.id == "canvas") {
            e.preventDefault();
        }
    }

    ngAfterViewInit(): void {
        window.addEventListener("wheel", this.windowWheelHandler, { passive: false });
        window.addEventListener("scroll", e => this.onCanvasScroll(e), true);

        // this._pitchesContainer = document.getElementById("pitches-container") as HTMLDivElement;
        // this._container = document.getElementById("canvas-container") as HTMLDivElement;
        //this._canvas = document.getElementById('canvas') as HTMLCanvasElement;

        // if (this._canvas === null) {
        //     throw new Error("no id 'canvas' found.");
        // }

        //this.canvas.height = this._trackDrawHeight * this._pitchCount + this._headerSize;
        this._canvasCtx = this.canvas.CanvasRenderingContext2D;

        // this._pitches = (document.getElementById("pitches") as HTMLCanvasElement);
        // this._pitches.height = this._canvas.height;
        // this._pitches.width = this._headerSize;
        // this._canvasCtx = this._pitches.getContext("2d")!;

        // this._bars = (document.getElementById("bars") as HTMLCanvasElement);
        // this._bars.height = this._headerSize;
        // this._barsCtx = this._bars.getContext("2d")!;

        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e));
        this._midiService.overtoneDisplayChange.subscribe(e => this.redraw());
        this._midiService.centsThresholdChange.subscribe(e => this.redraw());
        this._midiService.tracksChange.subscribe(e => { this.trackManagement(); this.redraw() });
        this._midiService.drawBackgroundChange.subscribe(e => this.redraw());
        this._midiService.drawMonochromeChange.subscribe(e => this.redraw());
    }

    public onFileLoaded(midiService: MidiService): void {
        this.trackManagement();

        this.zoom = 1;
        this._beatPos = this._quarterNoteWidth / midiService.midiFile!.header.ticksPerBeat;
        this.canvas.scrollLeft = this.canvas.scrollTop = 0;
        this.canvas.setDimensions(midiService.totalBeats * this._quarterNoteWidth, this._trackDrawHeight * this._pitchCount + this._headerSize);

        this.redraw();
    }

    private _trackSubscriptions: MidiTrack[] = [];

    private trackManagement() {
        let newSubs: MidiTrack[] = [];

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            let track = this._midiService.tracks[i];
            newSubs.push(track);
            let subIdx = this._trackSubscriptions.indexOf(track);

            if (subIdx === -1) {
                track.trackVisibilityChange.subscribe(e => this.redraw());
                track.colorChange.subscribe(e => this.redraw());
            }
            else {
                this._trackSubscriptions.splice(subIdx, 1);
            }
        }

        for (let track of this._trackSubscriptions) {
            track.trackVisibilityChange.unsubscribe();
            track.colorChange.unsubscribe();
        }

        this._trackSubscriptions = newSubs;
    }

    onWheelScroll(event: WheelEvent) {
        this._lastWheelEvent = event;
        this.zoom += 0.00025 * event.deltaY;
        this._lastWheelEvent = null;
    }

    onCanvasScroll(event: Event): void {
        //this._pitchesContainer!.style.transform = "translate(0px," + -(<HTMLDivElement>event.target).scrollTop + "px)";
        this.redraw();
    }

    mouseDown(event: PointerEvent) {
        this._lastMouseX = event.clientX;
        this._lastMouseY = event.clientY;
        this.canvas.canvas.nativeElement.setPointerCapture(event.pointerId);
        this.canvas.canvas.nativeElement.onpointermove = e => this.mouseMove(e, this);
        this.canvas.style.cursor = "grabbing";
    }

    mouseUp(event: PointerEvent) {
        this.canvas.canvas.nativeElement.releasePointerCapture(event.pointerId);
        this.canvas.canvas.nativeElement.onpointermove = null;
        this.canvas.style.cursor = "grab";
    }

    mouseMove(event: PointerEvent, comp: CanvasComponent) {
        comp._container!.scrollLeft -= event.clientX - comp._lastMouseX;
        comp._container!.scrollTop -= event.clientY - comp._lastMouseY;

        comp._lastMouseX = event.clientX;
        comp._lastMouseY = event.clientY;
    }

    private performZoom(newZoom: number): void {
        let x: number;
        let y: number;

        if (this._lastWheelEvent != null) {
            x = this._lastWheelEvent.clientX;
            y = this._lastWheelEvent.clientY;
        }
        else {
            x = this._container!.clientWidth / 2;
            y = this._container!.clientHeight / 2
        }

        if (this._lastVirtualWidth === 0) {
            this._lastVirtualWidth = this.canvas.width;
            this._lastVirtualHeight = this.canvas.height;
        }

        const pctX = (x + this._container!.scrollLeft) / this._lastVirtualWidth;
        const newVirtualWidth = this.canvas.width * this.zoom;
        this._container!.scrollLeft = newVirtualWidth * pctX - x;
        this._lastVirtualWidth = newVirtualWidth;

        const pctY = (y + this._container!.scrollTop) / this._lastVirtualHeight;
        const newVirtualHeight = this.canvas.height * this.zoom;
        this._container!.scrollTop = newVirtualHeight * pctY - y;
        this._lastVirtualHeight = newVirtualHeight;

        //this.canvas.style.transform = "scale(" + this.zoom + ")";
        //this.canvas.height = this._trackDrawHeight * this._trackCount * this.zoom;
        //this.canvas.width = this._midiService.totalBeats * quarterNoteWidth * this.zoom;
        //this._bars!.width = this._midiService.totalBeats * quarterNoteWidth * this.zoom;

        this._container?.offsetHeight; // cause container div to redraw so vertical scrollbar refreshes

        this._octaveHeight = 12 * this._trackDrawHeight * this.zoom;

        // this.drawBarTrack();
        // this.drawPitchTrack();
        this.redraw();
    }

    private redraw(): void {
        this._firstDrawBeat = Math.floor(this.canvas.scrollLeft / (this.zoom * this._quarterNoteWidth)) + 1;
        this._firstDrawBar = this._midiService.getBarFromBeat(this._firstDrawBeat);
        //this._viewRight = /*this._container!.scrollLeft +*/ this._container!.clientWidth;
        this._viewRight = this.canvas.scrollLeft + this.canvas.width;

        this._canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        // this._canvasCtx!.clearRect(0, 0, this._pitches!.width, this._pitches!.height)
        // this._barsCtx!.clearRect(0, 0, this._bars!.width, this._bars!.height)

        this.drawBackground();
        this.drawBarLines();

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            this.drawMidiTrack(this._midiService.tracks[i]);
        }

        this.drawPitchHeader();
        this.drawBarHeader();
    }

    private drawMidiTrack(track: MidiTrack): void {
        if (track.isTrackVisible) {
            let notes: { [Key: number]: Note | null } = {};

            this._canvasCtx.fillStyle = this._midiService.drawMonochrome ? "gray" : track.color;

            const startTime = this.canvas.scrollLeft / this._beatPos + this._headerSize;

            for (let event of track.iterateFrom(startTime)) {
                if (event.event.type == "channel") {
                    if (event.globalTime * this._beatPos > this._viewRight && event.event.subtype !== "noteOff") {
                        break;
                    }

                    switch (event.event.subtype) {
                        case "noteOn":
                            if (notes[event.event.noteNumber] == null) {
                                notes[event.event.noteNumber] = new Note(event.globalTime - startTime, event.event.noteNumber, event.event.velocity);
                            }
                            break;
                        case "noteOff":
                            let note = notes[event.event.noteNumber];
                            if (note != null) {
                                const x = this._headerSize + 1 + this._beatPos * note.start;
                                let width = (event.globalTime - note.start - startTime) * this._beatPos;
                                this._canvasCtx.fillRect(x, (109 - note.noteNumber) * this._trackDrawHeight, width, this._trackDrawHeight - 2);
                                notes[event.event.noteNumber] = null;
                                this.drawOvertones(event.event.noteNumber, x, width, track.color);
                            }
                            break;
                        case "controller":
                            break;
                    }
                }
            }
        }
    }

    private drawOvertones(midiNote: number, x: number, width: number, color: string): void {
        color = this._midiService.drawMonochrome ? "gray" : color;

        const sequence = new OvertoneSequence(Pitch.fromMidi(midiNote).frequency, 4068);
        const halfHeight = this._trackDrawHeight / 2;

        this._canvasCtx.lineWidth = 1;
        let drawColor: Color;
        let greenColor: Color;
        let redColor: Color;

        if (this._midiService.overtoneDisplay == OvertoneDisplay.CentsOffset) {
            greenColor = this._midiService.drawMonochrome ? Color(color) : Color("lime");
            redColor = Color("red");
        }
        else {
            drawColor = Color(color);
        }

        for (let i = 1; i < Math.min(15, sequence.length); i++) {
            let overtone = sequence[i];

            if (this._midiService.overtoneDisplay == OvertoneDisplay.CentsOffset) {
                greenColor = greenColor!.darken(0.1);
                redColor = redColor!.darken(0.15);
                this._canvasCtx.strokeStyle = this._midiService.centsThreshold > Math.abs(overtone.cents) ? greenColor.hex() : redColor.hex();
            }
            else {
                drawColor = drawColor!.darken(0.15);
                this._canvasCtx.strokeStyle = drawColor.hex();
            }

            let y = -(overtone.closestPitch.midi - 107) * this._trackDrawHeight + halfHeight - this._trackDrawHeight * overtone.cents / 100;

            if (y <= this._headerSize) {
                break;
            }

            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(x + width, y);
            this._canvasCtx.stroke();
        }
    }

    private drawBarLines(): void {
        this._canvasCtx.strokeStyle = "black";
        this._canvasCtx.lineWidth = 1;

        // TODO: optimize this using metadata
        let bar = 1;
        let item = this._midiService.getMetaDataItem(bar);
        let i = this._headerSize - this.canvas.scrollLeft + this.zoom * this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator;

        for (i; bar < this._firstDrawBar; i += this.zoom * this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator) {
            bar++;
            item = this._midiService.getMetaDataItem(bar);
        }

        for (; i < this.canvas.width;
            i += this.zoom * this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator) {
            this._canvasCtx.beginPath();
            let y = this._headerSize;
            this._canvasCtx.moveTo(i, y);
            this._canvasCtx.lineTo(i, y + this.canvas.height);
            this._canvasCtx.stroke();
            bar++;
            item = this._midiService.getMetaDataItem(bar);
        }
    }

    private drawBackground(): void {
        if (!this._midiService.drawBackground) {
            return;
        }

        const h = this._trackDrawHeight * this.zoom;
        const h2 = 2 * h;
        const x = this._headerSize;
        const w = this.canvas.width;

        this._canvasCtx.fillStyle = this._whiteKey;
        this._canvasCtx.strokeStyle = "black";

        for (let i = 0; i < this._pitchCount; i += 12) {
            let y = i * h + this._headerSize;

            // if (this._container!.scrollTop > y + this._octaveHeight) {
            //     continue;
            // }

            // if (y > this._container!.scrollTop + this._container!.clientHeight) {
            //     break;
            // }

            this._canvasCtx.fillRect(x, y, w, h);
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(this._viewRight, y);
            this._canvasCtx.stroke();
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h2);
            this._canvasCtx.beginPath();
            y += h;
            this._canvasCtx.moveTo(x, y);
            this._canvasCtx.lineTo(this._viewRight, y);
            this._canvasCtx.stroke();
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
            y += h2;
            this._canvasCtx.fillRect(x, y, w, h);
        }
    }

    private drawBarHeader(): void {
        // this._bars!.width = this._canvas!.width * this.zoom;
        const font = this._trackDrawHeight * 1.5;

        // this._barsCtx.fillStyle = "gray";
        // this._barsCtx.fillRect(this._container!.scrollLeft, 0, this._container!.clientWidth, this._headerSize);

        // this._barsCtx.strokeStyle = this._blackKey;;
        // this._barsCtx.lineWidth = 1;
        // this._barsCtx.font = font + "px Arial sans-serif";
        // this._barsCtx.fillStyle = this._blackKey;
        // this._barsCtx.textAlign = "center";
        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(0, 0, this.canvas.width, this._headerSize);

        this._canvasCtx.strokeStyle = this._blackKey;;
        this._canvasCtx.lineWidth = 1;
        this._canvasCtx.font = font + "px Arial sans-serif";
        this._canvasCtx.fillStyle = this._blackKey;
        this._canvasCtx.textAlign = "center";

        let bar = 1;
        let item = this._midiService.getMetaDataItem(bar);
        let width = this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator * this.zoom;
        let i = this._headerSize - this.canvas.scrollLeft;

        for (; i < this.canvas.width; i += width, bar++, item = this._midiService.getMetaDataItem(bar)) {
            width = this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator * this.zoom;
            if (bar < this._firstDrawBar) continue;
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(i, 0);
            this._canvasCtx.lineTo(i, this._headerSize);
            this._canvasCtx.stroke();
            this._canvasCtx.fillText(String(bar), i + width / 2, font, width);
        }
    }

    private drawPitchHeader(): void {
        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(0, this._headerSize, this._headerSize, this.canvas.height);
        this._canvasCtx.strokeStyle = this._blackKey;

        for (let i = 1; i < 10; i++) {
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(0, this.canvas.height - i * this._octaveHeight);
            this._canvasCtx.lineTo(this._headerSize, this.canvas.height - i * this._octaveHeight);
            this._canvasCtx.stroke();
        }

        const fontHeight = this._trackDrawHeight * 1.5;
        this._canvasCtx.font = fontHeight + "px Arial sans-serif";
        this._canvasCtx.fillStyle = this._blackKey;
        this._canvasCtx.textAlign = "center";

        this._canvasCtx.save();
        this._canvasCtx.rotate(-Math.PI / 2);
        let xOffset = -this.canvas.height + this._octaveHeight / 2;
        for (let i = 1; i < 10; i++, xOffset += this._octaveHeight) {
            this._canvasCtx.fillText(String(i), xOffset, fontHeight, this._octaveHeight);
        }
        this._canvasCtx.restore();

        this._canvasCtx.fillStyle = "gold";
        const zoomedTrackHeight = this._trackDrawHeight * this.zoom;
        this._canvasCtx.fillRect(0, this._headerSize + 38 * zoomedTrackHeight, this._trackDrawHeight, zoomedTrackHeight);
    }
}

class Note {
    public start: number;
    public noteNumber: number;
    public velocity: number;

    constructor(start: number, noteNumber: number, velocity: number) {
        this.start = start;
        this.velocity = velocity;
        this.noteNumber = noteNumber;
    }
}
