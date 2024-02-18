import { AfterViewInit, Component, ElementRef, HostBinding, ViewChild } from '@angular/core';
import { ScrollBarComponent } from '../scroll-bar/scroll-bar.component';
import { NgClass } from '@angular/common';

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

  get height(): number { return this.canvas.nativeElement.height; }
  set height(value: number) {
    this.canvas.nativeElement.height = value;
  }

  get width(): number { return this.canvas.nativeElement.width }
  set width(value: number) {
    this.canvas.nativeElement.width = value;
  }

  get scrollHeight(): number { return this.vScroll.scrollContainer.nativeElement.scrollHeight; }
  get scrollWidth(): number { return this.hScroll.scrollContainer.nativeElement.scrollWidth; }
  get scrollTop(): number { return this.vScroll.scrollContainer.nativeElement.scrollTop; }
  set scrollTop(value: number) { this.vScroll.scrollContainer.nativeElement.scrollTop = value; }

  get scrollLeft(): number { return this.hScroll.scrollContainer.nativeElement.scrollLeft; }
  set scrollLeft(value: number) { this.hScroll.scrollContainer.nativeElement.scrollLeft = value; }

  get CanvasRenderingContext2D(): CanvasRenderingContext2D { return this.canvas.nativeElement.getContext("2d")!; }

  gridClass: string = "canvas-container grid1x1";

  ngAfterViewInit(): void {
    this.height = this.canvas.nativeElement.clientHeight;
    this.width = this.canvas.nativeElement.clientWidth;
    this.container.nativeElement.style.height = "100%";
    this.container.nativeElement.style.width = "100%";
  }

  setDimensions(x: number, y: number): void {
    this.hScroll.setScrollExtent(x);
    this.vScroll.setScrollExtent(y);

    const visible = (this.hScroll.isVisible ? 2 : 0) + (this.vScroll.isVisible ? 1 : 0);

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
}
