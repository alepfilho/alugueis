import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NovoImovel } from './novo-imovel';

describe('NovoImovel', () => {
  let component: NovoImovel;
  let fixture: ComponentFixture<NovoImovel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NovoImovel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NovoImovel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
