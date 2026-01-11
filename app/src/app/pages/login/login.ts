import { Component, signal } from '@angular/core';
import { Input } from '../../components/forms/input/input';
import { FormsModule } from '@angular/forms';
import { DisableButton } from '../../disable-button';
import { Router } from '@angular/router';
import { UserService } from '../../services/user-service';

@Component({
  selector: 'app-login',
  imports: [Input, FormsModule, DisableButton],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  constructor(private router: Router, private userService: UserService) { }
  submitted = signal(false);

  onSubmit() {
    this.submitted.set(true);
    this.userService.setUser({
      id: 1,
      email: "hiroko.tk3@gmail.com",
      name: "Hiroko"
    })
    this.router.navigate(['/home'])
  }

}
