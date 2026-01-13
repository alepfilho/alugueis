import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuardGuard } from './auth-guard-guard';
import { AlugueisComponent } from './pages/alugueis-component/alugueis-component';
import { LocatariosComponent } from './pages/locatarios-component/locatarios-component';
import { ResumoComponent } from './pages/resumo-component/resumo-component';
import { DetalhesImovelComponent } from './pages/detalhes-imovel-component/detalhes-imovel-component';
import { DetalheLocatarioComponent } from './pages/detalhe-locatario/detalhe-locatario';
import { NovoLocatarioComponent } from './pages/novo-locatario/novo-locatario';
import { NovoImovel } from './pages/novo-imovel/novo-imovel';

export const routes: Routes = [
    {
        path: '',
        component: Login
    },
    {
        path: 'home',
        component: Dashboard,
        // canActivate: [authGuardGuard],
        children: [
            {
                path: '',
                component: ResumoComponent,
                pathMatch: 'full'
            },
            {
                path: 'alugueis',
                component: AlugueisComponent
            },
            {
                path: 'inquilinos',
                component: LocatariosComponent
            },
            {
                path: 'detalhes-imovel/:id',
                component: DetalhesImovelComponent
            },
            {
                path: 'detalhes-locatario/:id',
                component: DetalheLocatarioComponent
            },
            {
                path: 'novo-locatario',
                component: NovoLocatarioComponent
            },
            {
                path: 'novo-imovel',
                component: NovoImovel
            }
        ]
    }
];
