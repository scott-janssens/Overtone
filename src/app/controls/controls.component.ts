import { Component, ViewChild } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadMidiFileComponent } from "../file/load-midi-file.component";
import { MatSliderModule } from '@angular/material/slider';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { TrackItemComponent } from "./track-item.component";
import { CdkDragDrop, CdkDropList, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { MidiService, Display } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";

@Component({
    selector: "ot-controls",
    templateUrl: "./controls.component.html",
    styleUrl: "./controls.component.css",
    imports: [CdkDropList, CdkDrag, LoadMidiFileComponent, TrackItemComponent, MatSliderModule, MatRadioModule, MatCheckbox, MatMenuModule, MatMenuTrigger, MatDividerModule, CommonModule, FormsModule],
    standalone: true
})
export class ControlsComponent {
    DisplayEnum = Display;
    get tracks(): MidiTrack[] { return this.midiService.tracks; }
    get display(): Display { return this.midiService.display; }

    constructor(readonly midiService: MidiService) {
    }

    drop(event: CdkDragDrop<MidiTrack[]>) {
        moveItemInArray(this.midiService.tracks, event.previousIndex, event.currentIndex);
    }

    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;

    contextMenuPosition = { x: '0px', y: '0px' };

    onContextMenu(event: MouseEvent, track: MidiTrack) {
        event.preventDefault();
        this.contextMenuPosition.x = event.clientX + 'px';
        this.contextMenuPosition.y = event.clientY + 'px';
        this.contextMenu.menuData = { track: track };
        this.contextMenu.openMenu();
    }

    onMenuSelect(select: boolean) {
        for (let track of this.tracks) {
            track.isTrackVisible = select;
        }
    }

    onMenuMergeUp(track: MidiTrack) {
        const i = this.tracks.indexOf(track);
        if (i > 0) {
            this.midiService.mergeTracks(this.tracks[i - 1], track);
        }
    }

    anyTrackInstrument(track: MidiTrack): boolean {
        if (track.program?.instrument ?? '' != '') {
            const instrumentTracks = this.tracks.filter(x => x.program != null && x.program!.instrument === track.program!.instrument);
            return instrumentTracks.length > 1;
        }

        return false;
    }

    anyTrackInstruments(): boolean {
        const map = this.midiService.getTrackMap(this.tracks.filter(x => x.program?.instrument ?? "" != ""), x => x.program!.instrument);
        for (let value of map.values()) {
            if (value.length > 1) {
                return true;
            }
        }

        return false;
    }

    anyTrackTypes(): boolean {
        const map = this.midiService.getTrackMap(this.tracks.filter(x => x.program?.type ?? "" != ""), x => x.program!.type);
        for (let value of map.values()) {
            if (value.length > 1) {
                return true;
            }
        }

        return false;
    }
}
