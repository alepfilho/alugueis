import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovoLocatario } from './novo-locatario';

describe('NovoLocatario', () => {
  let component: NovoLocatario;
  let fixture: ComponentFixture<NovoLocatario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovoLocatario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NovoLocatario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
