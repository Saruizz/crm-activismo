import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CrmService } from '../../core/services/crm.service';
import { CrmRecord } from '../../core/models/crm-record.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  private crmService = inject(CrmService);

  records = signal<CrmRecord[]>([]);
  selectedStatus = signal<string>('POR_CONTACTAR');
  isLoading = signal<boolean>(false);
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');
  searchTerm = signal<string>('');
  agentId = this.authService.agentId();

  ngOnInit() {
    this.fetchData('obtener_asignados');
  }

  logout() {
    this.authService.logout();
  }

  getCarga() {
    this.fetchData('obtener_carga');
  }

  private normalizeString(str: string): string {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  updateSearch(term: string) {
    this.searchTerm.set(term);
    const tokens = this.normalizeString(term).split(/\s+/).filter(t => t.length > 0);
    
    if (tokens.length > 0) {
      // Buscar el primer registro que coincida en CUALQUIER estado
      const match = this.records().find(r => {
        const searchStr = this.normalizeString(`${r.NOMBRE || ''} ${r.CEDULA || ''} ${r.TELEFONO || ''}`);
        return tokens.every(token => searchStr.includes(token));
      });

      // Si encontramos una coincidencia, nos "reubicamos" en su pestaña
      if (match) {
        const status = (match as any)._displayedStatus || 'POR_CONTACTAR';
        if (this.selectedStatus() !== status) {
          this.selectedStatus.set(status);
        }
      }
    }
  }

  get filteredRecords() {
    const rawTerm = this.searchTerm();
    const searchTokens = this.normalizeString(rawTerm).split(/\s+/).filter(t => t.length > 0);

    return this.records()
      .filter(r => ((r as any)._displayedStatus || 'POR_CONTACTAR') === this.selectedStatus())
      .filter(r => {
        if (searchTokens.length === 0) return true;
        const searchStr = this.normalizeString(`${r.NOMBRE || ''} ${r.CEDULA || ''} ${r.TELEFONO || ''}`);
        
        // Verifica que TODOS los términos de búsqueda estén presentes
        return searchTokens.every(token => searchStr.includes(token));
      })
      .sort((a, b) => {
        const aNeeds = this.needsReminder(a) ? 1 : 0;
        const bNeeds = this.needsReminder(b) ? 1 : 0;
        return bNeeds - aNeeds; // Prioritize those needing reminders
      });
  }

  getStatusCounts(status: string): number {
    return this.records().filter(r => ((r as any)._displayedStatus || 'POR_CONTACTAR') === status).length;
  }

  private fetchData(action: 'obtener_carga' | 'obtener_asignados') {
    this.isLoading.set(true);
    this.crmService.fetchData(action).subscribe({
      next: (data) => {
        data.forEach(r => {
          (r as any)._displayedStatus = r.ESTADO || 'POR_CONTACTAR';
          (r as any)._originalMunicipio = r.MUNICIPIO;
          (r as any)._originalDepartamento = r.DEPARTAMENTO;
          (r as any)._originalEdad = r.EDAD;
        });
        this.records.set(data);
        this.isLoading.set(false);
        this.showToast(action === 'obtener_carga' ? 'Carga obtenida exitosamente' : 'Registros sincronizados', 'success');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.showToast('Error: ' + err.message, 'error');
      }
    });
  }

  saveRecord(record: CrmRecord) {
    const isInhabilitado = record.ESTADO === 'INHABILITADO' || record.COMPROMISO === 'INHABILITADO';
    if (isInhabilitado && !record.OBSERVACION) {
      this.showToast('Debe seleccionar una observación para inhabilitar', 'error');
      return;
    }

    this.crmService.saveRecord(record).subscribe({
      next: () => {
        this.showToast('Registro guardado exitosamente', 'success');
        record._displayedStatus = record.ESTADO;
        record._originalMunicipio = record.MUNICIPIO;
        record._originalDepartamento = record.DEPARTAMENTO;
        record._originalEdad = record.EDAD;
        if (record.ESTADO === 'INHABILITADO' || record.COMPROMISO === 'INHABILITADO') {
          this.records.update(recs => recs.filter(r => r.id !== record.id));
        }
      },
      error: (err) => {
        this.showToast('Error al guardar: ' + err.message, 'error');
      }
    });
  }

  isCcValid(cc: any): boolean {
    if (!cc) return false;
    const str = cc.toString();
    return str.length >= 6 && !isNaN(Number(str));
  }

  needsReminder(record: CrmRecord): boolean {
    if (record.ESTADO === 'CONTACTADO' && record.FECHA_CONTACTO) {
      const diffHours = (new Date().getTime() - new Date(record.FECHA_CONTACTO).getTime()) / (1000 * 60 * 60);
      return diffHours > 24;
    }
    return false;
  }

  onContactClick(record: CrmRecord) {
    if (record.ESTADO === 'POR_CONTACTAR' || !record.ESTADO) {
      record.ESTADO = 'CONTACTADO';
    }
    if (!record.FECHA_CONTACTO) {
      const now = new Date();
      record.FECHA_CONTACTO = now.toISOString();
      // Recordatorio a las 24h
      const reminder = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      record.FECHA_RECORDATORIO = reminder.toISOString();
    }
  }

  getWaLink(record: CrmRecord, isReminder: boolean = false): string {
    const groupLink = 'https://chat.whatsapp.com/CL71vUb9NNPDruoWKjj9jT';
    let messageText = '';

    if (isReminder) {
      messageText = `Hola ${record.NOMBRE || ''}, ¡no olvides unirte a nuestro grupo de WhatsApp para estar al tanto de todo! Aquí tienes el enlace: ${groupLink}`;
    } else {
      messageText = `Hola, estamos organizando el equipo de apoyo a la candidatura del Dr. Carlos Caicedo #TePagamosPorEstudiar.\n\n¿Confirmas si deseas participar como vocero?\nÚnete aquí para formalizar tu participación: ${groupLink}`;
    }

    const waMessage = encodeURIComponent(messageText);
    const phoneStr = (record.TELEFONO || '').toString().replace(/\D/g, '');
    return `https://wa.me/57${phoneStr}?text=${waMessage}`;
  }

  formatDateForInput(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  onDateChange(record: CrmRecord, event: any) {
    record.FECHA_CONTACTO = event.target.value;
  }

  showToast(message: string, type: 'success' | 'error') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => this.toastMessage.set(null), 3000);
  }
}
