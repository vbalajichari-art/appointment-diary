export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'audio';
  blob: Blob;
}

export interface Activity {
  id: string;
  categoryId: string;
  title: string;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:mm
  venue?: string;
  contactPerson?: string;
  contactInfo?: string;
  notes?: string;
  attachments: Attachment[];
  recurrence?: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number; // For custom: every X days
    endDate?: string;
    seriesId?: string;
  };
}

export interface QueryFilters {
  categoryId?: string;
  title?: string;
  dateFrom?: string;
  dateTo?: string;
  venue?: string;
  contactPerson?: string;
}

export interface UserProfile {
  name: string;
  title: string;
  avatar?: Blob;
}
