export interface KeystrokeEvent {
  t: number; // timestamp in ms from session start
  type: 'key' | 'delete' | 'paste_blocked' | 'paste_internal';
  key?: string;
  pos: number;
  len?: number; // for deletions or internal pastes
}

export interface WritingMetrics {
  avgKeystrokeInterval: number;
  keystrokeVariance: number;
  pauseCount: number; // pauses > 2 seconds
  deletionRate: number; // deletions / total keystrokes
  blockedPastes: number;
  longestBurst: number; // longest uninterrupted typing streak (chars)
  averageWordLength: number;
}

export interface WritingSession {
  id: string;
  documentId?: string;
  startedAt: number;
  endedAt?: number;
  events: KeystrokeEvent[];
  metrics?: WritingMetrics;
  content: string;
  wordCount: number;
  integrityScore?: number; // 0-100
}

export interface Document {
  id: string;
  userId?: string;
  title: string;
  content: string;
  wordCount: number;
  writingTimeMs: number;
  verificationHash: string;
  status: 'draft' | 'certified' | 'revoked';
  createdAt: string;
  certifiedAt?: string;
  keystrokeData?: {
    events: KeystrokeEvent[];
    metrics: WritingMetrics;
  };
}

export interface VerificationData {
  document: Document;
  isValid: boolean;
  metrics: WritingMetrics;
  humanScore: number; // 0-100, likelihood of human authorship
}
