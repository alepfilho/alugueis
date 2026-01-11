import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IUser } from '../Interfaces/IUser';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject = new BehaviorSubject<IUser | null>(null);

  user$: Observable<IUser | null> = this.userSubject.asObservable();

  setUser(user: IUser){
    this.userSubject.next(user);
  }

  clearUser(){
    this.userSubject.next(null);
  }
  getUserValue(){
    return this.userSubject.value;
  }
}
