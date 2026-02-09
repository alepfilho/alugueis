import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { IUser } from '../../Interfaces/IUser';
import { UserService } from '../../services/user-service';

import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    AvatarModule,
    AvatarGroupModule,
    ButtonModule
  ],

  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  currentUser: IUser | null = null;
  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.user$.subscribe(user => {
      this.currentUser = user;
    })
  }
}
