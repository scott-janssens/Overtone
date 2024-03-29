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
import { MidiService, NoteDisplay, OvertoneDisplay } from "../services/midi/midi.service";
import { MidiTrack } from "../services/midi/MidiTrack";
import { MatIcon } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
    selector: "ot-controls",
    templateUrl: "./controls.component.html",
    styleUrl: "./controls.component.scss",
    imports: [CdkDropList, CdkDrag, LoadMidiFileComponent, TrackItemComponent, MatSliderModule, MatRadioModule, MatCheckbox, MatMenuModule, MatMenuTrigger, MatDividerModule, CommonModule, FormsModule, MatIcon, MatDialogModule],
    standalone: true
})
export class ControlsComponent {
    OvertoneDisplayEnum = OvertoneDisplay;
    NoteDisplayEnum = NoteDisplay;

    constructor(readonly model: MidiService, private dialog: MatDialog) {
    }

    drop(event: CdkDragDrop<MidiTrack[]>) {
        moveItemInArray(this.model.tracks, event.previousIndex, event.currentIndex);
        this.model.tracksChange.next(this.model);
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
        for (const track of this.model.tracks) {
            track.isTrackVisible = select;
        }
    }

    onMenuMergeUp(track: MidiTrack) {
        const i = this.model.tracks.indexOf(track);
        if (i > 0) {
            this.model.mergeTracks(this.model.tracks[i - 1], track);
        }
    }

    anyTrackInstrument(track: MidiTrack): boolean {
        if (track.program?.instrument ?? '' != '') {
            const instrumentTracks = this.model.tracks.filter(x => x.program != null && x.program!.instrument === track.program!.instrument);
            return instrumentTracks.length > 1;
        }

        return false;
    }

    anyTrackInstruments(): boolean {
        const map = this.model.getTrackMap(this.model.tracks.filter(x => x.program?.instrument ?? "" != ""), x => x.program!.instrument);
        for (const value of map.values()) {
            if (value.length > 1) {
                return true;
            }
        }

        return false;
    }

    anyTrackTypes(): boolean {
        const map = this.model.getTrackMap(this.model.tracks.filter(x => x.program?.type ?? "" != ""), x => x.program!.type);
        for (const value of map.values()) {
            if (value.length > 1) {
                return true;
            }
        }

        return false;
    }

    openHelpDialog(): void {
        this.dialog.open(HelpDialogContentComponent, {width: '50%', panelClass: 'help-container'});
    }
}

@Component({
    selector: "ot-help-dialog-content",
    templateUrl: "./help-dialog-content.html",
    styleUrl: './help-dialog-content.scss',
    standalone: true,
    imports: [MatDialogModule],
  })
  export class HelpDialogContentComponent {}