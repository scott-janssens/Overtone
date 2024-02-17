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
    this.container.nativeElement.style.height = value + "px";
  }

  get width(): number { return this.canvas.nativeElement.width }
  set width(value: number) {
    this.canvas.nativeElement.width = value;
    this.container.nativeElement.style.width = value + "px";
  }

  get CanvasRenderingContext2D(): CanvasRenderingContext2D { return this.canvas.nativeElement.getContext("2d")!; }

  gridClass: string = "canvas-container grid1x1";

  ngAfterViewInit(): void {
    this.height = this.canvas.nativeElement.clientHeight;
    this.width = this.canvas.nativeElement.clientWidth;
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
