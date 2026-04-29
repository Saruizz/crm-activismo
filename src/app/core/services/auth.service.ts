import { Injectable, signal, NgZone } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  agentId = signal<string | null>(null);
  apiUrl = signal<string>('https://script.google.com/macros/s/AKfycbxbIIjq9EpLi53rfAg82Sh3sqoplN7Nbyz53N_DCUcj1mSfNNvv8YwX8p7mCZdC4a4b/exec');

  private readonly INACTIVITY_LIMIT_MS = 2 * 60 * 60 * 1000; // 2 horas de inactividad
  private inactivityTimer: any;

  constructor(private router: Router, private ngZone: NgZone) {
    this.checkSession();
    this.setupActivityListeners();
  }

  private setupActivityListeners() {
    const resetTimer = () => {
      if (this.agentId()) {
        this.resetInactivityTimer();
        localStorage.setItem('crm_last_activity', new Date().getTime().toString());
      }
    };

    // Usar runOutsideAngular evita sobrecargar Angular con eventos frecuentes
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('click', resetTimer);
      window.addEventListener('scroll', resetTimer);
    });
  }

  private checkSession() {
    const storedAgent = localStorage.getItem('crm_agent_id');
    const lastActivity = localStorage.getItem('crm_last_activity');
    
    if (storedAgent && lastActivity) {
      const now = new Date().getTime();
      const timeElapsed = now - parseInt(lastActivity, 10);
      
      if (timeElapsed < this.INACTIVITY_LIMIT_MS) {
        this.agentId.set(storedAgent);
        this.resetInactivityTimer();
      } else {
        this.clearSession(); // La sesión expiró por inactividad
      }
    } else {
      this.clearSession();
    }
  }

  private resetInactivityTimer() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
    this.inactivityTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.logout();
      });
    }, this.INACTIVITY_LIMIT_MS);
  }

  private clearSession() {
    localStorage.removeItem('crm_agent_id');
    localStorage.removeItem('crm_last_activity');
    this.agentId.set(null);
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }
  }

  login(agentId: string) {
    const now = new Date().getTime().toString();
    localStorage.setItem('crm_agent_id', agentId);
    localStorage.setItem('crm_last_activity', now);
    this.agentId.set(agentId);
    this.resetInactivityTimer();
    this.router.navigate(['/dashboard']);
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return !!this.agentId() && !!this.apiUrl();
  }
}
