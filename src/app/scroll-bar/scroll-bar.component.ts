import { NgIf } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'ot-scroll-bar',
  standalone: true,
  imports: [NgIf],
  templateUrl: './scroll-bar.component.html',
  styleUrl: './scroll-bar.component.scss'
})
export class ScrollBarComponent implements AfterViewInit {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('scrollChild') scrollChild!: ElementRef<HTMLDivElement>;

  @Input() orientation: string = "Horizontal";

  private static _scrollbarWidth: number = 0;
  get scrollbarWidth(): number {return ScrollBarComponent._scrollbarWidth;}

  get isVisible(): boolean {
    return (this.orientation === "Vertical" && this.scrollChild.nativeElement.scrollHeight > this.scrollContainer.nativeElement.offsetHeight) ||
      (this.orientation === "Horizontal" && this.scrollChild.nativeElement.scrollWidth > this.scrollContainer.nativeElement.offsetWidth)
  }

  ngAfterViewInit(): void {
    if (this.orientation === "Horizontal") {
      this.scrollContainer.nativeElement.style.width = "100%";
      this.scrollChild.nativeElement.style.height = "1px";
    }
    else {
      this.scrollContainer.nativeElement.style.height = "100%";
      this.scrollChild.nativeElement.style.width = "1px";
    }
  }

  setScrollExtent(extent: number): void {
    if (this.orientation === "Horizontal") {
      this.scrollChild.nativeElement.style.width = extent + "px";
      ScrollBarComponent._scrollbarWidth = Math.max(ScrollBarComponent._scrollbarWidth, this.scrollContainer.nativeElement.offsetHeight - this.scrollContainer.nativeElement.clientHeight);
    }
    else {
      this.scrollChild.nativeElement.style.height = extent + "px";
      ScrollBarComponent._scrollbarWidth = Math.max(ScrollBarComponent._scrollbarWidth, this.scrollContainer.nativeElement.offsetWidth - this.scrollContainer.nativeElement.clientWidth);
    }
  }
}
