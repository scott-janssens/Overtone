/* eslint-disable */
import { AfterViewInit, Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { CommonModule } from '@angular/common';
import { OvertoneSequence } from "../../overtone/OvertoneSequence";
import { Pitch } from "../../overtone/Pitch";
import { MidiService, NoteDisplay, OvertoneDisplay } from "../services/midi/midi.service";
import { MidiEvent, MidiTrack } from "../services/midi/MidiTrack";
import { VirtualCanvasComponent } from "../virtual-canvas/virtual-canvas.component";

@Component({
    selector: "ot-canvas",
    templateUrl: "./canvas.component.html",
    styleUrl: "./canvas.component.scss",
    imports: [CommonModule, VirtualCanvasComponent],
    standalone: true
})
export class CanvasComponent implements AfterViewInit {
    @ViewChild("canvasRoot") canvasRoot!: ElementRef<HTMLDivElement>;
    @ViewChild("canvas") canvas!: VirtualCanvasComponent;

    @HostListener('window:resize', ['$event'])
    onResize(event: Event) {
        this.canvas.height = this._trackDrawHeight * this._pitchCount + this._headerSize;
        this.canvas.width = this.canvasRoot.nativeElement.clientWidth;
        this.redraw();
    }

    private readonly _trackDrawHeight = 9;
    private readonly _pitchCount = 96;
    private _headerSize: number = 2 * this._trackDrawHeight;
    private _quarterNoteWidth: number = this._trackDrawHeight * 4;
    private _trackDrawHeightZoomed: number = this._trackDrawHeight;
    private _overtones: OvertoneItem[] = [];

    private _canvasCtx!: CanvasRenderingContext2D;
    private _whiteKey: string = "#04242e";
    private _blackKey: string = "#000000";

    private get zoom(): number { return this._midiService.zoomLevel; }
    private set zoom(value: number) {
        this._midiService.zoomLevel = value;
        this.onZoom(value);
    }
    private _octaveHeight: number = 12 * this._trackDrawHeight;

    private _firstDrawBeat: number = 1;
    private _firstDrawBar: number = 1;
    private _viewRight: number = 0;

    constructor(protected _midiService: MidiService) {
        _midiService.zoomLevelChange.subscribe(v => this.performZoom(v[0], v[1]));
    }

    ngAfterViewInit(): void {
        window.addEventListener("scroll", e => this.onCanvasScroll(e), true);
        this.canvas.onWheel.subscribe(e => this.zoom = this.canvas.zoom);

        this._canvasCtx = this.canvas.CanvasRenderingContext2D;
        this._midiService.midiFileLoaded.subscribe(e => this.onFileLoaded(e));
        this._midiService.overtoneDisplayChange.subscribe(e => this.redraw());
        this._midiService.centsThresholdChange.subscribe(e => this.redraw());
        this._midiService.tracksChange.subscribe(e => { this.trackManagement(); this.redraw() });
        this._midiService.noteDisplayChange.subscribe(e => this.redraw());
        this._midiService.drawBackgroundChange.subscribe(e => this.redraw());
        this._midiService.drawMonochromeChange.subscribe(e => this.redraw());
    }

    public onFileLoaded(midiService: MidiService | null): void {
        if (midiService !== null) {
            this.trackManagement();
            this.zoom = 1;
            this.canvas.height = this._trackDrawHeight * this._pitchCount + this._headerSize;
            this.canvas.width = this.canvasRoot.nativeElement.clientWidth;
            this.canvas.scrollLeft = this.canvas.scrollTop = 0;
            this.canvas.setDimensions(midiService.totalBeats * this._quarterNoteWidth + this._headerSize, this._trackDrawHeight * this._pitchCount + this._headerSize);
            this.redraw();
        }
        else {
            this._canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.canvas.setDimensions(0, 0);
            this.canvas.height = 0;
        }
    }

    private _trackSubscriptions: MidiTrack[] = [];

    private trackManagement() {
        const newSubs: MidiTrack[] = [];

        for (let i = 0; i < this._midiService.tracks.length; i++) {
            const track = this._midiService.tracks[i];
            newSubs.push(track);
            const subIdx = this._trackSubscriptions.indexOf(track);

            if (subIdx === -1) {
                track.trackVisibilityChange.subscribe(e => this.redraw());
                track.colorChange.subscribe(e => this.redraw());
            }
            else {
                this._trackSubscriptions.splice(subIdx, 1);
            }
        }

        for (const track of this._trackSubscriptions) {
            track.trackVisibilityChange.unsubscribe();
            track.colorChange.unsubscribe();
        }

        this._trackSubscriptions = newSubs;
    }

    onCanvasScroll(event: Event): void {
        this.redraw();
    }

    private onZoom(value: number): void {
        this._trackDrawHeightZoomed = this._trackDrawHeight * value;
        this._octaveHeight = 12 * this._trackDrawHeightZoomed;
    }

    private performZoom(oldZoom: number, newZoom: number): void {
        this.onZoom(newZoom);
        this.canvas.performZoom(newZoom);
    }

    private redraw(): void {
        this._firstDrawBeat = Math.floor(this.canvas.scrollLeft / (this.zoom * this._quarterNoteWidth)) + 1;
        this._firstDrawBar = this._midiService.getBarFromBeat(this._firstDrawBeat);
        this._viewRight = this.canvas.scrollLeft + this.canvas.width;
        this._canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        this.drawBackground();
        this.drawBarLines();

        for (let i = this._midiService.tracks.length - 1; i >= 0; i--) {
            this.drawMidiTrack(this._midiService.tracks[i]);
        }

        this.drawOvertones();
        this.drawPitchHeader();
        this.drawBarHeader();
    }

    private drawMidiTrack(track: MidiTrack): void {
        if (track.isTrackVisible) {
            this._canvasCtx.fillStyle = this._midiService.drawMonochrome ? "gray" : track.color;
            this._canvasCtx.strokeStyle = this._canvasCtx.fillStyle;
            const lastLineWidth = this._canvasCtx.lineWidth;
            this._canvasCtx.lineWidth = 0.5;

            const beatPos = this._quarterNoteWidth * this.zoom / this._midiService.midiFile!.header.ticksPerBeat;
            const startTime = this.canvas.scrollLeft / beatPos;
            const endTime = startTime + this._viewRight / beatPos;
            const yOffset = -this.canvas.scrollTop + this._headerSize;
            const trackZoomNarrow = this._trackDrawHeightZoomed - 2;

            for (const note of track.notesFrom(startTime)) {
                if (note == null || note.start > endTime) {
                    break;
                }

                const x = this._headerSize + (note.start - startTime) * beatPos;
                const width = note.width! * beatPos;

                if (this._midiService.noteDisplay !== NoteDisplay.Hidden) {
                    const y = (119 - note.noteNumber) * this._trackDrawHeightZoomed + yOffset;

                    if (this._midiService.noteDisplay === NoteDisplay.Filled) {
                        this._canvasCtx.fillRect(x, y, width, trackZoomNarrow);
                    }
                    else {
                        this._canvasCtx.strokeRect(x, y, width, trackZoomNarrow);
                    }
                }

                this._overtones.push(new OvertoneItem(note.noteNumber, x, width, track.color));
            }

            this._canvasCtx.lineWidth = lastLineWidth;
        }
    }

    private drawOvertones(): void {
        const lastLineWidth = this._canvasCtx.lineWidth;
        this._canvasCtx.lineWidth = 1;

        for (const item of this._overtones) {
            item.color = this._midiService.drawMonochrome ? "gray" : item.color;

            const sequence = new OvertoneSequence(Pitch.fromMidi(item.midiNote).frequency, 8372);

            this._canvasCtx.lineWidth = 1;
            let drawColor: string;
            let greenColor!: string;
            let redColor!: string;

            if (this._midiService.overtoneDisplay == OvertoneDisplay.CentsOffset) {
                greenColor = this._midiService.drawMonochrome ? item.color : "lime";
                redColor = "red";
            }
            else {
                drawColor = item.color;
            }

            const yOffset = this._trackDrawHeightZoomed / 2 - this.canvas.scrollTop + this._headerSize;

            for (let i = 1; i < Math.min(15, sequence.length); i++) {
                const overtone = sequence[i];
                this._canvasCtx.lineWidth *= 0.8;

                if (this._midiService.overtoneDisplay == OvertoneDisplay.CentsOffset) {
                    this._canvasCtx.strokeStyle = this._midiService.centsThreshold > Math.abs(overtone.cents) ? greenColor : redColor;
                }
                else {
                    this._canvasCtx.strokeStyle = drawColor!;
                }

                const y = this._trackDrawHeightZoomed * (119 - overtone.closestPitch.midi - overtone.cents / 100) + yOffset;

                if (y <= this._headerSize) {
                    break;
                }

                this._canvasCtx.beginPath();
                this._canvasCtx.moveTo(item.x, y);
                this._canvasCtx.lineTo(item.x + item.width, y);
                this._canvasCtx.stroke();
            }
        }

        this._overtones = [];
        this._canvasCtx.lineWidth = lastLineWidth;
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

        while (i < this.canvas.width) {
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(i, this._headerSize);
            this._canvasCtx.lineTo(i, this._headerSize + this.canvas.height);
            this._canvasCtx.stroke();
            bar++;
            item = this._midiService.getMetaDataItem(bar);

            if (item == undefined) {
                break;
            }

            i += this.zoom * this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator;
        }
    }

    private drawBackground(): void {
        if (!this._midiService.drawBackground) {
            return;
        }

        const h2 = 2 * this._trackDrawHeightZoomed;
        const yOffset = this._headerSize - this.canvas.scrollTop

        this._canvasCtx.fillStyle = this._whiteKey;
        this._canvasCtx.strokeStyle = "black";

        for (let i = 0; i < this._pitchCount; i += 12) {
            let y = i * this._trackDrawHeightZoomed + yOffset;

            if (y + this._octaveHeight < this._headerSize || y > this.canvas.height) {
                continue;
            }

            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, this._trackDrawHeightZoomed);
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(this._headerSize, y);
            this._canvasCtx.lineTo(this._viewRight, y);
            this._canvasCtx.stroke();
            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, this._trackDrawHeightZoomed);
            y += h2;
            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, this._trackDrawHeightZoomed);
            y += h2;
            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, this._trackDrawHeightZoomed);
            y += h2;
            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, h2);
            this._canvasCtx.beginPath();
            y += this._trackDrawHeightZoomed;
            this._canvasCtx.moveTo(this._headerSize, y);
            this._canvasCtx.lineTo(this._viewRight, y);
            this._canvasCtx.stroke();
            y += h2;
            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, this._trackDrawHeightZoomed);
            y += h2;
            this._canvasCtx.fillRect(this._headerSize, y, this.canvas.width, this._trackDrawHeightZoomed);
        }
    }

    private drawBarHeader(): void {
        const font = this._trackDrawHeight * 1.5;

        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(this._headerSize + 1, 0, this.canvas.width, this._headerSize);

        this._canvasCtx.strokeStyle = this._blackKey;
        this._canvasCtx.lineWidth = 1;
        this._canvasCtx.font = font + "px Arial sans-serif";
        this._canvasCtx.fillStyle = this._blackKey;
        this._canvasCtx.textAlign = "center";

        let bar = 1;
        let item = this._midiService.getMetaDataItem(bar);
        let width = this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator * this.zoom;
        let i = this._headerSize - this.canvas.scrollLeft;
        this._canvasCtx.fillText(String(bar), i + width / 2, font, width);

        for (; i < this.canvas.width && item != undefined; i += width, bar++, item = this._midiService.getMetaDataItem(bar)) {
            width = this._quarterNoteWidth * item.timeSigNumerator * 4 / item.timeSigDenominator * this.zoom;
            if (bar < this._firstDrawBar) {
                continue;
            }
            this._canvasCtx.fillText(String(bar), i + width / 2, font, width);
            const x = i + width;
            this._canvasCtx.beginPath();
            this._canvasCtx.moveTo(x, 0);
            this._canvasCtx.lineTo(x, this._headerSize);
            this._canvasCtx.stroke();
        }

        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(0, 0, this._headerSize, this._headerSize);
    }

    private drawPitchHeader(): void {
        this._canvasCtx.fillStyle = "gray";
        this._canvasCtx.fillRect(0, this._headerSize + 1, this._headerSize, this.canvas.height);
        this._canvasCtx.strokeStyle = this._blackKey;

        const bottom = this._headerSize + this._trackDrawHeightZoomed * this._pitchCount;

        for (let i = 1; i < 10; i++) {
            this._canvasCtx.beginPath();
            const ly = bottom - i * this._octaveHeight - this.canvas.scrollTop;
            this._canvasCtx.moveTo(0, ly);
            this._canvasCtx.lineTo(this._headerSize, ly);
            this._canvasCtx.stroke();
        }

        const fontHeight = this._trackDrawHeight * 1.5;
        this._canvasCtx.font = fontHeight + "px Arial sans-serif";
        this._canvasCtx.fillStyle = this._blackKey;
        this._canvasCtx.textAlign = "center";

        this._canvasCtx.save();
        this._canvasCtx.rotate(-Math.PI / 2);
        let xOffset = -bottom + this._octaveHeight / 2 + this.canvas.scrollTop;
        for (let i = 1; i < 10; i++, xOffset += this._octaveHeight) {
            this._canvasCtx.fillText(String(i), xOffset, fontHeight, this._octaveHeight);
        }
        this._canvasCtx.restore();

        this._canvasCtx.fillStyle = "gold";
        this._canvasCtx.fillRect(0, this._headerSize + 50 * this._trackDrawHeightZoomed - this.canvas.scrollTop, this._trackDrawHeight, this._trackDrawHeightZoomed);
    }
}

// class Note {
//     public start: number;
//     public noteNumber: number;
//     public velocity: number;

//     constructor(start: number, noteNumber: number, velocity: number) {
//         this.start = start;
//         this.velocity = velocity;
//         this.noteNumber = noteNumber;
//     }
// }

class OvertoneItem {
    midiNote: number;
    x: number;
    width: number;
    color: string;

    constructor(midiNote: number, x: number, width: number, color: string) {
        this.midiNote = midiNote;
        this.x = x;
        this.width = width;
        this.color = color;
    }
}
