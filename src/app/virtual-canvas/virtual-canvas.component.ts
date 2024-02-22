import { AfterViewInit, Component, ElementRef, HostBinding, ViewChild } from '@angular/core';
import { ScrollBarComponent } from '../scroll-bar/scroll-bar.component';
import { NgClass } from '@angular/common';
import { Subject } from 'rxjs';

@Component({
  selector: 'virtual-canvas',
  standalone: true,
  imports: [ScrollBarComponent, NgClass],
  templateUrl: './virtual-canvas.component.html',
  styleUrl: './virtual-canvas.component.scss'
})
export class VirtualCanvasComponent implements AfterViewInit {
  @ViewChild("container") container!: ElementRef<HTMLDivElement>;
  @ViewChild("canvas") canvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild("vScroll") vScroll!: ScrollBarComponent;
  @ViewChild("hScroll") hScroll!: ScrollBarComponent;

  @HostBinding("style") style!: CSSStyleDeclaration;

  private _dimensionX: number = 0;
  private _dimensionY: number = 0;
  private _lastWheelEvent: WheelEvent | null = null;
  private _lastVirtualWidth: number = 0;
  private _lastVirtualHeight: number = 0;
  private _lastMouseX: number = -1;
  private _lastMouseY: number = -1;

  private _zoom: number = 1;
  get zoom(): number { return this._zoom; }

  get height(): number { return this.canvas.nativeElement.height; }
  set height(value: number) {
    this.canvas.nativeElement.height = value;
    this.canvas.nativeElement.style.height = value + "px";
    this.container.nativeElement.style.height = value + "px";
    this.vScroll.scrollContainer.nativeElement.style.height = value + "px";
    this.adjustScrollArea();
  }

  get width(): number { return this.canvas.nativeElement.width }
  set width(value: number) {
    this.canvas.nativeElement.width = value;
    this.canvas.nativeElement.style.width = value + "px";
    this.container.nativeElement.style.width = value + "px";
    this.hScroll.scrollContainer.nativeElement.style.width = value + "px";
    this.adjustScrollArea();
  }

  get scrollHeight(): number { return this.vScroll.scrollContainer.nativeElement.scrollHeight; }
  get scrollWidth(): number { return this.hScroll.scrollContainer.nativeElement.scrollWidth; }
  get scrollTop(): number { return this.vScroll.scrollContainer.nativeElement.scrollTop; }
  set scrollTop(value: number) { this.vScroll.scrollContainer.nativeElement.scrollTop = value; }
  get scrollLeft(): number { return this.hScroll.scrollContainer.nativeElement.scrollLeft; }
  set scrollLeft(value: number) { this.hScroll.scrollContainer.nativeElement.scrollLeft = value; }

  get CanvasRenderingContext2D(): CanvasRenderingContext2D { return this.canvas.nativeElement.getContext("2d")!; }

  gridClass: string = "canvas-container grid1x1";

  onWheel: Subject<WheelEvent> = new Subject<WheelEvent>();

  virtualCanvasWheelHandler(e: WheelEvent, sender: VirtualCanvasComponent): void {
    if ((e?.target as HTMLCanvasElement)?.id == "canvas") {
      e.preventDefault();

      sender._lastWheelEvent = e;
      let zoom = Math.min(4, sender._zoom + Math.floor(e.deltaY / 4) / 1000);
      zoom = Math.max(1, zoom);

      if (zoom !== this._zoom) {
        sender.performZoom(zoom);
      }

      sender._lastWheelEvent = null;

      sender.onWheel.next(<WheelEvent>(e));
    }
  }

  ngAfterViewInit(): void {
    window.addEventListener("wheel", e => this.virtualCanvasWheelHandler(e, this), { passive: false });

    this.height = this.canvas.nativeElement.clientHeight;
    this.width = this.canvas.nativeElement.clientWidth;
  }

