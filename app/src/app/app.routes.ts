import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { authGuardGuard } from './auth-guard-guard';
import { AlugueisComponent } from './pages/alugueis-component/alugueis-component';
import { InquilinosComponent } from './pages/inquilinos-component/inquilinos-component';
import { ResumoComponent } from './pages/resumo-component/resumo-component';
import { DetalhesImovelComponent } from './pages/detalhes-imovel-component/detalhes-imovel-component';
import { DetalheLocatarioComponent } from './pages/detalhe-locatario/detalhe-locatario';

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
                component: InquilinosComponent
            },
            {
                path: 'detalhes-imovel',
                component: DetalhesImovelComponent
            },
            {
                path: 'detalhes-locatario',
                component: DetalheLocatarioComponent
            }
        ]
    }
];
