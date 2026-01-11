import { CurrencyPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';


interface IAlugueis {
  id: number,
  endereco: string,
  valor_aluguel: number,
  data_inicio: string,
  status_iptu: boolean,
  status_aluguel: boolean,
  status_condominio: boolean,
  inquilino: string
}

@Component({
  selector: 'app-alugueis-component',
  imports: [CardModule, ButtonModule, TableModule, TagModule, CurrencyPipe, RouterLink],
  templateUrl: './alugueis-component.html',
  styleUrl: './alugueis-component.css',
})
export class AlugueisComponent implements OnInit {
  imoveis!: IAlugueis[];

  ngOnInit(): void {
    this.imoveis = [
      {
        id: 1,
        endereco: 'rua galvão bueno 485, ap 91',
        valor_aluguel: 1700.80,
        data_inicio: '10/01/2026',
        status_aluguel: true,
        status_iptu: false,
        status_condominio: true,
        inquilino: 'Alexanxre P Filho'
      }
    ]
  }

}
