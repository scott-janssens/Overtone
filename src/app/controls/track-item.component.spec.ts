import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackItemComponent } from './track-item.component';

describe('TrackItemComponent', () => {
  let component: TrackItemComponent;
  let fixture: ComponentFixture<TrackItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackItemComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TrackItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
