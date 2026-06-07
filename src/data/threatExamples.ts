import type { Threat } from '@/types';

export interface ThreatExample extends Omit<Threat, 'id'> {
  tags: string[]; // component types this threat applies to
}

export const THREAT_EXAMPLES: ThreatExample[] = [
  // ─── Automotive ────────────────────────────────────────────────────────────
  {
    name: 'Unauthorized Firmware Update',
    stride: 'T',
    cweId: 'CWE-494',
    description: 'Attacker injects unsigned firmware via OTA update channel.',
    tags: ['ecu', 'telematics', 'gateway'],
  },
  {
    name: 'ECU Identity Spoofing',
    stride: 'S',
    cweId: 'CWE-290',
    description: 'Attacker impersonates a trusted ECU on the CAN bus.',
    tags: ['ecu', 'gateway'],
  },
  {
    name: 'CAN Bus Flooding (DoS)',
    stride: 'D',
    cweId: 'CWE-400',
    description: 'High-frequency CAN messages disrupt safety-critical communication.',
    tags: ['ecu', 'gateway'],
  },
  {
    name: 'Diagnostic Data Exfiltration',
    stride: 'I',
    cweId: 'CWE-200',
    description: 'Sensitive calibration or PII leaked via OBD-II interface.',
    tags: ['ecu', 'obd'],
  },
  {
    name: 'Remote Code Execution via Telematics',
    stride: 'E',
    cweId: 'CWE-78',
    description: 'Attacker exploits unsanitized input in telematics stack to gain code execution.',
    tags: ['telematics', 'gateway'],
  },

  // ─── OT / Industrial ───────────────────────────────────────────────────────
  {
    name: 'Unauthenticated Modbus/DNP3 Command',
    stride: 'S',
    cweId: 'CWE-306',
    description: 'Attacker sends control commands over Modbus or DNP3 without any authentication.',
    tags: ['plc', 'rtu'],
  },
  {
    name: 'PLC Logic Manipulation via Engineering Tool',
    stride: 'T',
    cweId: 'CWE-345',
    description: 'Malicious or compromised engineering workstation pushes unsigned ladder logic to the PLC.',
    tags: ['plc'],
  },
  {
    name: 'HMI Credential Brute-Force',
    stride: 'S',
    cweId: 'CWE-307',
    description: 'Attacker brute-forces HMI login due to missing account lockout policy.',
    tags: ['hmi'],
  },
  {
    name: 'RTU Firmware Downgrade Attack',
    stride: 'T',
    cweId: 'CWE-494',
    description: 'Attacker downgrades RTU firmware to a version with known vulnerabilities.',
    tags: ['rtu'],
  },
  {
    name: 'Historian Data Manipulation',
    stride: 'T',
    cweId: 'CWE-345',
    description: 'Attacker modifies historical process data in the historian to hide anomalies or falsify audit trails.',
    tags: ['historian'],
  },
  {
    name: 'Historian SQL Injection',
    stride: 'I',
    cweId: 'CWE-89',
    description: 'Attacker exploits SQL injection in historian query interface to extract or delete process data.',
    tags: ['historian'],
  },
  {
    name: 'OT Network Lateral Movement',
    stride: 'E',
    cweId: 'CWE-284',
    description: 'Attacker pivots from IT network into OT zone via inadequate network segmentation.',
    tags: ['plc', 'hmi', 'historian', 'rtu'],
  },

  // ─── IoT / Embedded ────────────────────────────────────────────────────────
  {
    name: 'Default Credentials Not Changed',
    stride: 'S',
    cweId: 'CWE-1392',
    description: 'Device shipped with factory default credentials that are never changed during deployment.',
    tags: ['sensor', 'actuator', 'gateway', 'hmi'],
  },
  {
    name: 'Unencrypted MQTT/CoAP Traffic',
    stride: 'I',
    cweId: 'CWE-319',
    description: 'Sensor telemetry transmitted in cleartext, allowing passive interception.',
    tags: ['sensor', 'actuator', 'gateway'],
  },
  {
    name: 'OTA Update Without Signature Verification',
    stride: 'T',
    cweId: 'CWE-494',
    description: 'Device accepts firmware updates without verifying cryptographic signature.',
    tags: ['sensor', 'actuator'],
  },
  {
    name: 'Physical Debug Port Exposed (JTAG/UART)',
    stride: 'E',
    cweId: 'CWE-1191',
    description: 'Active JTAG or UART debug interface allows full memory read/write without authentication.',
    tags: ['sensor', 'actuator', 'ecu', 'hsm'],
  },

  // ─── Gateway / Network ─────────────────────────────────────────────────────
  {
    name: 'Man-in-the-Middle on Gateway TLS',
    stride: 'I',
    cweId: 'CWE-295',
    description: 'Gateway fails to validate server certificate, enabling interception of encrypted traffic.',
    tags: ['gateway'],
  },
  {
    name: 'Gateway Misconfiguration Exposes Internal Network',
    stride: 'I',
    cweId: 'CWE-668',
    description: 'Firewall rules on gateway allow unintended access to internal OT or CAN segments.',
    tags: ['gateway'],
  },

  // ─── OS / Firmware / Software ──────────────────────────────────────────────
  {
    name: 'Privilege Escalation via Kernel Vulnerability',
    stride: 'E',
    cweId: 'CWE-269',
    description: 'Unprivileged process exploits kernel flaw to gain root/system privileges.',
    tags: ['os', 'firmware'],
  },
  {
    name: 'Supply Chain Compromise via Malicious Library',
    stride: 'T',
    cweId: 'CWE-1357',
    description: 'Compromised open-source dependency introduces malicious code into the build.',
    tags: ['os', 'firmware', 'application', 'library'],
  },
  {
    name: 'Sensitive Data in Log Files',
    stride: 'I',
    cweId: 'CWE-532',
    description: 'Application logs credentials, tokens, or PII in plaintext log files.',
    tags: ['os', 'application', 'network_service'],
  },
  {
    name: 'Bootloader Bypass',
    stride: 'E',
    cweId: 'CWE-494',
    description: 'Attacker interrupts boot sequence to load unsigned or modified OS image.',
    tags: ['bootloader', 'firmware'],
  },

  // ─── Cloud / Network Services ──────────────────────────────────────────────
  {
    name: 'API Key Leakage via Logs or Repository',
    stride: 'I',
    cweId: 'CWE-532',
    description: 'API keys or secrets committed to source code repository or written to application logs.',
    tags: ['network_service', 'application'],
  },
  {
    name: 'JWT Token Forgery',
    stride: 'S',
    cweId: 'CWE-347',
    description: 'Service accepts JWT with "none" algorithm or weak secret, allowing token forgery.',
    tags: ['network_service', 'application'],
  },
  {
    name: 'Insufficient Rate Limiting (DoS)',
    stride: 'D',
    cweId: 'CWE-770',
    description: 'API endpoint lacks rate limiting, enabling resource exhaustion by unauthenticated clients.',
    tags: ['network_service'],
  },
  {
    name: 'Server-Side Request Forgery (SSRF)',
    stride: 'E',
    cweId: 'CWE-918',
    description: 'Attacker abuses webhook or URL parameter to make server-side requests to internal services.',
    tags: ['network_service', 'application'],
  },

  // ─── HSM / Cryptographic ───────────────────────────────────────────────────
  {
    name: 'Weak Key Generation in HSM',
    stride: 'T',
    cweId: 'CWE-338',
    description: 'HSM uses insufficient entropy source during key generation, producing predictable keys.',
    tags: ['hsm'],
  },
  {
    name: 'Side-Channel Attack on Cryptographic Module',
    stride: 'I',
    cweId: 'CWE-1255',
    description: 'Attacker extracts secret key material via power analysis or timing measurements.',
    tags: ['hsm'],
  },
];

/** Returns examples relevant to a given component type, most specific first. */
export function getExamplesForType(componentType?: string): ThreatExample[] {
  if (!componentType) return THREAT_EXAMPLES;
  const specific = THREAT_EXAMPLES.filter((t) => t.tags.includes(componentType));
  const generic = THREAT_EXAMPLES.filter((t) => !t.tags.includes(componentType));
  return [...specific, ...generic];
}
