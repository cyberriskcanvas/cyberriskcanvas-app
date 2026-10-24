// Core edition: stand-ins for the Pro server modules (see src/pro/server.ts in CyberRisk Canvas Pro).

export async function listAlertChannels(): Promise<never[]> {
  return [];
}

export async function productGate(_versionId: string, _gateFailOn: string): Promise<{
  ciLatest: Array<{ source: string; result: string }>;
  gateReasons: Array<{ code: string }>;
  gatePass: boolean | null;
  openHigh: number;
} | null> {
  return null;
}

export async function incidentCounts(_projectId: string): Promise<{ open: number; overdue: number }> {
  return { open: 0, overdue: 0 };
}
