import type { Threat } from './index';

export interface CweSuggestion {
  id: string;
  name: string;
  relevance: string;
  stride: Threat['stride'];
}

export interface ThreatScenario {
  name: string;
  affectedComponents: string[];
  stride: Threat['stride'];
  cweIds: string[];
  likelihood: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export interface IECSuggestion {
  requirementId: string;
  priority: 'critical' | 'high' | 'medium';
  reason: string;
}
