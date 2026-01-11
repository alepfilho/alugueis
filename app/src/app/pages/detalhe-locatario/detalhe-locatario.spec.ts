import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalheLocatario } from './detalhe-locatario';

describe('DetalheLocatario', () => {
  let component: DetalheLocatario;
  let fixture: ComponentFixture<DetalheLocatario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalheLocatario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalheLocatario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
