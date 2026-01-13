import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocatariosComponent } from './locatarios-component';

describe('LocatariosComponent', () => {
  let component: LocatariosComponent;
  let fixture: ComponentFixture<LocatariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocatariosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LocatariosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
