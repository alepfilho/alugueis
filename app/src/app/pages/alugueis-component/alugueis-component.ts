import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { IAlugueis } from '../../Interfaces/IAlugueis';
import { ImovelService, IImovel } from '../../services/imovel-service';

@Component({
  selector: 'app-alugueis-component',
  imports: [CardModule, ButtonModule, TableModule, TagModule, CurrencyPipe, RouterLink, DatePipe],
  templateUrl: './alugueis-component.html',
  styleUrl: './alugueis-component.css',
})
export class AlugueisComponent implements OnInit {
  imoveis: IAlugueis[] = [];

  constructor(
    private imovelService: ImovelService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.loadImoveis();
  }

  loadImoveis(): void {
    this.imovelService.getAllImoveis().subscribe({
      next: (imoveis: IImovel[]) => {
        this.imoveis = imoveis.map(imovel => this.mapImovelToAlugueis(imovel));

        // 3. Forçamos o Angular a detectar a mudança imediatamente
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao carregar imóveis:', error);
      }
    });
  }

  private mapImovelToAlugueis(imovel: IImovel): IAlugueis {
    const dataInicio = imovel.dataInicioContrato
      ? new Date(imovel.dataInicioContrato).toLocaleDateString('pt-BR')
      : '';

    return {
      id: imovel.id?.toString() || '',
      endereco: imovel.endereco,
      valor_aluguel: imovel.valorAluguel,
      data_inicio: dataInicio,
      status_aluguel: true, // Valor padrão, pois não vem da API
      status_iptu: true, // Valor padrão, pois não vem da API
      status_condominio: true, // Valor padrão, pois não vem da API
      inquilino: 'Sem inquilino', // Valor padrão, pois não vem da API
      inquilino_id: ''
    };
  }

}
