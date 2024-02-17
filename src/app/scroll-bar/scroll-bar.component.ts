import { NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';

@Component({
  selector: 'scroll-bar',
  standalone: true,
  imports: [NgIf],
  templateUrl: './scroll-bar.component.html',
  styleUrl: './scroll-bar.component.scss'
})
export class ScrollBarComponent implements AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollChild') scrollChild!: ElementRef<HTMLDivElement>;

  @Input() orientation: string = "Horizontal";

  get isVisible(): boolean {
    return (this.orientation === "Vertical" && this.scrollContainer.nativeElement.scrollHeight > this.scrollContainer.nativeElement.clientHeight) ||
      (this.orientation === "Horizontal" && this.scrollContainer.nativeElement.scrollWidth > this.scrollContainer.nativeElement.clientWidth)
  }

  ngAfterViewInit(): void {
    if (this.orientation === "Horizontal") {
      this.scrollContainer.nativeElement.style.width = "100%";
    }
    else {
      this.scrollContainer.nativeElement.style.height = "100%";
    }
  }

  show(show: boolean): void {
    const val = show ? "1px" : "0";

    if (this.orientation === "Horizontal") {
      this.scrollChild.nativeElement.style.height = val;
    }
    else {
      this.scrollChild.nativeElement.style.width = val;
    }
  }

  setScrollExtent(extent: number): void {
    if (this.orientation === "Horizontal") {
      if (this.scrollContainer.nativeElement.clientWidth > extent) {
        this.scrollChild.nativeElement.style.height = "0";
      }
      else {
        this.scrollChild.nativeElement.style.width = extent + "px";
        this.scrollChild.nativeElement.style.height = "1px";
      }
    }
    else {
      if (this.scrollContainer.nativeElement.clientHeight > extent) {
        this.scrollChild.nativeElement.style.width = "0";
      }
      else {
        this.scrollChild.nativeElement.style.height = extent + "px";
        this.scrollChild.nativeElement.style.width = "1px";
      }
    }
  }
}
