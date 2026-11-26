'use server';

import Anthropic from '@anthropic-ai/sdk';
import { requireSession } from '@/lib/auth';
import { requireTierFeature } from '@/lib/tierGuard';
import type { NodeData } from '@/types';

const AI_MODEL = 'claude-sonnet-4-6';

function getClient() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set. Please configure it in your environment.');
  return new Anthropic({ apiKey: key });
}

function parseJsonFromText(text: string): unknown[] {
  try { return JSON.parse(text.trim()); } catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (m) return JSON.parse(m[0]);
    return [];
  }
}

export async function suggestCwe(nodeType: string, data: NodeData) {
  await requireSession();
  await requireTierFeature('ai');

  const prompt = `You are a cybersecurity expert specializing in IEC 62443 and automotive security.
A ${nodeType} component "${String(data.label)}" (type: ${String(data.componentType ?? 'unknown')}) is being analyzed in a TARA.
${data.description ? `Description: ${String(data.description)}` : ''}
List the 5 most relevant CWE IDs for this component. Respond ONLY with a JSON array:
[{"id":"CWE-798","name":"Use of Hard-coded Credentials","relevance":"...","stride":"S"}]
No markdown, no explanation.`;

  const msg = await getClient().messages.create({
    model: AI_MODEL, max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  return parseJsonFromText(text);
}

export async function analyzeThreats(
  diagramName: string,
  components: { label: string; type: string; componentType?: string; assets?: { name: string; category: string }[]; existingThreats?: { name: string; stride: string }[] }[],
) {
  await requireSession();
  await requireTierFeature('ai');

  const summary = components.map((c) => {
    const assets = c.assets?.map((a) => a.name).join(', ') || 'none';
    const existing = c.existingThreats?.map((t) => `${t.name} (${t.stride})`).join(', ') || 'none';
    return `- ${c.label} [${c.type}: ${c.componentType ?? 'unknown'}]\n  Assets: ${assets}\n  Existing threats: ${existing}`;
  }).join('\n');

  const prompt = `You are a senior cybersecurity engineer. Analyze the system "${diagramName}" with:
${summary}
Identify 4–6 ADDITIONAL complex threat scenarios not already listed. Focus on cross-component attack paths.
Respond ONLY with a JSON array:
[{"name":"...","affectedComponents":["..."],"stride":"T","cweIds":["CWE-20"],"likelihood":4,"impact":5,"description":"..."}]`;

  const msg = await getClient().messages.create({
    model: AI_MODEL, max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  return parseJsonFromText(text);
}

export async function suggestIec62443(nodeType: string, data: NodeData) {
  await requireSession();
  await requireTierFeature('ai');

  const prompt = `You are an IEC 62443 specialist. A ${nodeType} component "${String(data.label)}" with SL Target ${String(data.securityLevel ?? 'SL-2')} needs assessment.
Which IEC 62443-4-2 CRs are the TOP 5 MOST CRITICAL to implement first for this component?
Respond ONLY with a JSON array:
[{"requirementId":"CR 1.7","priority":"critical","reason":"..."}]`;

  const msg = await getClient().messages.create({
    model: AI_MODEL, max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  return parseJsonFromText(text);
}
