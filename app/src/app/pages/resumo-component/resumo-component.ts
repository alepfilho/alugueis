import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ImovelService, IResumo, IIndices } from '../../services/imovel-service';
import { UserService } from '../../services/user-service';
import { timeout, catchError, of } from 'rxjs';

@Component({
  selector: 'app-resumo-component',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TooltipModule, SkeletonModule],
  templateUrl: './resumo-component.html',
  styleUrl: './resumo-component.css',
})
export class ResumoComponent implements OnInit {
  resumo: IResumo | null = null;
  indices: IIndices | null = null;
  loading = true;
  loadingIndices = true;
  error = false;
  updatingIndices = false;

  constructor(
    private imovelService: ImovelService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  get isAdmin(): boolean {
    return this.userService.getUserValue()?.role === 'admin';
  }

  ngOnInit(): void {
    this.imovelService.getResumo().pipe(
      timeout(15000),
      catchError((err) => {
        this.error = true;
        this.loading = false;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe((data) => {
      if (data === null) return; // já tratado no catchError
      try {
        this.resumo = this.normalizeResumo(data);
      } catch {
        this.error = true;
      }
      this.loading = false;
      this.cdr.detectChanges();
    });

    this.imovelService.getIndices().pipe(
      timeout(10000),
      catchError(() => {
        this.loadingIndices = false;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe((data) => {
      this.indices = data ?? null;
      this.loadingIndices = false;
      this.cdr.detectChanges();
    });
  }

  atualizarIndices(): void {
    this.updatingIndices = true;
    this.imovelService.atualizarIndices().subscribe({
      next: () => {
        this.updatingIndices = false;
        this.imovelService.getIndices().subscribe((data) => {
          this.indices = data;
          this.cdr.detectChanges();
        });
      },
      error: () => { this.updatingIndices = false; this.cdr.detectChanges(); }
    });
  }

  formatPercent(value: number): string {
    if (value == null || value === undefined) return '—';
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
  }

  private normalizeResumo(data: IResumo | null | undefined): IResumo {
    const a = data?.alugueis;
    const c = data?.condominio;
    const i = data?.iptu;
    return {
      alugueis: { total: a?.total ?? 0, atrasados: a?.atrasados ?? 0, nomesAtrasados: Array.isArray(a?.nomesAtrasados) ? a.nomesAtrasados : [] },
      condominio: { total: c?.total ?? 0, atrasados: c?.atrasados ?? 0, nomesAtrasados: Array.isArray(c?.nomesAtrasados) ? c.nomesAtrasados : [] },
      iptu: { total: i?.total ?? 0, atrasados: i?.atrasados ?? 0, nomesAtrasados: Array.isArray(i?.nomesAtrasados) ? i.nomesAtrasados : [] },
    };
  }

  formatNomesAtrasados(nomes: string[] | null | undefined): string {
    if (!nomes || !nomes.length) return 'Nenhum';
    return nomes.join(', ');
  }
}
