import { Component, input } from '@angular/core';

@Component({
  selector: 'app-input',
  imports: [],
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  inputId = input<string>('')
  inputType = input<string>('')
  inputName = input<string>('')
  labelName = input<string>('')
  autocomplete = input<boolean>(false)
}
