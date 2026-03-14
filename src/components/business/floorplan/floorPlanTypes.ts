export interface FloorPlanItem {
  id: string;
  zone_id: string | null;
  business_id: string;
  label: string;
  x_percent: number;
  y_percent: number;
  seats: number;
  shape: string;
  sort_order: number;
  fixture_type: string | null;
}

export interface FloorPlanZone {
  id: string;
  label: string;
  zone_type: string;
  shape: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  capacity: number;
  sort_order: number;
  metadata?: FloorPlanMetadata | null;
}

export interface FloorPlanMetadata {
  analysis_hash?: string;
  image_width?: number;
  image_height?: number;
  fixture_bboxes?: Record<string, { w: number; h: number }>;
  table_bboxes?: Record<string, { w: number; h: number }>;
  [key: string]: unknown;
}

export interface AiFixture {
  label: string;
  fixture_type: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

export interface AiTable {
  label: string;
  seats: number;
  shape: string;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
}

export interface TableReservationStatus {
  tableId: string;
  status: 'available' | 'reserved' | 'occupied';
  reservationName?: string;
  partySize?: number;
  reservationId?: string;
}

export interface ViewTransform {
  x: number;
  y: number;
  scale: number;
}
