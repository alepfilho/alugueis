import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { ILocatario } from '../../Interfaces/Ilocatario';
import { FormsModule } from '@angular/forms';
import { LocatarioService } from '../../services/locatario-service';

@Component({
  selector: 'app-locatarios-component',
  imports: [CardModule, ButtonModule, TableModule, TagModule, RouterLink, FormsModule],
  templateUrl: './locatarios-component.html',
  styleUrl: './locatarios-component.css',
})
export class LocatariosComponent implements OnInit {

  locatarios: ILocatario[] = [];

  constructor(
    private locatarioService: LocatarioService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.locatarioService.getLocatarios().subscribe({
      next: (data) => {
        this.locatarios = data;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erro ao buscar locatários:', error);
      }
    });
  }

}
