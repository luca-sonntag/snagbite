export type AuditStatus = 'pending' | 'ai_confirmed' | 'flagged';

export interface MappingAuditEntry {
  mappingKey: string;
  category: string;
  status: AuditStatus;
  auditedAt: string;
  productCode: string | null;
  resolution: 'matched' | 'no_match';
  confidence: number;
  reasoning?: string;
  notes?: string;
}

export interface MappingsManifest {
  version: number;
  lastUpdated: string;
  entries: Record<string, MappingAuditEntry>; // Key: `${mappingKey}::${category}`
}

export interface IconGeometryResult {
  width: number;
  height: number;
  bbox: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    objectWidth: number;
    objectHeight: number;
  };
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
    minMarginPct: number;
    avgMarginPct: number;
  };
  isClipped: boolean;
  isTooSmall: boolean;
  isAcceptable: boolean;
}

export interface IconAuditEntry {
  filename: string;
  status: AuditStatus;
  auditedAt: string;
  marginPct: number;
  zoomApplied: boolean;
  regenerated: boolean;
  visualPass: boolean;
  reasoning?: string;
}

export interface IconsManifest {
  version: number;
  lastUpdated: string;
  entries: Record<string, IconAuditEntry>; // Key: filename (e.g. "tomato.webp")
}

export interface DailyBudgetLog {
  date: string; // YYYY-MM-DD
  totalSpentUsd: number;
  geminiSpentUsd: number;
  fluxSpentUsd: number;
  bgbusterSpentUsd?: number;
  totalAudits: number;
  totalGenerations: number;
  lastUpdated: string;
}

export interface PipelineCliOptions {
  dryRun: boolean;
  limit?: number;
  dailyBudgetUsd?: number;
  force: boolean;
  key?: string;
  autoZip: boolean;
  interactive?: boolean;
  missingOnly?: boolean;
  iconsOnly?: boolean;
  concurrency?: number;
}
