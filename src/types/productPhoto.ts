export interface ProductPhoto {
  id: string;
  title: string;
  imageUrl: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSizeKb?: number;
}

export interface TrainingVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  fileName: string;
  mimeType: string;
  fileSizeMb: number;
  durationSeconds?: number;
  uploadedBy: string;
  uploadedAt: string;
}
