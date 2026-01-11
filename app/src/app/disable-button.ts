import { Directive, HostBinding, input } from '@angular/core';

@Directive({
  selector: '[appDisableButton]',
  standalone: true
})
export class DisableButton {
  appDisableButton = input<boolean>(false);

  @HostBinding('class.cursor-not-allowed') get isCursorDisabled() { return this.appDisableButton(); }
  @HostBinding('class.bg-gray-500') get isBgDisabled() { return this.appDisableButton(); }
  @HostBinding('disabled') get isAttrDisabled() { return this.appDisableButton(); }
  
  @HostBinding('class.cursor-pointer') get isCursorEnable() { return !this.appDisableButton(); }
  @HostBinding('class.hover:bg-blue-700') get isBgEnable() { return !this.appDisableButton(); }


}
