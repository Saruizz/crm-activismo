import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loginForm = this.fb.group({
    agentId: [this.authService.agentId() || '', Validators.required]
  });

  onSubmit() {
    if (this.loginForm.valid) {
      const { agentId } = this.loginForm.value;
      this.authService.login(agentId!);
    }
  }
}
