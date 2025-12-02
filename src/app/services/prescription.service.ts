import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Prescription } from '../models/consulation.model';

@Injectable({
  providedIn: 'root'
})
export class PrescriptionService {
  private apiUrl = 'https://your-api.com/api/prescriptions';
  private prescriptionsSubject = new BehaviorSubject<Prescription[]>([]);
  public prescriptions$ = this.prescriptionsSubject.asObservable();

  private mockPrescriptions: Prescription[] = [
    {
      id: 'presc1',
      consultationId: '1',
      patientId: 'pat1',
      doctorId: 'doc1',
      medications: [
        { name: 'Amoxicilina', dosage: '500mg', frequency: '3 veces al día', duration: '7 días' },
        { name: 'Paracetamol', dosage: '500mg', frequency: 'Cada 6 horas', duration: 'Según sea necesario' }
      ],
      notes: 'Tomar con alimentos. Beber abundante agua.',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    }
  ];

  constructor(private http: HttpClient) {
    this.prescriptionsSubject.next(this.mockPrescriptions);
  }

  getPrescriptions(): Observable<Prescription[]> {
    // return this.http.get<Prescription[]>(this.apiUrl);
    return this.prescriptions$;
  }

  getPrescriptionById(id: string): Observable<Prescription> {
    // return this.http.get<Prescription>(`${this.apiUrl}/${id}`);
    const prescription = this.mockPrescriptions.find(p => p.id === id);
    return new Observable(observer => {
      observer.next(prescription!);
      observer.complete();
    });
  }

  createPrescription(data: Partial<Prescription>): Observable<Prescription> {
    // return this.http.post<Prescription>(this.apiUrl, data);
    const newPrescription: Prescription = {
      ...data as Prescription,
      id: 'presc' + Date.now(),
      createdAt: new Date()
    };
    this.mockPrescriptions.push(newPrescription);
    this.prescriptionsSubject.next(this.mockPrescriptions);
    return new Observable(observer => {
      observer.next(newPrescription);
      observer.complete();
    });
  }

  getPrescriptionsByDoctor(doctorId: string): Observable<Prescription[]> {
    const prescriptionsByDoctor = this.mockPrescriptions.filter(p => p.doctorId === doctorId);
    return new Observable(observer => {
      observer.next(prescriptionsByDoctor);
      observer.complete();
    });
    // TODO: Replace with real API call:
    // return this.http.get<Prescription[]>(`${this.apiUrl}?doctorId=${doctorId}`);
  }
}
