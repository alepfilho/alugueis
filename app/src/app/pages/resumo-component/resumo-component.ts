import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-resumo-component',
  imports: [CardModule, ButtonModule, TooltipModule],
  templateUrl: './resumo-component.html',
  styleUrl: './resumo-component.css',
})
export class ResumoComponent {

}
