import { Component, OnInit } from '@angular/core';

import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ILocatario } from '../../Interfaces/Ilocatario';

@Component({
  selector: 'app-inquilinos-component',
  imports: [CardModule, ButtonModule, TableModule, TagModule, RouterLink],
  templateUrl: './inquilinos-component.html',
  styleUrl: './inquilinos-component.css',
})
export class InquilinosComponent implements OnInit {

  locatarios!: ILocatario[];

  ngOnInit(): void {
    this.locatarios = [
      {
        id: 'uuid-aqui',
        nome: 'Alexandre Poltronieri',
        telefone: 11988111524,
        email: 'alexandrepoltronieri@gmail.com',
        aluguel_id: 'uuid'
      }
    ]
  }

}
