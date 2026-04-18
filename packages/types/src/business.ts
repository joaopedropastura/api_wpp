export type BusinessType =
  | 'barbershop'
  | 'salon'
  | 'store'
  | 'restaurant'
  | 'other';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface WorkingHours {
  open: string;  // "HH:mm"
  close: string; // "HH:mm"
  days: number[]; // 0=Sun, 1=Mon, ... 6=Sat
}
