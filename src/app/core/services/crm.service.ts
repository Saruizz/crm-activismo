import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { CrmRecord } from '../models/crm-record.model';
import { Observable, map, throwError } from 'rxjs';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CrmService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  fetchData(action: 'obtener_carga' | 'obtener_asignados'): Observable<CrmRecord[]> {
    const url = this.auth.apiUrl();
    if (!url) return throwError(() => new Error('API URL not configured'));

    const payload = { action, agente_id: this.auth.agentId() };
    
    return this.http.post<ApiResponse<CrmRecord[]>>(url, JSON.stringify(payload), {
      headers: { 'Content-Type': 'text/plain' }
    }).pipe(
      map(res => {
        if (res.status === 'success' && res.data) return res.data;
        throw new Error(res.message || 'Unknown error');
      })
    );
  }

  saveRecord(recordData: Partial<CrmRecord>): Observable<any> {
    const url = this.auth.apiUrl();
    if (!url) return throwError(() => new Error('API URL not configured'));

    const payload = { action: 'actualizar_registro', registro: recordData };
    
    return this.http.post<ApiResponse<any>>(url, JSON.stringify(payload), {
      headers: { 'Content-Type': 'text/plain' }
    }).pipe(
      map(res => {
        if (res.status === 'success') return res.data;
        throw new Error(res.message || 'Unknown error');
      })
    );
  }
}