  setDimensions(x: number, y: number): void {
    this._dimensionX = x;
    this._dimensionY = y;

    this.hScroll.setScrollExtent(x);
    this.vScroll.setScrollExtent(y);
    this.adjustScrollArea();
  }

  private adjustScrollArea() {
    this.canvas.nativeElement.width = this.container.nativeElement.clientWidth - (this.vScroll.isVisible ? this.vScroll.scrollbarWidth : 0);
    this.canvas.nativeElement.style.width = this.canvas.nativeElement.width + "px";
    this.container.nativeElement.style.height = this.canvas.nativeElement.height + (this.hScroll.isVisible ? this.hScroll.scrollbarWidth : 0) + "px";
    this.vScroll.scrollContainer.nativeElement.style.height = this.canvas.nativeElement.height + "px";
    this.hScroll.scrollContainer.nativeElement.style.width = this.canvas.nativeElement.width + "px";
    this.setGridClass();
  }

  private setGridClass(): void {
    let visible = (this.hScroll.isVisible ? 2 : 0) + (this.vScroll.isVisible ? 1 : 0);

    switch (visible) {
      case 0:
        this.gridClass = "canvas-container grid1x1";
        break;
      case 1:
        this.gridClass = "canvas-container grid2x1";
        break;
      case 2:
        this.gridClass = "canvas-container grid1x2";
        break;
      case 3:
        this.gridClass = "canvas-container grid2x2";
        break;
    }
  }

  performZoom(newZoom: number): void {
    if (newZoom !== this._zoom) {
      let x: number;
      let y: number;

      if (this._lastWheelEvent != null) {
        x = this._lastWheelEvent.clientX;
        y = this._lastWheelEvent.clientY;
      }
      else {
        x = this.canvas.nativeElement.width / 2;
        y = this.canvas.nativeElement.height / 2
      }

      if (this._lastVirtualWidth === 0) {
        this._lastVirtualWidth = this.hScroll.scrollContainer.nativeElement.scrollWidth;
        this._lastVirtualHeight = this.hScroll.scrollContainer.nativeElement.scrollHeight;
      }

      this._zoom = newZoom;
      this.hScroll.setScrollExtent(this._dimensionX * newZoom);
      this.vScroll.setScrollExtent(this._dimensionY * newZoom);
      this.adjustScrollArea();

      const pctX = (x + this.hScroll.scrollContainer.nativeElement.scrollLeft) / this._lastVirtualWidth;
      this.hScroll.scrollContainer.nativeElement.scrollLeft = this.hScroll.scrollContainer.nativeElement.scrollWidth * pctX - x;
      this._lastVirtualWidth = this.hScroll.scrollContainer.nativeElement.scrollWidth;

      const pctY = (y + this.vScroll.scrollContainer.nativeElement.scrollTop) / this._lastVirtualHeight;
      this.vScroll.scrollContainer.nativeElement.scrollTop = this.vScroll.scrollContainer.nativeElement.scrollHeight * pctY - y;
      this._lastVirtualHeight = this.vScroll.scrollContainer.nativeElement.scrollHeight;
    }
  }

  mouseDown(event: PointerEvent) {
    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
    this.canvas.nativeElement.setPointerCapture(event.pointerId);
    this.canvas.nativeElement.onpointermove = e => this.mouseMove(e);
    this.canvas.nativeElement.style.cursor = "grabbing";
  }

  mouseUp(event: PointerEvent) {
    this.canvas.nativeElement.releasePointerCapture(event.pointerId);
    this.canvas.nativeElement.onpointermove = null;
    this.canvas.nativeElement.style.cursor = "grab";
  }

  mouseMove(event: PointerEvent) {
    this.scrollLeft -= event.clientX - this._lastMouseX;
    this.scrollTop -= event.clientY - this._lastMouseY;

    this._lastMouseX = event.clientX;
    this._lastMouseY = event.clientY;
  }
}
