export interface ProviderDocument {
  url: string;
  html: string;
  fetchedAt: Date;
  status: number;
  contentType: string;
  size: number;
  durationMs: number;
}
