import type { DiagramNode, DiagramEdge } from '@/types';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'automotive' | 'industrial' | 'iot' | 'cloud';
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const BASE_X = 100;
const BASE_Y = 100;

export const TEMPLATES: Template[] = [
  {
    id: 'basic-ecu',
    name: 'Basic ECU',
    description: 'Single ECU with firmware, OS and application layers',
    category: 'automotive',
    nodes: [
      {
        id: 't1-boundary',
        type: 'boundary',
        position: { x: BASE_X, y: BASE_Y },
        style: { width: 340, height: 280 },
        data: { label: 'ECU Trust Zone', boundaryType: 'trust-zone' },
      },
      {
        id: 't1-ecu',
        type: 'hardware',
        position: { x: BASE_X + 90, y: BASE_Y + 50 },
        data: {
          label: 'Main ECU',
          componentType: 'ecu',
          version: 'AUTOSAR 4.3',
          description: 'Main processing unit for engine management. Controls fuel injection, ignition timing and emission systems.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t1-1', name: 'ECU Firmware', category: 'operational', description: 'Binary image controlling vehicle behavior – manipulation can cause safety incidents.' },
            { id: 'a-t1-2', name: 'CAN Bus Access', category: 'operational', description: 'Access to in-vehicle CAN messages; misuse enables lateral movement to other ECUs.' },
          ],
          threats: [
            { id: 'th-t1-1', name: 'Unauthenticated Firmware Flash', stride: 'T', cweId: 'CWE-345', description: 'Attacker flashes malicious firmware via OBD-II debug port without signature verification.' },
            { id: 'th-t1-2', name: 'ECU Impersonation via CAN', stride: 'S', cweId: 'CWE-290', description: 'Attacker injects forged CAN frames to impersonate this ECU and trigger unintended actuations.' },
          ],
          risks: [
            { id: 'r-t1-1', threatId: 'th-t1-1', likelihood: 3, impact: 5, level: 'high', mitigation: 'Enforce code-signing for all firmware updates; disable JTAG/debug in production fuses.', status: 'open' },
            { id: 'r-t1-2', threatId: 'th-t1-2', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Introduce Message Authentication Codes (MAC) on safety-critical CAN frames.', status: 'in-progress' },
          ],
          measures: [
            { id: 'm-t1-1', title: 'Firmware Code Signing', description: 'Implement RSA-2048 or ECDSA-256 signature check in bootloader before applying any update.', status: 'in-progress', riskId: 'r-t1-1', owner: 'SW Team' },
            { id: 'm-t1-2', title: 'CAN MAC Implementation', description: 'Add AUTOSAR SecOC module to authenticate safety-relevant CAN PDUs.', status: 'open', riskId: 'r-t1-2', owner: 'Network Team' },
          ],
        },
      },
      {
        id: 't1-firmware',
        type: 'software',
        position: { x: BASE_X + 30, y: BASE_Y + 160 },
        data: {
          label: 'Firmware',
          componentType: 'firmware',
          version: 'v2.1.4',
          description: 'Low-level hardware abstraction and peripheral driver layer.',
          assets: [
            { id: 'a-t1-3', name: 'Calibration Data', category: 'operational', description: 'Engine calibration maps – tampering affects performance and emissions compliance.' },
          ],
          threats: [
            { id: 'th-t1-3', name: 'Debug Port Privilege Escalation', stride: 'E', cweId: 'CWE-284', description: 'JTAG/SWD debug interface left enabled in production allows full memory read/write without authentication.' },
          ],
          risks: [
            { id: 'r-t1-3', threatId: 'th-t1-3', likelihood: 2, impact: 5, level: 'high', mitigation: 'Blow eFuse to disable JTAG in production builds; restrict debug access to authenticated sessions only.', status: 'open' },
          ],
        },
      },
      {
        id: 't1-os',
        type: 'software',
        position: { x: BASE_X + 190, y: BASE_Y + 160 },
        data: {
          label: 'AUTOSAR OS',
          componentType: 'os',
          version: 'R21-11',
          description: 'Real-time operating system providing task scheduling and memory partitioning per AUTOSAR Classic.',
          threats: [
            { id: 'th-t1-4', name: 'Task Starvation / DoS', stride: 'D', cweId: 'CWE-400', description: 'Runaway task or malformed inter-ECU message floods the OS scheduler, starving safety-critical tasks.' },
          ],
          risks: [
            { id: 'r-t1-4', threatId: 'th-t1-4', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Configure AUTOSAR OS watchdog timers and rate-limiting on incoming communication channels.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't1-e1', source: 't1-ecu', target: 't1-firmware' },
      { id: 't1-e2', source: 't1-ecu', target: 't1-os' },
    ],
  },

  {
    id: 'gateway-stack',
    name: 'Security Gateway',
    description: 'Linux-based gateway with firewall and network services',
    category: 'automotive',
    nodes: [
      {
        id: 't2-zone',
        type: 'boundary',
        position: { x: BASE_X, y: BASE_Y },
        style: { width: 420, height: 320 },
        data: { label: 'Gateway Network Segment', boundaryType: 'network-segment' },
      },
      {
        id: 't2-gw',
        type: 'hardware',
        position: { x: BASE_X + 130, y: BASE_Y + 50 },
        data: {
          label: 'Gateway HW',
          componentType: 'gateway',
          description: 'Hardware security gateway enforcing network segmentation between OBD/Ethernet and internal CAN buses.',
          securityLevel: 'SL-3',
          assets: [
            { id: 'a-t2-1', name: 'Network Routing Table', category: 'operational', description: 'Gateway routing configuration – manipulation causes traffic mis-routing or interception.' },
            { id: 'a-t2-2', name: 'TLS Session Keys', category: 'privacy', description: 'Session keys for in-vehicle Ethernet TLS connections.' },
          ],
          threats: [
            { id: 'th-t2-1', name: 'Gateway Config Tampering', stride: 'T', cweId: 'CWE-306', description: 'Attacker modifies firewall rules or routing tables via unauthenticated management interface to bypass network segmentation.' },
            { id: 'th-t2-2', name: 'Gateway Spoofing (ARP/VLAN)', stride: 'S', cweId: 'CWE-290', description: 'Attacker performs ARP spoofing to redirect traffic through a rogue gateway.' },
          ],
          risks: [
            { id: 'r-t2-1', threatId: 'th-t2-1', likelihood: 4, impact: 5, level: 'critical', mitigation: 'Require mutual TLS authentication for all management API calls; enforce role-based access control.', status: 'open' },
            { id: 'r-t2-2', threatId: 'th-t2-2', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Enable dynamic ARP inspection and 802.1Q VLAN access control lists.', status: 'in-progress' },
          ],
          measures: [
            { id: 'm-t2-1', title: 'mTLS for Management API', description: 'All gateway configuration endpoints require client certificate authentication.', status: 'open', riskId: 'r-t2-1', owner: 'Network Team' },
          ],
        },
      },
      {
        id: 't2-hsm',
        type: 'hardware',
        position: { x: BASE_X + 290, y: BASE_Y + 50 },
        data: {
          label: 'HSM',
          componentType: 'hsm',
          description: 'Hardware Security Module providing tamper-resistant key storage and accelerated cryptographic operations.',
          securityLevel: 'SL-3',
          assets: [
            { id: 'a-t2-3', name: 'Root of Trust Keys', category: 'operational', description: 'Master key material used for firmware signing and secure boot – loss compromises entire vehicle security.' },
          ],
          threats: [
            { id: 'th-t2-3', name: 'Side-Channel Key Extraction', stride: 'I', cweId: 'CWE-203', description: 'Attacker uses power analysis or EM side-channel attack to extract private keys from HSM.' },
          ],
          risks: [
            { id: 'r-t2-3', threatId: 'th-t2-3', likelihood: 1, impact: 5, level: 'high', mitigation: 'Use EAL4+-certified HSM with built-in side-channel countermeasures; enforce key usage policies.', status: 'mitigated' },
          ],
        },
      },
      {
        id: 't2-os',
        type: 'software',
        position: { x: BASE_X + 30, y: BASE_Y + 170 },
        data: {
          label: 'Linux (Yocto)',
          componentType: 'os',
          version: '5.15 LTS',
          description: 'Hardened Yocto-based Linux providing process isolation and mandatory access control (SELinux).',
          threats: [
            { id: 'th-t2-4', name: 'Kernel Exploit / Privilege Escalation', stride: 'E', cweId: 'CWE-269', description: 'Unpatched Linux kernel CVE allows unprivileged process to gain root access and disable security controls.' },
          ],
          risks: [
            { id: 'r-t2-4', threatId: 'th-t2-4', likelihood: 3, impact: 5, level: 'high', mitigation: 'Maintain monthly kernel patch cycle; enable Yocto meta-security hardening layer.', status: 'in-progress' },
          ],
        },
      },
      {
        id: 't2-fw',
        type: 'software',
        position: { x: BASE_X + 180, y: BASE_Y + 170 },
        data: {
          label: 'Firewall / IDS',
          componentType: 'network_service',
          version: 'iptables 1.8 / Snort 3.0',
          description: 'Stateful packet inspection firewall combined with signature-based intrusion detection.',
          threats: [
            { id: 'th-t2-5', name: 'IDS Rule Evasion', stride: 'D', cweId: 'CWE-693', description: 'Attacker uses protocol fragmentation or obfuscation to bypass IDS signatures and firewall rules.' },
          ],
          risks: [
            { id: 'r-t2-5', threatId: 'th-t2-5', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Enable deep-packet inspection; keep IDS rule sets current; use anomaly-based detection as complement.', status: 'open' },
          ],
        },
      },
      {
        id: 't2-app',
        type: 'software',
        position: { x: BASE_X + 310, y: BASE_Y + 170 },
        data: {
          label: 'Gateway App',
          componentType: 'application',
          description: 'Application-layer gateway logic handling message routing, filtering and protocol translation.',
          threats: [
            { id: 'th-t2-6', name: 'Unlogged Admin Actions', stride: 'R', cweId: 'CWE-778', description: 'Configuration changes made by admin role are not logged, allowing repudiation of unauthorized changes.' },
          ],
          risks: [
            { id: 'r-t2-6', threatId: 'th-t2-6', likelihood: 2, impact: 3, level: 'low', mitigation: 'Implement tamper-evident audit logging for all configuration changes; store logs in write-once storage.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't2-e1', source: 't2-gw', target: 't2-os' },
      { id: 't2-e2', source: 't2-gw', target: 't2-hsm' },
      { id: 't2-e3', source: 't2-os', target: 't2-fw' },
      { id: 't2-e4', source: 't2-os', target: 't2-app' },
      { id: 't2-e5', source: 't2-hsm', target: 't2-app' },
    ],
  },

  {
    id: 'can-network',
    name: 'CAN Bus Architecture',
    description: 'Typical CAN bus with multiple ECUs and a gateway',
    category: 'automotive',
    nodes: [
      {
        id: 't3-net',
        type: 'boundary',
        position: { x: BASE_X, y: BASE_Y },
        style: { width: 500, height: 200 },
        data: { label: 'CAN Bus Network Segment', boundaryType: 'network-segment' },
      },
      {
        id: 't3-gw',
        type: 'hardware',
        position: { x: BASE_X + 190, y: BASE_Y + 60 },
        data: {
          label: 'Central Gateway',
          componentType: 'gateway',
          description: 'Central gateway bridging multiple CAN buses and Ethernet backbone. Acts as primary trust boundary.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t3-1', name: 'CAN Routing Rules', category: 'operational', description: 'Inter-bus routing configuration – tampering allows cross-domain message injection.' },
            { id: 'a-t3-2', name: 'Vehicle Network Topology', category: 'privacy', description: 'Knowledge of internal network structure is valuable for targeted attacks.' },
          ],
          threats: [
            { id: 'th-t3-1', name: 'CAN Message Injection', stride: 'T', cweId: 'CWE-20', description: 'Attacker injects forged CAN frames by gaining access to OBD port or a compromised ECU to manipulate vehicle functions.' },
            { id: 'th-t3-2', name: 'CAN Bus Passive Eavesdropping', stride: 'I', cweId: 'CWE-319', description: 'Attacker listens to unencrypted CAN traffic to reverse-engineer commands and learn vehicle state.' },
          ],
          risks: [
            { id: 'r-t3-1', threatId: 'th-t3-1', likelihood: 3, impact: 5, level: 'high', mitigation: 'Deploy AUTOSAR SecOC with CMAC on all safety-critical PDUs; rate-limit unexpected message IDs.', status: 'open' },
            { id: 'r-t3-2', threatId: 'th-t3-2', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Encrypt sensitive CAN-TP transfers; limit diagnostic interface access to authorized tools.', status: 'open' },
          ],
        },
      },
      {
        id: 't3-ecu1',
        type: 'hardware',
        position: { x: BASE_X - 180, y: BASE_Y + 60 },
        data: {
          label: 'Engine ECU',
          componentType: 'ecu',
          description: 'Controls fuel injection, ignition and throttle. Safety-critical – compromise can cause physical damage.',
          securityLevel: 'SL-2',
          threats: [
            { id: 'th-t3-3', name: 'Engine ECU Impersonation', stride: 'S', cweId: 'CWE-290', description: 'Attacker spoofs Engine ECU CAN ID to send false sensor readings to the gateway, disrupting engine management.' },
          ],
          risks: [
            { id: 'r-t3-3', threatId: 'th-t3-3', likelihood: 2, impact: 5, level: 'high', mitigation: 'Implement CAN node authentication using AUTOSAR SecOC; monitor for duplicate CAN IDs.', status: 'open' },
          ],
        },
      },
      {
        id: 't3-ecu2',
        type: 'hardware',
        position: { x: BASE_X - 180, y: BASE_Y + 200 },
        data: {
          label: 'Brake ECU',
          componentType: 'ecu',
          description: 'ABS and ESC controller. Highest safety classification (ASIL-D) – any compromise is safety-critical.',
          securityLevel: 'SL-2',
          threats: [
            { id: 'th-t3-5', name: 'Brake Command Manipulation', stride: 'T', cweId: 'CWE-345', description: 'Attacker modifies brake force commands via compromised CAN bus, potentially causing brake failure.' },
          ],
          risks: [
            { id: 'r-t3-5', threatId: 'th-t3-5', likelihood: 2, impact: 5, level: 'high', mitigation: 'Hardware safety monitors validate brake commands independently; SecOC message authentication required.', status: 'in-progress' },
          ],
        },
      },
      {
        id: 't3-ecu3',
        type: 'hardware',
        position: { x: BASE_X + 450, y: BASE_Y + 60 },
        data: {
          label: 'Body ECU',
          componentType: 'ecu',
          description: 'Controls comfort features: door locks, windows, lighting. Lower safety criticality but entry point for attackers.',
          threats: [
            { id: 'th-t3-4', name: 'Physical Access via Body ECU', stride: 'E', cweId: 'CWE-284', description: 'Body ECU accessible via window motor connector provides unauthenticated CAN access; used as pivot to higher-criticality buses.' },
          ],
          risks: [
            { id: 'r-t3-4', threatId: 'th-t3-4', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Network-segment Body domain from Powertrain domain; apply strict firewall rules on the gateway.', status: 'open' },
          ],
        },
      },
      {
        id: 't3-tele',
        type: 'hardware',
        position: { x: BASE_X + 450, y: BASE_Y + 200 },
        data: {
          label: 'Telematics',
          componentType: 'telematics',
          description: 'LTE/5G connected telematics unit. Primary external attack surface for remote threats.',
          assets: [
            { id: 'a-t3-3', name: 'Vehicle Location & Telemetry', category: 'privacy', description: 'GPS and driving data transmitted to backend – privacy-sensitive, subject to GDPR.' },
          ],
          threats: [
            { id: 'th-t3-6', name: 'Telemetry Data Leak via Insecure Channel', stride: 'I', cweId: 'CWE-319', description: 'Sensitive telemetry data (GPS, speed, user data) transmitted without sufficient encryption to cloud backend.' },
          ],
          risks: [
            { id: 'r-t3-6', threatId: 'th-t3-6', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Enforce TLS 1.3 with certificate pinning for all backend connections; minimize data transmitted.', status: 'mitigated' },
          ],
        },
      },
    ],
    edges: [
      { id: 't3-e1', source: 't3-ecu1', target: 't3-gw' },
      { id: 't3-e2', source: 't3-ecu2', target: 't3-gw' },
      { id: 't3-e3', source: 't3-gw', target: 't3-ecu3' },
      { id: 't3-e4', source: 't3-gw', target: 't3-tele' },
    ],
  },

  {
    id: 'iot-device',
    name: 'IoT Edge Device',
    description: 'Typical IoT device with sensor, microcontroller and cloud connectivity',
    category: 'iot',
    nodes: [
      {
        id: 't4-dev',
        type: 'boundary',
        position: { x: BASE_X, y: BASE_Y },
        style: { width: 360, height: 260 },
        data: { label: 'Device Physical Zone', boundaryType: 'physical-zone' },
      },
      {
        id: 't4-mcu',
        type: 'hardware',
        position: { x: BASE_X + 110, y: BASE_Y + 50 },
        data: {
          label: 'MCU',
          componentType: 'ecu',
          version: 'ARM Cortex-M4',
          description: 'Microcontroller managing sensor readout, local processing and radio communication.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t4-1', name: 'Device Identity Certificate', category: 'operational', description: 'X.509 device certificate used for cloud authentication – theft allows device impersonation.' },
            { id: 'a-t4-2', name: 'Sensor Measurements', category: 'operational', description: 'Raw sensor data used for process control – falsification could cause incorrect automated decisions.' },
          ],
          threats: [
            { id: 'th-t4-1', name: 'OTA Firmware Tampering', stride: 'T', cweId: 'CWE-494', description: 'Attacker intercepts or replaces OTA update package with malicious firmware lacking integrity verification.' },
            { id: 'th-t4-2', name: 'Device Identity Spoofing', stride: 'S', cweId: 'CWE-290', description: 'Stolen device certificate used to register a rogue device with the cloud backend, receiving commands intended for the legitimate device.' },
          ],
          risks: [
            { id: 'r-t4-1', threatId: 'th-t4-1', likelihood: 4, impact: 4, level: 'high', mitigation: 'Verify ECDSA-256 signature of update package before writing to flash; implement rollback protection counter.', status: 'open' },
            { id: 'r-t4-2', threatId: 'th-t4-2', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Store device private key in hardware-protected memory (TrustZone/eFuse); enable certificate revocation.', status: 'in-progress' },
          ],
          measures: [
            { id: 'm-t4-1', title: 'OTA Signature Verification', description: 'Bootloader checks ECDSA-256 signature before applying any OTA update; reject on failure.', status: 'open', riskId: 'r-t4-1', owner: 'Firmware Team' },
          ],
        },
      },
      {
        id: 't4-sensor',
        type: 'hardware',
        position: { x: BASE_X + 20, y: BASE_Y + 50 },
        data: {
          label: 'Sensor',
          componentType: 'sensor',
          description: 'Physical measurement sensor (e.g., temperature, pressure). Connects to MCU via I²C/SPI.',
          threats: [
            { id: 'th-t4-5', name: 'Sensor Value Spoofing', stride: 'S', cweId: 'CWE-20', description: 'Attacker injects false I²C/SPI readings by physically attaching to the bus, feeding incorrect measurements to the MCU.' },
          ],
          risks: [
            { id: 'r-t4-5', threatId: 'th-t4-5', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Apply plausibility checks on sensor readings; use tamper-evident enclosure.', status: 'open' },
          ],
        },
      },
      {
        id: 't4-radio',
        type: 'hardware',
        position: { x: BASE_X + 200, y: BASE_Y + 50 },
        data: {
          label: 'Radio Module',
          componentType: 'telematics',
          description: 'IEEE 802.15.4 / LTE-M radio transceiver for cloud and peer communication.',
          assets: [
            { id: 'a-t4-3', name: 'Communication Keys (DTLS)', category: 'operational', description: 'Session and PSK material for DTLS – exposure enables traffic decryption.' },
          ],
          threats: [
            { id: 'th-t4-3', name: 'Unencrypted Data Transmission', stride: 'I', cweId: 'CWE-319', description: 'Sensor telemetry transmitted without encryption allows passive eavesdropping on sensitive measurement data.' },
          ],
          risks: [
            { id: 'r-t4-3', threatId: 'th-t4-3', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Enforce DTLS 1.3 for all radio transmissions; disable plaintext fallback mode.', status: 'open' },
          ],
        },
      },
      {
        id: 't4-fw',
        type: 'software',
        position: { x: BASE_X + 50, y: BASE_Y + 165 },
        data: {
          label: 'Firmware',
          componentType: 'firmware',
          version: 'v1.0.8',
          description: 'Application firmware managing sensor polling, data aggregation and radio protocol stack.',
          threats: [
            { id: 'th-t4-4', name: 'Buffer Overflow in MQTT Parser', stride: 'E', cweId: 'CWE-121', description: 'Malformed MQTT PUBLISH packet triggers stack buffer overflow in firmware parser, leading to arbitrary code execution.' },
          ],
          risks: [
            { id: 'r-t4-4', threatId: 'th-t4-4', likelihood: 2, impact: 5, level: 'high', mitigation: 'Enable stack canaries and bounds-checking compiler flags (-fstack-protector-strong); fuzz MQTT parser.', status: 'open' },
          ],
        },
      },
      {
        id: 't4-boot',
        type: 'software',
        position: { x: BASE_X + 210, y: BASE_Y + 165 },
        data: {
          label: 'Secure Bootloader',
          componentType: 'bootloader',
          version: 'v2.0',
          description: 'First-stage bootloader implementing secure boot chain: measures and verifies each firmware stage.',
          threats: [
            { id: 'th-t4-6', name: 'Secure Boot Bypass via Fault Injection', stride: 'T', cweId: 'CWE-1319', description: 'Voltage glitch attack on MCU VCC rail during boot corrupts signature verification result, loading unsigned firmware.' },
          ],
          risks: [
            { id: 'r-t4-6', threatId: 'th-t4-6', likelihood: 1, impact: 5, level: 'high', mitigation: 'Add hardware voltage glitch detector; use redundant signature check with result comparison.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't4-e1', source: 't4-sensor', target: 't4-mcu' },
      { id: 't4-e2', source: 't4-mcu', target: 't4-radio' },
      { id: 't4-e3', source: 't4-mcu', target: 't4-fw' },
      { id: 't4-e4', source: 't4-mcu', target: 't4-boot' },
    ],
  },

  {
    id: 'plc-system',
    name: 'Industrial PLC System',
    description: 'PLC with I/O modules and SCADA connectivity',
    category: 'industrial',
    nodes: [
      {
        id: 't5-zone',
        type: 'boundary',
        position: { x: BASE_X, y: BASE_Y },
        style: { width: 440, height: 280 },
        data: { label: 'Control Zone', boundaryType: 'physical-zone' },
      },
      {
        id: 't5-plc',
        type: 'hardware',
        position: { x: BASE_X + 140, y: BASE_Y + 50 },
        data: {
          label: 'PLC',
          componentType: 'ecu',
          version: 'Siemens S7-1200',
          description: 'Programmable Logic Controller executing ladder logic for process automation. Connects to SCADA over Profinet.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t5-1', name: 'Control Logic Program', category: 'operational', description: 'PLC ladder logic program – modification causes incorrect process control, potentially causing physical damage.' },
            { id: 'a-t5-2', name: 'Process Setpoints', category: 'safety', description: 'Safety-relevant process parameters (temperature/pressure limits) – manipulation can cause unsafe conditions.' },
          ],
          threats: [
            { id: 'th-t5-1', name: 'Unauthorized PLC Program Modification', stride: 'T', cweId: 'CWE-284', description: 'Attacker uploads modified ladder logic via Profinet programming interface (e.g., TIA Portal) without proper access control.' },
            { id: 'th-t5-2', name: 'PLC CPU Overload / DoS', stride: 'D', cweId: 'CWE-400', description: 'Flood of malformed Profinet packets saturates PLC CPU, causing watchdog reset and process shutdown.' },
          ],
          risks: [
            { id: 'r-t5-1', threatId: 'th-t5-1', likelihood: 3, impact: 5, level: 'high', mitigation: 'Enable PLC access protection level 3; restrict programming interface to dedicated VLAN; log all program changes.', status: 'open' },
            { id: 'r-t5-2', threatId: 'th-t5-2', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Deploy Profinet-aware firewall with rate limiting; enable PLC communication load monitoring.', status: 'open' },
          ],
          measures: [
            { id: 'm-t5-1', title: 'PLC Access Protection Level 3', description: 'Activate S7-1200 access protection requiring password for read/write and HMI access.', status: 'open', riskId: 'r-t5-1', owner: 'OT Team' },
            { id: 'm-t5-2', title: 'Profinet Traffic Rate Limiting', description: 'Configure upstream switch port to limit Profinet packet rate; block unknown protocol frames.', status: 'open', riskId: 'r-t5-2', owner: 'Network Team' },
          ],
        },
      },
      {
        id: 't5-io',
        type: 'hardware',
        position: { x: BASE_X + 20, y: BASE_Y + 50 },
        data: {
          label: 'I/O Module',
          componentType: 'actuator',
          description: 'Digital/analog I/O module connecting PLC to physical process actuators (valves, motors, relays).',
          threats: [
            { id: 'th-t5-4', name: 'Physical I/O Module Replacement', stride: 'S', cweId: 'CWE-290', description: 'Attacker replaces I/O module with rogue hardware that accepts valid commands but outputs incorrect signals to actuators.' },
          ],
          risks: [
            { id: 'r-t5-4', threatId: 'th-t5-4', likelihood: 1, impact: 4, level: 'medium', mitigation: 'Implement module serial number verification at PLC startup; physical access control to control cabinet.', status: 'open' },
          ],
        },
      },
      {
        id: 't5-sensor',
        type: 'hardware',
        position: { x: BASE_X + 280, y: BASE_Y + 50 },
        data: {
          label: 'Field Sensor',
          componentType: 'sensor',
          description: 'Process sensor (pressure/temperature/flow) providing measurement inputs to PLC via 4-20 mA or Profibus.',
          threats: [
            { id: 'th-t5-5', name: 'False Sensor Reading Injection', stride: 'S', cweId: 'CWE-20', description: 'Attacker manipulates 4-20 mA signal on instrumentation cable to inject false process readings, causing PLC to take incorrect actions.' },
          ],
          risks: [
            { id: 'r-t5-5', threatId: 'th-t5-5', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Cross-check redundant sensor readings; use shielded cable and intrusion-detection for physical access.', status: 'open' },
          ],
        },
      },
      {
        id: 't5-os',
        type: 'software',
        position: { x: BASE_X + 80, y: BASE_Y + 165 },
        data: {
          label: 'RTOS',
          componentType: 'os',
          version: 'FreeRTOS 10.4',
          description: 'Real-time OS providing deterministic scan-cycle scheduling and memory protection for PLC tasks.',
          threats: [
            { id: 'th-t5-6', name: 'Unpatched RTOS CVE Exploitation', stride: 'E', cweId: 'CWE-269', description: 'Known vulnerability in FreeRTOS TCP/IP stack (e.g., AMNESIA:33) exploited to gain control of PLC task scheduling.' },
          ],
          risks: [
            { id: 'r-t5-6', threatId: 'th-t5-6', likelihood: 2, impact: 5, level: 'high', mitigation: 'Apply vendor security patches; disable unused FreeRTOS networking components; monitor for anomalous task behavior.', status: 'open' },
          ],
        },
      },
      {
        id: 't5-app',
        type: 'software',
        position: { x: BASE_X + 250, y: BASE_Y + 165 },
        data: {
          label: 'Control Logic',
          componentType: 'application',
          description: 'Application-level control logic implementing process automation sequences and safety interlocks.',
          assets: [
            { id: 'a-t5-3', name: 'Safety Interlock Logic', category: 'safety', description: 'Software implementing Emergency Shutdown (ESD) interlocks – bypass causes unsafe process conditions.' },
          ],
          threats: [
            { id: 'th-t5-3', name: 'Safety Interlock Bypass via Logic Injection', stride: 'E', cweId: 'CWE-284', description: 'Attacker with write access injects logic that forces safety interlock outputs to bypass, disabling Emergency Shutdown functionality.' },
          ],
          risks: [
            { id: 'r-t5-3', threatId: 'th-t5-3', likelihood: 2, impact: 5, level: 'high', mitigation: 'Implement safety logic in certified Safety PLC (SIL 2+) separate from control PLC; perform logic code review.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't5-e1', source: 't5-io', target: 't5-plc' },
      { id: 't5-e2', source: 't5-sensor', target: 't5-plc' },
      { id: 't5-e3', source: 't5-plc', target: 't5-os' },
      { id: 't5-e4', source: 't5-os', target: 't5-app' },
    ],
  },

  {
    id: 'edge-cloud-mqtt',
    name: 'Edge → Cloud (MQTT)',
    description: 'Edge Gateway sendet Sensordaten via MQTT an einen Cloud-Server mit Datenbank-Anbindung und nachgelagertem Analytics-Service',
    category: 'iot',
    nodes: [
      // ── Edge Zone ──────────────────────────────────────────────────────────
      {
        id: 't6-edge-zone',
        type: 'boundary',
        position: { x: BASE_X - 50, y: BASE_Y - 20 },
        style: { width: 220, height: 290 },
        data: { label: 'Edge Zone (Vor-Ort)', boundaryType: 'physical-zone' },
      },
      {
        id: 't6-gw',
        type: 'hardware',
        position: { x: BASE_X, y: BASE_Y + 50 },
        data: {
          label: 'Edge Gateway',
          componentType: 'gateway',
          version: 'Linux 5.15 (Yocto)',
          description: 'Lokales Edge-Gerät, das Sensordaten aggregiert und verschlüsselt per MQTT an den Cloud-Broker weiterleitet.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t6-1', name: 'MQTT Client-Zertifikat', category: 'operational', description: 'X.509-Zertifikat für mTLS-Authentifizierung am Broker – Diebstahl ermöglicht Gateway-Impersonation.' },
            { id: 'a-t6-2', name: 'Lokaler Sensor-Puffer', category: 'operational', description: 'Zwischenspeicher für Messwerte bei Cloud-Verbindungsausfall – Manipulation verfälscht nachgelagerte Analysen.' },
          ],
          threats: [
            { id: 'th-t6-1', name: 'MQTT-Nachricht Manipulation (MitM)', stride: 'T', cweId: 'CWE-300', description: 'Angreifer führt Man-in-the-Middle-Angriff auf TLS-Verbindung durch und modifiziert MQTT-Payloads, bevor sie den Broker erreichen.' },
            { id: 'th-t6-2', name: 'Gateway-Spoofing gegenüber Cloud', stride: 'S', cweId: 'CWE-295', description: 'Gestohlenes Client-Zertifikat ermöglicht einem fremden Gerät, sich als legitimes Gateway auszugeben und falsche Messwerte einzuspeisen.' },
            { id: 'th-t6-3', name: 'Unverschlüsseltes MQTT (Port 1883)', stride: 'I', cweId: 'CWE-319', description: 'MQTT ohne TLS übermittelt Sensordaten und Geräte-IDs im Klartext, einsehbar durch Netzwerk-Sniffing.' },
          ],
          risks: [
            { id: 'r-t6-1', threatId: 'th-t6-1', likelihood: 3, impact: 4, level: 'high', mitigation: 'TLS 1.3 mit Certificate Pinning erzwingen; MQTT over WebSocket mit gegenseitiger Authentifizierung (mTLS).', status: 'open' },
            { id: 'r-t6-2', threatId: 'th-t6-2', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Private Keys in Hardware-Secure-Element (TPM 2.0) speichern; Zertifikat-Widerruf (OCSP) aktivieren.', status: 'in-progress' },
            { id: 'r-t6-3', threatId: 'th-t6-3', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Port 1883 in Firewall sperren; ausschließlich MQTT-over-TLS (Port 8883) erlauben.', status: 'open' },
          ],
          measures: [
            { id: 'm-t6-1', title: 'mTLS für MQTT erzwingen', description: 'Broker-Konfiguration: require_certificate=true; Client-Zertifikate aus unternehmenseigener PKI ausstellen.', status: 'open', riskId: 'r-t6-1', owner: 'Platform Team' },
            { id: 'm-t6-2', title: 'TPM-gestützter Key Store', description: 'Private Key für MQTT-Client-Zertifikat in TPM 2.0 ablegen; Key nie im Dateisystem speichern.', status: 'open', riskId: 'r-t6-2', owner: 'HW Team' },
          ],
        },
      },
      {
        id: 't6-agent',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 170 },
        data: {
          label: 'MQTT Client Agent',
          componentType: 'application',
          version: 'Eclipse Paho 1.5',
          description: 'Applikationssoftware auf dem Gateway: liest Sensordaten, serialisiert sie (JSON/Protobuf) und publiziert auf definierten MQTT-Topics.',
          threats: [
            { id: 'th-t6-7', name: 'Topic Wildcard-Zugriff (Overly Permissive ACL)', stride: 'I', cweId: 'CWE-284', description: 'Zu offene MQTT-ACLs (z.B. #-Wildcard) erlauben einem kompromittierten Client, Topics anderer Geräte zu lesen oder zu beschreiben.' },
          ],
          risks: [
            { id: 'r-t6-7', threatId: 'th-t6-7', likelihood: 2, impact: 3, level: 'medium', mitigation: 'ACL im Broker: jeder Client darf nur auf seine eigenen device/{id}/# Topics publizieren/subscriben; Default-Deny für alles andere.', status: 'open' },
          ],
        },
      },

      // ── Cloud Zone ─────────────────────────────────────────────────────────
      {
        id: 't6-cloud-zone',
        type: 'boundary',
        position: { x: BASE_X + 280, y: BASE_Y - 50 },
        style: { width: 480, height: 380 },
        data: { label: 'Cloud Zone (Managed Cloud)', boundaryType: 'cloud-zone' },
      },
      {
        id: 't6-broker',
        type: 'software',
        position: { x: BASE_X + 320, y: BASE_Y + 20 },
        data: {
          label: 'MQTT Broker',
          componentType: 'network_service',
          version: 'Eclipse Mosquitto 2.0',
          description: 'Cloud-seitiger MQTT Message Broker (Port 8883/TLS). Nimmt Nachrichten von Edge-Gateways entgegen und leitet sie an Subscriber weiter.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t6-3', name: 'MQTT Topic-Namespace', category: 'operational', description: 'Struktur der Topics bildet die Geräte-Hierarchie ab – Kenntnis ermöglicht gezieltes Abhören oder Topic-Flooding.' },
            { id: 'a-t6-4', name: 'In-Flight Message Queue (QoS 1/2)', category: 'operational', description: 'Nachrichten im Broker-Puffer – Verlust oder Manipulation unterbricht den Datenstrom zur Datenbank.' },
          ],
          threats: [
            { id: 'th-t6-4', name: 'MQTT Broker Überflutung (Flood)', stride: 'D', cweId: 'CWE-400', description: 'Angreifer verbindet tausende Fake-Clients oder sendet PUBLISH-Nachrichten in hoher Frequenz und überlastet den Broker-Prozess.' },
            { id: 'th-t6-5', name: 'Fehlende Auth-Protokollierung', stride: 'R', cweId: 'CWE-778', description: 'Verbindungs- und Authentifizierungsereignisse werden nicht auditiert; unauthorisierte Verbindungsversuche bleiben unentdeckt und nicht nachweisbar.' },
            { id: 'th-t6-6', name: 'Unberechtigtes Topic-Subscribe', stride: 'E', cweId: 'CWE-284', description: 'Service ohne explizite ACL-Einschränkung kann alle Topics eines anderen Mandanten abonnieren und sensible Messdaten einsehen.' },
          ],
          risks: [
            { id: 'r-t6-4', threatId: 'th-t6-4', likelihood: 3, impact: 4, level: 'high', mitigation: 'Rate-Limiting pro Client-ID (max. 100 msg/s); Connection-Throttling und automatisches Banning bei Überschreitung.', status: 'open' },
            { id: 'r-t6-5', threatId: 'th-t6-5', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Structured Logging aller CONNECT/DISCONNECT/AUTH-Events ins SIEM; Alert bei unbekannten Client-IDs.', status: 'open' },
            { id: 'r-t6-6', threatId: 'th-t6-6', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Broker-ACL: explizites Allowlisting per Service-Account; Default-Deny für alle Topics.', status: 'in-progress' },
          ],
        },
      },
      {
        id: 't6-db',
        type: 'software',
        position: { x: BASE_X + 320, y: BASE_Y + 210 },
        data: {
          label: 'Time-Series DB',
          componentType: 'network_service',
          version: 'InfluxDB 2.7',
          description: 'Zeitreihendatenbank für Sensor-Messwerte. Wird vom Broker-Backend via Line Protocol beschrieben und vom Analytics-Service über Flux-Queries abgefragt.',
          assets: [
            { id: 'a-t6-5', name: 'Sensor-Zeitreihendaten', category: 'operational', description: 'Historische Messwerte aller Edge-Geräte – Verfälschung führt zu falschen Analysen und Fehlalarmen.' },
            { id: 'a-t6-6', name: 'Geräte-Metadaten', category: 'privacy', description: 'Standort und Betriebszeiten der Geräte – DSGVO-relevant wenn Personenbezug vorhanden.' },
          ],
          threats: [
            { id: 'th-t6-8', name: 'Flux/InfluxQL Query-Injection', stride: 'I', cweId: 'CWE-89', description: 'Ungeparameterisierte Datenbankabfragen im Analytics-Service erlauben Injection von Flux-Befehlen und Exfiltration aller Messdaten.' },
            { id: 'th-t6-9', name: 'DB-Token im Klartext (Env-Variable)', stride: 'T', cweId: 'CWE-312', description: 'InfluxDB-API-Token wird als Klartext-Umgebungsvariable in der Container-Konfiguration gespeichert und ist über die Container-Runtime-API auslesbar.' },
          ],
          risks: [
            { id: 'r-t6-8', threatId: 'th-t6-8', likelihood: 3, impact: 4, level: 'high', mitigation: 'Ausschließlich parametrisierte Flux-Queries; Read-Only-Token für Analytics-Service; Write-Token nur für Broker-Backend.', status: 'open' },
            { id: 'r-t6-9', threatId: 'th-t6-9', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Secrets über Vault/Kubernetes Secrets mit CSI-Driver einbinden; keine Klartext-Env-Vars für Credentials.', status: 'open' },
          ],
          measures: [
            { id: 'm-t6-3', title: 'Read-Only Token für Analytics', description: 'Separaten InfluxDB-Token mit ausschließlich Read-Berechtigung für Analytics-Service; Write-Token bleibt im Broker-Backend.', status: 'open', riskId: 'r-t6-8', owner: 'Backend Team' },
          ],
        },
      },
      {
        id: 't6-analytics',
        type: 'software',
        position: { x: BASE_X + 530, y: BASE_Y + 105 },
        data: {
          label: 'Analytics Service',
          componentType: 'application',
          version: 'Python 3.11 / FastAPI',
          description: 'Nachgelagerter Cloud-Service: liest Zeitreihendaten aus der DB, berechnet Anomalie-Scores und stellt eine REST-API für Dashboards bereit.',
          assets: [
            { id: 'a-t6-7', name: 'Service-to-Service API-Token', category: 'operational', description: 'Service-Account-Token für DB-Zugriff – Kompromittierung ermöglicht Massenextraktion aller Sensordaten.' },
            { id: 'a-t6-8', name: 'Trainierte Anomalie-Modelle (ML)', category: 'operational', description: 'ML-Modelle zur Fehlererkennung – stille Manipulation degradiert die Erkennungsqualität.' },
          ],
          threats: [
            { id: 'th-t6-10', name: 'REST-API ohne Authentifizierung', stride: 'S', cweId: 'CWE-306', description: 'Analytics-REST-API ist cloud-intern ohne Token-Authentifizierung erreichbar; jeder kompromittierte Service kann Analysedaten abrufen.' },
            { id: 'th-t6-11', name: 'Model-Poisoning via DB-Manipulation', stride: 'T', cweId: 'CWE-20', description: 'Angreifer schreibt manipulierte Trainingsdaten in die DB; beim nächsten Re-Training verschlechtert sich die Anomalieerkennung unbemerkt.' },
            { id: 'th-t6-12', name: 'Unkontrollierte DB-Queries → Downstream-Ausfall', stride: 'D', cweId: 'CWE-400', description: 'Abfragen ohne Pagination oder Timeout-Grenzen führen zu Query-Hänger in InfluxDB und machen den Analytics-Service für Dashboards nicht verfügbar.' },
          ],
          risks: [
            { id: 'r-t6-10', threatId: 'th-t6-10', likelihood: 3, impact: 4, level: 'high', mitigation: 'OAuth 2.0 Client-Credentials-Flow für alle Service-to-Service-Aufrufe; API-Gateway mit JWT-Validierung vorschalten.', status: 'open' },
            { id: 'r-t6-11', threatId: 'th-t6-11', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Trainings-Pipeline aus read-only DB-Snapshot ausführen; Modell-Versionen signieren und auf Drift überwachen.', status: 'open' },
            { id: 'r-t6-12', threatId: 'th-t6-12', likelihood: 2, impact: 3, level: 'medium', mitigation: 'DB-Query-Timeout und Pagination erzwingen; Circuit-Breaker-Pattern im Analytics-Service implementieren.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't6-e1', source: 't6-gw', target: 't6-agent' },
      { id: 't6-e2', source: 't6-agent', target: 't6-broker', label: 'MQTT / TLS 1.3 (Port 8883)' },
      { id: 't6-e3', source: 't6-broker', target: 't6-db', label: 'Line Protocol (HTTPS)' },
      { id: 't6-e4', source: 't6-broker', target: 't6-analytics', label: 'MQTT Subscribe' },
      { id: 't6-e5', source: 't6-db', target: 't6-analytics', label: 'Flux Query (HTTPS)' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'cloud-web-api',
    name: 'Cloud Web API Stack',
    description: 'Klassischer 3-Tier-Aufbau: WAF → API Gateway → Auth + Backend → PostgreSQL + Redis Cache',
    category: 'cloud',
    nodes: [
      // ── Cloud Envelope ─────────────────────────────────────────────────────
      {
        id: 't7-cloud',
        type: 'boundary',
        position: { x: BASE_X - 110, y: BASE_Y - 90 },
        style: { width: 660, height: 840 },
        data: { label: 'Cloud Environment', boundaryType: 'cloud-zone' },
      },
      // ── DMZ / Edge ─────────────────────────────────────────────────────────
      {
        id: 't7-dmz',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y - 30 },
        style: { width: 540, height: 160 },
        data: { label: 'DMZ / Edge-Schicht', boundaryType: 'network-segment' },
      },
      {
        id: 't7-waf',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 30 },
        data: {
          label: 'WAF / DDoS-Schutz',
          componentType: 'network_service',
          version: 'AWS WAF v2 / Cloudflare',
          description: 'Web Application Firewall filtert bekannte Angriffsmuster (OWASP Top 10) und schützt vor volumetrischen DDoS-Angriffen bevor Anfragen das Backend erreichen.',
          assets: [
            { id: 'a-t7-1', name: 'WAF-Regelwerk', category: 'operational', description: 'Konfigurierte WAF-Regeln – Deaktivierung oder Schwächung exponiert das Backend gegenüber OWASP-Angriffen.' },
          ],
          threats: [
            { id: 'th-t7-1', name: 'WAF-Bypass via HTTP-Obfuskierung', stride: 'T', cweId: 'CWE-20', description: 'Angreifer umgeht WAF-Regeln durch Unicode-Encoding, Chunked Transfer oder HTTP/2-Parameter-Splitting um SQL-Injection-Nutzlasten durchzuschleusen.' },
            { id: 'th-t7-2', name: 'Volumetrischer DDoS-Angriff', stride: 'D', cweId: 'CWE-400', description: 'Botnet flutet API-Endpunkte mit Millionen von Anfragen pro Sekunde und erschöpft WAF-Kapazitäten und dahinterliegende Ressourcen.' },
          ],
          risks: [
            { id: 'r-t7-1', threatId: 'th-t7-1', likelihood: 3, impact: 4, level: 'high', mitigation: 'Managed WAF-Regeln (AWS Managed Rules / OWASP Core Rule Set) aktivieren; Log-Rate für verdächtige User-Agents erhöhen.', status: 'open' },
            { id: 'r-t7-2', threatId: 'th-t7-2', likelihood: 3, impact: 4, level: 'high', mitigation: 'Rate-Limiting per IP (1000 req/min); Anycast-DDoS-Scrubbing aktivieren; Challenge-Seiten für suspekte ASNs.', status: 'in-progress' },
          ],
        },
      },
      {
        id: 't7-apigw',
        type: 'software',
        position: { x: BASE_X + 270, y: BASE_Y + 30 },
        data: {
          label: 'API Gateway',
          componentType: 'network_service',
          version: 'Kong 3.x / AWS API GW',
          description: 'Zentraler Eingangspunkt für alle API-Requests: Routing, Rate-Limiting, JWT-Validierung, TLS-Terminierung und Request-Transformation.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t7-2', name: 'API-Routing-Konfiguration', category: 'operational', description: 'Gateway-Routing-Regeln – Manipulation leitet Traffic auf falsche Services oder deaktiviert Authentifizierung.' },
            { id: 'a-t7-3', name: 'JWT-Signing-Schlüssel (JWKS)', category: 'operational', description: 'Public Keys zur Token-Validierung – Kompromittierung ermöglicht Token-Fälschung.' },
          ],
          threats: [
            { id: 'th-t7-3', name: 'JWT-Algorithm Confusion (alg=none)', stride: 'S', cweId: 'CWE-347', description: 'Angreifer sendet manipulierten JWT mit alg=none; fehlkonfigurierter Gateway akzeptiert unsignierten Token als gültig.' },
            { id: 'th-t7-4', name: 'Path Traversal zu internen Endpunkten', stride: 'E', cweId: 'CWE-22', description: 'Angreifer nutzt URL-Encoding-Tricks (/api/v1/../../admin/config) um am Gateway-Routing vorbei auf administrative Endpunkte zuzugreifen.' },
            { id: 'th-t7-5', name: 'Fehlende Request-Protokollierung (Repudiation)', stride: 'R', cweId: 'CWE-778', description: 'API-Aufrufe werden nicht zentralisiert geloggt; forensische Nachverfolgung von Datenverletzungen ist nachträglich nicht möglich.' },
          ],
          risks: [
            { id: 'r-t7-3', threatId: 'th-t7-3', likelihood: 2, impact: 5, level: 'high', mitigation: 'Algorithmus auf RS256/ES256 fixieren; alg=none und symmetric HMAC für Public-Key-Flows ablehnen.', status: 'open' },
            { id: 'r-t7-4', threatId: 'th-t7-4', likelihood: 2, impact: 4, level: 'medium', mitigation: 'URL-Normalisierung vor Routing-Match erzwingen; Präfix-Matching statt Substring-Matching für Routes.', status: 'open' },
            { id: 'r-t7-5', threatId: 'th-t7-5', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Structured Access Logging (requestId, userId, path, status) in SIEM; Retention 90 Tage.', status: 'open' },
          ],
          measures: [
            { id: 'm-t7-1', title: 'JWT-Algorithmus fixieren', description: 'Gateway-Plugin konfigurieren: allowed_algorithms=[RS256, ES256]; alg=none und HS256 ablehnen.', status: 'open', riskId: 'r-t7-3', owner: 'Platform Team' },
          ],
        },
      },

      // ── Application Layer ──────────────────────────────────────────────────
      {
        id: 't7-app-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y + 200 },
        style: { width: 540, height: 190 },
        data: { label: 'Application-Schicht', boundaryType: 'logical-zone' },
      },
      {
        id: 't7-auth',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 270 },
        data: {
          label: 'Auth Service (OAuth2/OIDC)',
          componentType: 'application',
          version: 'Keycloak 24 / Auth0',
          description: 'Identity Provider: stellt JWTs aus, verwaltet Benutzer-Sessions, implementiert OAuth 2.0 Authorization Code Flow mit PKCE.',
          securityLevel: 'SL-3',
          assets: [
            { id: 'a-t7-4', name: 'Passwort-Hashes (bcrypt)', category: 'privacy', description: 'Gespeicherte Passwort-Hashes aller Nutzer – Kompromittierung ermöglicht Offline-Brute-Force.' },
            { id: 'a-t7-5', name: 'OAuth2 Client-Secrets', category: 'operational', description: 'Registrierte Client-Secrets für Service-to-Service-Auth – Leak ermöglicht Token-Generierung ohne Nutzerbeteiligung.' },
            { id: 'a-t7-6', name: 'Refresh Tokens (langlebig)', category: 'privacy', description: 'Langlebige Refresh Tokens in DB – Diebstahl ermöglicht dauerhaften Zugriff ohne erneutes Login.' },
          ],
          threats: [
            { id: 'th-t7-6', name: 'Credential Stuffing / Brute Force', stride: 'S', cweId: 'CWE-307', description: 'Angreifer testet automatisiert Millionen gestohlener Login-Paare (Credential Stuffing) gegen den Auth-Endpunkt.' },
            { id: 'th-t7-7', name: 'OAuth2 Authorization Code Injection', stride: 'E', cweId: 'CWE-601', description: 'Angreifer injiziert gestohlenen Authorization Code in eigenen Callback um Zugriffstoken eines fremden Nutzers zu erhalten (fehlendes state/PKCE).' },
            { id: 'th-t7-8', name: 'Refresh Token Theft via XSS', stride: 'I', cweId: 'CWE-79', description: 'XSS im Frontend-Client exfiltriert Refresh Token aus localStorage; Angreifer erneuert Access Token unbegrenzt.' },
          ],
          risks: [
            { id: 'r-t7-6', threatId: 'th-t7-6', likelihood: 4, impact: 4, level: 'high', mitigation: 'Account-Lockout nach 5 Fehlversuchen; reCAPTCHA für Login; IP-Reputation-Check; breached-password-detection.', status: 'open' },
            { id: 'r-t7-7', threatId: 'th-t7-7', likelihood: 2, impact: 5, level: 'high', mitigation: 'PKCE für alle Public Clients erzwingen; state-Parameter validieren; Authorization Codes auf 1-malige Nutzung und 60s TTL begrenzen.', status: 'in-progress' },
            { id: 'r-t7-8', threatId: 'th-t7-8', likelihood: 3, impact: 4, level: 'high', mitigation: 'Refresh Tokens in HttpOnly-Cookies statt localStorage; Refresh Token Rotation aktivieren; XSS-CSP-Header setzen.', status: 'open' },
          ],
        },
      },
      {
        id: 't7-backend',
        type: 'software',
        position: { x: BASE_X + 290, y: BASE_Y + 270 },
        data: {
          label: 'Backend Service',
          componentType: 'application',
          version: 'Node.js 20 / Go 1.22',
          description: 'Haupt-Business-Logic-Service: verarbeitet API-Anfragen, validiert JWTs, schreibt in PostgreSQL und liest aus Redis Cache.',
          assets: [
            { id: 'a-t7-7', name: 'Nutzerdaten (PII)', category: 'privacy', description: 'Personenbezogene Daten (Name, E-Mail, Adresse) in der Datenbank – DSGVO Art. 32 relevant.' },
            { id: 'a-t7-8', name: 'Business-Logik / Algorithmen', category: 'operational', description: 'Proprietäre Geschäftsregeln im Service – Offenlegung gibt Angreifern Einblick in Sicherheitslogik.' },
          ],
          threats: [
            { id: 'th-t7-9', name: 'Server-Side Request Forgery (SSRF)', stride: 'I', cweId: 'CWE-918', description: 'Backend verarbeitet user-gesteuerte URLs (z.B. Webhook-Callbacks) ohne Allowlist; Angreifer liest interne Metadaten-API (AWS IMDSv1) oder greift auf andere interne Services zu.' },
            { id: 'th-t7-10', name: 'Fehlendes Objekt-Level Authorization (IDOR)', stride: 'E', cweId: 'CWE-639', description: 'GET /api/orders/{id} prüft nicht ob die angefragte Ressource dem authentifizierten Nutzer gehört; Angreifer iteriert IDs um Fremddaten zu lesen (BOLA/IDOR).' },
            { id: 'th-t7-11', name: 'Unsichere Deserialisierung', stride: 'T', cweId: 'CWE-502', description: 'Backend deserialisiert user-kontrollierte JSON/XML ohne Schema-Validierung; manipulierte Objekte triggern unerwartete Codeausführung.' },
          ],
          risks: [
            { id: 'r-t7-9', threatId: 'th-t7-9', likelihood: 3, impact: 4, level: 'high', mitigation: 'URL-Allowlist für Outbound-Requests; IMDSv2 erzwingen; egress-Firewall blockiert IANA-Privatbereiche.', status: 'open' },
            { id: 'r-t7-10', threatId: 'th-t7-10', likelihood: 4, impact: 4, level: 'high', mitigation: 'Jeder DB-Query mit userId-Filter (WHERE owner_id = :userId); automatisierter IDOR-Test in CI-Pipeline.', status: 'open' },
            { id: 'r-t7-11', threatId: 'th-t7-11', likelihood: 2, impact: 4, level: 'medium', mitigation: 'JSON-Schema-Validierung mit ajv/Zod vor Deserialisierung; Klassen-Whitelist für Deserializer.', status: 'open' },
          ],
          measures: [
            { id: 'm-t7-2', title: 'IDOR-Test in CI', description: 'Automatisierter Test: Nutzer A versucht auf Ressourcen von Nutzer B zuzugreifen → muss 403 zurückgeben.', status: 'open', riskId: 'r-t7-10', owner: 'Backend Team' },
          ],
        },
      },

      // ── Data Layer ─────────────────────────────────────────────────────────
      {
        id: 't7-data-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y + 470 },
        style: { width: 540, height: 170 },
        data: { label: 'Datenhaltungs-Schicht', boundaryType: 'logical-zone' },
      },
      {
        id: 't7-db',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 540 },
        data: {
          label: 'PostgreSQL (Primary)',
          componentType: 'network_service',
          version: 'PostgreSQL 16',
          description: 'Primäre relationale Datenbank für Nutzer-, Bestell- und Transaktionsdaten. Nur vom Backend-Service direkt erreichbar (private Subnet).',
          assets: [
            { id: 'a-t7-9', name: 'Transaktionsdaten', category: 'financial', description: 'Bestell- und Zahlungshistorie – Manipulation beeinflusst Rechnungsstellung und Compliance.' },
            { id: 'a-t7-10', name: 'PII-Nutzerdaten', category: 'privacy', description: 'Name, E-Mail, Adresse aller Nutzer – DSGVO-Meldepflicht bei Verlust.' },
          ],
          threats: [
            { id: 'th-t7-12', name: 'SQL Injection via Backend-API', stride: 'I', cweId: 'CWE-89', description: 'Ungeparameterisierte Query im Backend ermöglicht Extraktion der gesamten Datenbank via UNION-basierter SQLi.' },
            { id: 'th-t7-13', name: 'Unverschlüsselte DB-Verbindung (In-Transit)', stride: 'I', cweId: 'CWE-319', description: 'Backend verbindet sich ohne TLS zum DB-Server; Netzwerk-Sniffer im selben Subnet kann Queries und Ergebnisse im Klartext lesen.' },
            { id: 'th-t7-14', name: 'Exzessive DB-Nutzerberechtigungen', stride: 'E', cweId: 'CWE-269', description: 'Backend-Service-Account hat SUPERUSER-Rechte; SQL-Injection oder kompromittierter Service kann DROP TABLE ausführen.' },
          ],
          risks: [
            { id: 'r-t7-12', threatId: 'th-t7-12', likelihood: 3, impact: 5, level: 'high', mitigation: 'Ausschließlich Prepared Statements / ORM-parametrisierte Queries; kein dynamisches SQL-Zusammensetzen.', status: 'open' },
            { id: 'r-t7-13', threatId: 'th-t7-13', likelihood: 2, impact: 4, level: 'medium', mitigation: 'sslmode=verify-full in Connection String; DB-Server akzeptiert keine unverschlüsselten Verbindungen.', status: 'open' },
            { id: 'r-t7-14', threatId: 'th-t7-14', likelihood: 2, impact: 5, level: 'high', mitigation: 'Least-Privilege DB-User: nur SELECT/INSERT/UPDATE auf benötigte Tabellen; kein DDL; separater Migration-User.', status: 'open' },
          ],
        },
      },
      {
        id: 't7-cache',
        type: 'software',
        position: { x: BASE_X + 200, y: BASE_Y + 540 },
        data: {
          label: 'Redis Cache',
          componentType: 'network_service',
          version: 'Redis 7.2',
          description: 'In-Memory Cache für Session-Daten, Rate-Limit-Zähler und häufig abgefragte Responses. Kein persistenter Store für kritische Daten.',
          threats: [
            { id: 'th-t7-15', name: 'Unauthentifizierter Redis-Zugriff', stride: 'I', cweId: 'CWE-306', description: 'Redis ohne requirepass im Cloud-Netzwerk exponiert Session-Tokens und Nutzer-Cache-Daten für jeden Angreifer im gleichen VPC.' },
            { id: 'th-t7-16', name: 'Cache-Poisoning via Race Condition', stride: 'T', cweId: 'CWE-362', description: 'Race Condition beim Cache-Update (Read-Modify-Write ohne Transaktion) ermöglicht Einschleusen falscher Autorisierungsdaten in den Cache.' },
          ],
          risks: [
            { id: 'r-t7-15', threatId: 'th-t7-15', likelihood: 3, impact: 4, level: 'high', mitigation: 'AUTH-Passwort mit requirepass setzen; Redis nur auf localhost/Unix-Socket oder mTLS-gesicherten Port exponieren.', status: 'open' },
            { id: 'r-t7-16', threatId: 'th-t7-16', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Redis MULTI/EXEC-Transaktionen oder SET NX für atomare Cache-Writes; optimistische Locking mit WATCH.', status: 'open' },
          ],
        },
      },
      {
        id: 't7-secrets',
        type: 'software',
        position: { x: BASE_X + 390, y: BASE_Y + 540 },
        data: {
          label: 'Secrets Manager',
          componentType: 'application',
          version: 'HashiCorp Vault / AWS Secrets Manager',
          description: 'Zentrale Verwaltung aller Credentials, API-Keys und Zertifikate. Services rufen Secrets zur Laufzeit ab statt sie in Env-Variablen zu speichern.',
          assets: [
            { id: 'a-t7-11', name: 'DB-Credentials (Rotation)', category: 'operational', description: 'Automatisch rotierte Datenbankpasswörter – zentrale Kompromittierung gefährdet alle Dienste gleichzeitig.' },
            { id: 'a-t7-12', name: 'API-Keys (Drittanbieter)', category: 'operational', description: 'Payment-Processor, E-Mail-Provider, SMS-Gateway API-Keys – Leak führt zu Rechnungen auf Kosten des Unternehmens.' },
          ],
          threats: [
            { id: 'th-t7-17', name: 'Vault-Unseal Key Kompromittierung', stride: 'I', cweId: 'CWE-522', description: 'HashiCorp Vault Unseal Key wird unsicher geteilt (z.B. per Slack/E-Mail); Angreifer mit Key kann Vault entschlüsseln und alle Secrets extrahieren.' },
            { id: 'th-t7-18', name: 'Secrets in Environment-Variablen', stride: 'T', cweId: 'CWE-312', description: 'Entwickler committen Secrets als Env-Variablen in Docker Compose oder K8s-Manifests ins Git-Repository.' },
          ],
          risks: [
            { id: 'r-t7-17', threatId: 'th-t7-17', likelihood: 2, impact: 5, level: 'high', mitigation: 'Vault Auto-Unseal via HSM/KMS; Unseal Keys mit Shamir-Secret-Sharing auf 3-of-5 aufteilen; Audit-Log für alle Zugriffe.', status: 'open' },
            { id: 'r-t7-18', threatId: 'th-t7-18', likelihood: 4, impact: 4, level: 'high', mitigation: 'Pre-commit Hook (gitleaks/truffleHog) blockt Commits mit erkannten Secrets; CI-Scan auf gesamten Git-History.', status: 'open' },
          ],
          measures: [
            { id: 'm-t7-3', title: 'gitleaks Pre-commit Hook', description: 'gitleaks als pre-commit Hook in alle Repositories; CI-Job scannt git log auf exponierte Secrets.', status: 'open', riskId: 'r-t7-18', owner: 'DevSecOps' },
          ],
        },
      },
    ],
    edges: [
      { id: 't7-e1', source: 't7-waf', target: 't7-apigw', label: 'HTTPS' },
      { id: 't7-e2', source: 't7-apigw', target: 't7-auth', label: 'Token Validation' },
      { id: 't7-e3', source: 't7-apigw', target: 't7-backend', label: 'REST (mTLS)' },
      { id: 't7-e4', source: 't7-backend', target: 't7-db', label: 'SQL / TLS' },
      { id: 't7-e5', source: 't7-backend', target: 't7-cache', label: 'Redis Protocol' },
      { id: 't7-e6', source: 't7-backend', target: 't7-secrets', label: 'Vault API' },
      { id: 't7-e7', source: 't7-auth', target: 't7-db', label: 'User Store' },
    ],
  },

  {
    id: 'cloud-microservices-kafka',
    name: 'Microservices + Event Bus',
    description: 'Event-driven Architektur: Producer-Service publiziert auf Kafka, Consumer-Services verarbeiten Events und schreiben in getrennte Datenbanken',
    category: 'cloud',
    nodes: [
      // ── Cloud Envelope ─────────────────────────────────────────────────────
      {
        id: 't8-cloud',
        type: 'boundary',
        position: { x: BASE_X - 120, y: BASE_Y - 90 },
        style: { width: 780, height: 830 },
        data: { label: 'Cloud Environment', boundaryType: 'cloud-zone' },
      },
      // ── Services Zone ──────────────────────────────────────────────────────
      {
        id: 't8-svc-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y - 30 },
        style: { width: 600, height: 180 },
        data: { label: 'Service-Schicht', boundaryType: 'logical-zone' },
      },
      {
        id: 't8-producer',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 40 },
        data: {
          label: 'Producer Service',
          componentType: 'application',
          version: 'Java 21 / Spring Boot 3',
          description: 'Nimmt eingehende API-Requests entgegen, validiert sie und publiziert Events auf Kafka-Topics. Implementiert das Outbox-Pattern für atomare Writes.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t8-1', name: 'Kafka Producer Credentials', category: 'operational', description: 'SASL/TLS-Credentials für Kafka-Verbindung – Leak ermöglicht unberechtigtes Publizieren beliebiger Events.' },
          ],
          threats: [
            { id: 'th-t8-1', name: 'Malformed Event Injection', stride: 'T', cweId: 'CWE-20', description: 'Angreifer sendet gezielt deformierte JSON-Events an den Producer; fehlerhafte Consumer-Deserialiserung führt zu unbehandelten Exceptions und Datenverlust.' },
            { id: 'th-t8-2', name: 'Event-Quelle nicht verifiziert', stride: 'S', cweId: 'CWE-290', description: 'Producer prüft keine kryptografische Signatur auf eingehende Requests; kompromittierter Upstream-Service kann beliebige Events einspeisen.' },
          ],
          risks: [
            { id: 'r-t8-1', threatId: 'th-t8-1', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Schema-Validierung mit Avro/Protobuf + Schema Registry; Dead-Letter-Queue für invalide Events.', status: 'open' },
            { id: 'r-t8-2', threatId: 'th-t8-2', likelihood: 2, impact: 4, level: 'medium', mitigation: 'HMAC-Signierung aller Events im Event-Header; Consumer validiert Signatur vor Verarbeitung.', status: 'open' },
          ],
        },
      },
      {
        id: 't8-consumer-a',
        type: 'software',
        position: { x: BASE_X + 230, y: BASE_Y + 40 },
        data: {
          label: 'Order Service (Consumer A)',
          componentType: 'application',
          version: 'Go 1.22',
          description: 'Konsumiert Bestellungs-Events vom Kafka-Topic, verarbeitet sie idempotent und persistiert in PostgreSQL.',
          threats: [
            { id: 'th-t8-3', name: 'Doppelt-Verarbeitung (fehlende Idempotenz)', stride: 'T', cweId: 'CWE-696', description: 'Consumer verarbeitet dasselbe Event mehrfach bei Kafka-Rebalancing ohne Idempotenz-Check; Bestellungen werden doppelt angelegt.' },
            { id: 'th-t8-4', name: 'Consumer-Group Offset Manipulation', stride: 'T', cweId: 'CWE-284', description: 'Angreifer mit Kafka-Admin-Rechten setzt Consumer-Group-Offset zurück; bereits verarbeitete Events werden erneut verarbeitet (Replay-Angriff).' },
          ],
          risks: [
            { id: 'r-t8-3', threatId: 'th-t8-3', likelihood: 3, impact: 4, level: 'high', mitigation: 'Idempotenz-Schlüssel (eventId) in DB-Index; INSERT ... ON CONFLICT DO NOTHING; Exactly-Once-Semantik mit Kafka Transactions.', status: 'open' },
            { id: 'r-t8-4', threatId: 'th-t8-4', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Kafka-ACL: Consumer-Groups dürfen nur eigene Offsets schreiben; Admin-Zugriff auf dedizierte Ops-Rolle beschränken.', status: 'open' },
          ],
        },
      },
      {
        id: 't8-consumer-b',
        type: 'software',
        position: { x: BASE_X + 440, y: BASE_Y + 40 },
        data: {
          label: 'Notification Service (Consumer B)',
          componentType: 'application',
          version: 'Python 3.12 / Celery',
          description: 'Konsumiert Events und versendet E-Mail/SMS-Benachrichtigungen über externe Provider (SendGrid, Twilio).',
          assets: [
            { id: 'a-t8-2', name: 'E-Mail/SMS-Provider API-Keys', category: 'operational', description: 'SendGrid/Twilio-Credentials – Leak führt zu Spam-Versand auf Kosten des Unternehmens und Reputation-Schaden.' },
          ],
          threats: [
            { id: 'th-t8-5', name: 'E-Mail-Template Injection', stride: 'T', cweId: 'CWE-94', description: 'Nutzerdaten aus dem Event werden unescaped in E-Mail-Templates eingefügt; Angreifer injiziert HTML/JS in Benachrichtigungs-E-Mails (Phishing-Vektor).' },
            { id: 'th-t8-6', name: 'Unbegrenzte Benachrichtigungs-Rate', stride: 'D', cweId: 'CWE-400', description: 'Kein Rate-Limiting: ein kompromittierter Upstream-Service produziert tausende Events → Notification Service versendet Massen-E-Mails → Provider-Sperre und Reputationsschaden.' },
          ],
          risks: [
            { id: 'r-t8-5', threatId: 'th-t8-5', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Template-Engine mit automatischem HTML-Escaping (Jinja2 autoescaping); Input-Sanitization vor Template-Rendering.', status: 'open' },
            { id: 'r-t8-6', threatId: 'th-t8-6', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Rate-Limit pro Nutzer: max. 10 E-Mails/Stunde; Celery-Task-Throttling; Alert ab 1000 Mails/Minute.', status: 'open' },
          ],
        },
      },

      // ── Event Bus ──────────────────────────────────────────────────────────
      {
        id: 't8-bus-zone',
        type: 'boundary',
        position: { x: BASE_X + 60, y: BASE_Y + 230 },
        style: { width: 380, height: 160 },
        data: { label: 'Event Bus', boundaryType: 'network-segment' },
      },
      {
        id: 't8-kafka',
        type: 'software',
        position: { x: BASE_X + 100, y: BASE_Y + 290 },
        data: {
          label: 'Kafka Cluster',
          componentType: 'network_service',
          version: 'Apache Kafka 3.7',
          description: 'Verteilter Event-Stream-Broker: persistiert Events für konfigurierbare Aufbewahrungsdauer, bietet Partitionierung und Consumer-Group-Semantik.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t8-3', name: 'Event-Stream (Topics)', category: 'operational', description: 'Alle Geschäfts-Events der Plattform – Verlust unterbricht alle nachgelagerten Services.' },
            { id: 'a-t8-4', name: 'Kafka ACL-Konfiguration', category: 'operational', description: 'Zugriffskontrolllisten pro Topic – Fehlkonfiguration exponiert sensitive Events an unberechtigte Consumer.' },
          ],
          threats: [
            { id: 'th-t8-7', name: 'Unverschlüsselter Kafka-Traffic (in-transit)', stride: 'I', cweId: 'CWE-319', description: 'Kafka-Broker und Clients kommunizieren ohne TLS im internen Netzwerk; Netzwerk-Sniffing gibt Angreifern Einblick in alle Geschäfts-Events.' },
            { id: 'th-t8-8', name: 'Unauthentifizierter Broker-Zugriff (PLAINTEXT)', stride: 'S', cweId: 'CWE-306', description: 'Kafka-Listener auf PLAINTEXT-Port ohne SASL-Authentifizierung zugänglich; jeder Service im VPC kann Topics lesen oder beschreiben.' },
            { id: 'th-t8-9', name: 'Log-Compaction Datenverlust', stride: 'D', cweId: 'CWE-400', description: 'Falsch konfigurierte Retention-Policy löscht Events vor Verarbeitung durch alle Consumer; Datenverlust in nachgelagerten Systemen.' },
          ],
          risks: [
            { id: 'r-t8-7', threatId: 'th-t8-7', likelihood: 2, impact: 4, level: 'medium', mitigation: 'TLS für alle Listener aktivieren (security.protocol=SSL); Zertifikate aus interner PKI ausstellen.', status: 'open' },
            { id: 'r-t8-8', threatId: 'th-t8-8', likelihood: 3, impact: 5, level: 'high', mitigation: 'SASL/SCRAM-SHA-256 oder mTLS für alle Clients; PLAINTEXT-Listener deaktivieren; ACL per Topic und Consumer-Group.', status: 'open' },
            { id: 'r-t8-9', threatId: 'th-t8-9', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Retention: min. 7 Tage oder bis Consumer-Lag=0; Monitoring auf Consumer-Lag-Alert; separate Compacted-Topics nur für State.', status: 'open' },
          ],
        },
      },
      {
        id: 't8-schema',
        type: 'software',
        position: { x: BASE_X + 320, y: BASE_Y + 290 },
        data: {
          label: 'Schema Registry',
          componentType: 'network_service',
          version: 'Confluent Schema Registry 7',
          description: 'Zentrale Verwaltung von Avro/Protobuf-Schemas. Enforced Schema-Kompatibilität verhindert Breaking Changes zwischen Producer und Consumer.',
          threats: [
            { id: 'th-t8-10', name: 'Breaking Schema-Änderung (Backward Incompat.)', stride: 'T', cweId: 'CWE-436', description: 'Entwickler publiziert inkompatibles Schema (z.B. Pflichtfeld hinzugefügt); alle bestehenden Consumer können Events nicht mehr deserialisieren → Ausfall.' },
          ],
          risks: [
            { id: 'r-t8-10', threatId: 'th-t8-10', likelihood: 3, impact: 4, level: 'high', mitigation: 'Compatibility-Mode=BACKWARD_TRANSITIVE im Schema Registry; Schema-Änderungen müssen CI-Kompatibilitätsprüfung bestehen.', status: 'open' },
          ],
        },
      },

      // ── Data Layer ─────────────────────────────────────────────────────────
      {
        id: 't8-data-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y + 470 },
        style: { width: 600, height: 160 },
        data: { label: 'Datenhaltung (Database-per-Service)', boundaryType: 'logical-zone' },
      },
      {
        id: 't8-db-orders',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 530 },
        data: {
          label: 'Orders DB (PostgreSQL)',
          componentType: 'network_service',
          version: 'PostgreSQL 16 / RDS',
          description: 'Dedizierte Datenbank des Order-Service. Nur dieser Service darf direkt auf die DB zugreifen (Database-per-Service-Muster).',
          threats: [
            { id: 'th-t8-11', name: 'Direkter DB-Zugriff durch anderen Service', stride: 'E', cweId: 'CWE-284', description: 'Anderer Microservice umgeht den Order-Service und greift direkt auf dessen Datenbank zu; Datenintegrität und Geschäftsregeln werden umgangen.' },
          ],
          risks: [
            { id: 'r-t8-11', threatId: 'th-t8-11', likelihood: 3, impact: 4, level: 'high', mitigation: 'Netzwerk-Policy: DB-Sicherheitsgruppe erlaubt nur Verbindungen vom Order-Service-Pod/Service-Account; kein gemeinsamer DB-User.', status: 'open' },
          ],
        },
      },
      {
        id: 't8-db-notify',
        type: 'software',
        position: { x: BASE_X + 250, y: BASE_Y + 530 },
        data: {
          label: 'Notification Log DB (MongoDB)',
          componentType: 'network_service',
          version: 'MongoDB 7 / Atlas',
          description: 'Speichert Benachrichtigungs-Audit-Log (wer hat wann welche Benachrichtigung erhalten). Nur Notification-Service hat Zugriff.',
          threats: [
            { id: 'th-t8-12', name: 'NoSQL-Injection in MongoDB-Query', stride: 'I', cweId: 'CWE-943', description: 'Unvalidierter Filter-Parameter ({$where: ...}) ermöglicht server-seitige JavaScript-Ausführung in MongoDB und Exfiltration aller Log-Einträge.' },
          ],
          risks: [
            { id: 'r-t8-12', threatId: 'th-t8-12', likelihood: 2, impact: 3, level: 'medium', mitigation: 'MongoDB-Operator-Allowlist; $where und $function serverseitig deaktivieren; Schema-Validierung auf Collection-Ebene.', status: 'open' },
          ],
        },
      },
      {
        id: 't8-datalake',
        type: 'software',
        position: { x: BASE_X + 450, y: BASE_Y + 530 },
        data: {
          label: 'Data Lake (S3 / Blob)',
          componentType: 'network_service',
          version: 'AWS S3 / Azure Blob',
          description: 'Langzeit-Archivierung aller Events als Parquet-Files für Analytics und Compliance (7-Jahres-Aufbewahrung).',
          assets: [
            { id: 'a-t8-5', name: 'Archivierte Geschäfts-Events', category: 'financial', description: 'Historische Event-Daten für Compliance und Auditing – Löschung verletzt gesetzliche Aufbewahrungspflichten.' },
          ],
          threats: [
            { id: 'th-t8-13', name: 'Öffentlich zugänglicher S3-Bucket', stride: 'I', cweId: 'CWE-284', description: 'Fehlkonfiguration macht S3-Bucket öffentlich lesbar; alle archivierten Geschäfts-Events sind für jedermann abrufbar.' },
          ],
          risks: [
            { id: 'r-t8-13', threatId: 'th-t8-13', likelihood: 3, impact: 5, level: 'high', mitigation: 'Block Public Access auf Account-Ebene aktivieren; S3-Bucket-Policy explizit deny für * Principal; AWS Config Rule für Public Bucket Alert.', status: 'open' },
          ],
          measures: [
            { id: 'm-t8-1', title: 'S3 Block Public Access (Account)', description: 'AWS S3 Block Public Access auf Account-Ebene aktivieren verhindert versehentlich öffentliche Buckets.', status: 'open', riskId: 'r-t8-13', owner: 'Cloud Team' },
          ],
        },
      },
    ],
    edges: [
      { id: 't8-e1', source: 't8-producer', target: 't8-kafka', label: 'Publish (SASL/TLS)' },
      { id: 't8-e2', source: 't8-producer', target: 't8-schema', label: 'Schema Check' },
      { id: 't8-e3', source: 't8-kafka', target: 't8-consumer-a', label: 'Subscribe' },
      { id: 't8-e4', source: 't8-kafka', target: 't8-consumer-b', label: 'Subscribe' },
      { id: 't8-e5', source: 't8-consumer-a', target: 't8-db-orders', label: 'SQL / TLS' },
      { id: 't8-e6', source: 't8-consumer-b', target: 't8-db-notify', label: 'MongoDB TLS' },
      { id: 't8-e7', source: 't8-kafka', target: 't8-datalake', label: 'S3 Sink Connector' },
    ],
  },

  {
    id: 'cloud-kubernetes',
    name: 'Kubernetes Platform',
    description: 'Container-Plattform: Ingress → Service Mesh → Workload-Pods mit Secrets, Container Registry und zentralem Monitoring',
    category: 'cloud',
    nodes: [
      // ── Cloud Envelope ─────────────────────────────────────────────────────
      {
        id: 't9-cloud',
        type: 'boundary',
        position: { x: BASE_X - 120, y: BASE_Y - 90 },
        style: { width: 700, height: 820 },
        data: { label: 'Kubernetes Cluster (Cloud)', boundaryType: 'cloud-zone' },
      },
      // ── Ingress ────────────────────────────────────────────────────────────
      {
        id: 't9-ingress-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y - 30 },
        style: { width: 520, height: 160 },
        data: { label: 'Ingress-Schicht', boundaryType: 'network-segment' },
      },
      {
        id: 't9-ingress',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 30 },
        data: {
          label: 'Ingress Controller',
          componentType: 'network_service',
          version: 'NGINX Ingress / Traefik 3',
          description: 'Kubernetes Ingress Controller: TLS-Terminierung, Host/Path-basiertes Routing zu Services, Rate-Limiting und CORS-Policy.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t9-1', name: 'TLS-Zertifikate (Let\'s Encrypt / cert-manager)', category: 'operational', description: 'Wildcard-Zertifikat für alle Subdomains – Private Key Leak ermöglicht MitM aller verschlüsselten Verbindungen.' },
            { id: 'a-t9-2', name: 'Ingress-Routing-Regeln', category: 'operational', description: 'Host/Path-zu-Service-Zuordnung – Manipulation leitet Traffic auf falsche Backends.' },
          ],
          threats: [
            { id: 'th-t9-1', name: 'Ingress Annotation Injection', stride: 'E', cweId: 'CWE-94', description: 'Angreifer mit Namespace-Rechten setzt bösartige nginx.ingress.kubernetes.io/-Annotationen die Ingress-Konfiguration überschreiben und Auth umgehen.' },
            { id: 'th-t9-2', name: 'TLS-Zertifikat Ablauf (Outage)', stride: 'D', cweId: 'CWE-400', description: 'cert-manager erneuert Zertifikat nicht rechtzeitig (z.B. DNS-Challenge-Fehler); abgelaufenes Zertifikat macht alle HTTPS-Endpunkte unzugänglich.' },
            { id: 'th-t9-3', name: 'HTTP/2 Rapid Reset DDoS', stride: 'D', cweId: 'CWE-400', description: 'CVE-2023-44487: Angreifer öffnet und resettet HTTP/2-Streams in Millionen/Sekunde und überfordert den Ingress-Worker-Pool.' },
          ],
          risks: [
            { id: 'r-t9-1', threatId: 'th-t9-1', likelihood: 2, impact: 5, level: 'high', mitigation: 'RBAC: nur Plattform-Team darf Ingress-Objekte in produktiven Namespaces schreiben; OPA/Gatekeeper Policy blockt gefährliche Annotationen.', status: 'open' },
            { id: 'r-t9-2', threatId: 'th-t9-2', likelihood: 3, impact: 4, level: 'high', mitigation: 'cert-manager mit 30-Tage-Erneuerungsfenster; Alert bei Certificate-Expiry <14 Tage; Runbook für manuelle Erneuerung.', status: 'in-progress' },
            { id: 'r-t9-3', threatId: 'th-t9-3', likelihood: 3, impact: 4, level: 'high', mitigation: 'NGINX-Patch auf aktuelle Version (HTTP/2 Rapid Reset Fix); max_concurrent_streams begrenzen; WAF vorschalten.', status: 'open' },
          ],
        },
      },
      {
        id: 't9-mesh',
        type: 'software',
        position: { x: BASE_X + 300, y: BASE_Y + 30 },
        data: {
          label: 'Service Mesh (mTLS)',
          componentType: 'network_service',
          version: 'Istio 1.22 / Linkerd 2',
          description: 'Service Mesh erzwingt mTLS zwischen allen Pods, implementiert Circuit-Breaking, Retry-Policies und Distributed Tracing ohne Änderung am Applikations-Code.',
          threats: [
            { id: 'th-t9-4', name: 'Sidecar-Bypass (HostNetwork / privilegierter Pod)', stride: 'E', cweId: 'CWE-284', description: 'Pod mit hostNetwork:true oder privileged:true umgeht den Istio-Envoy-Sidecar; Traffik fließt unverschlüsselt und unauthentifiziert am Mesh vorbei.' },
            { id: 'th-t9-5', name: 'Istio Control Plane Kompromittierung', stride: 'T', cweId: 'CWE-269', description: 'Istiod-Prozess wird kompromittiert; Angreifer kann mTLS-Zertifikate für beliebige Services ausstellen und MITM-Angriffe auf Mesh-Traffic durchführen.' },
          ],
          risks: [
            { id: 'r-t9-4', threatId: 'th-t9-4', likelihood: 2, impact: 5, level: 'high', mitigation: 'OPA/Gatekeeper Policy: hostNetwork:true und privileged:true in Produktions-Namespaces verboten; PeerAuthentication auf STRICT setzen.', status: 'open' },
            { id: 'r-t9-5', threatId: 'th-t9-5', likelihood: 1, impact: 5, level: 'high', mitigation: 'Istiod im separaten Namespace mit minimalen RBAC-Rechten; Network-Policy isoliert Control Plane; regelmäßige Upgrades auf aktuelle Version.', status: 'open' },
          ],
        },
      },

      // ── Cluster / Workloads ────────────────────────────────────────────────
      {
        id: 't9-cluster-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y + 210 },
        style: { width: 520, height: 200 },
        data: { label: 'Workload-Namespace (prod)', boundaryType: 'logical-zone' },
      },
      {
        id: 't9-pod-a',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 280 },
        data: {
          label: 'API Pod (Deployment)',
          componentType: 'application',
          version: 'Docker Image: api:v1.4.2',
          description: 'Kubernetes-Deployment mit 3 Replicas. Läuft als non-root User, read-only Filesystem, alle Capabilities dropped.',
          assets: [
            { id: 'a-t9-3', name: 'Container Image (Lieferkette)', category: 'operational', description: 'Base-Image und Abhängigkeiten – kompromittiertes Base-Image in der Registry infiziert alle deployten Pods (Supply-Chain-Angriff).' },
          ],
          threats: [
            { id: 'th-t9-6', name: 'Container Breakout via privilegierter Prozess', stride: 'E', cweId: 'CWE-269', description: 'Verwundbare Containeranwendung kombiniert mit gefährlichen Security-Context-Einstellungen (SYS_ADMIN) ermöglicht Ausbruch auf den K8s-Node.' },
            { id: 'th-t9-7', name: 'Supply-Chain: Kompromittiertes Base-Image', stride: 'T', cweId: 'CWE-494', description: 'Angreifer kompromittiert eine Abhängigkeit in der Container-Image-Build-Pipeline; alle Deployments erhalten Backdoor-Code.' },
          ],
          risks: [
            { id: 'r-t9-6', threatId: 'th-t9-6', likelihood: 2, impact: 5, level: 'high', mitigation: 'SecurityContext: runAsNonRoot, readOnlyRootFilesystem, allowPrivilegeEscalation:false, capabilities.drop=ALL; Seccomp-Profil "RuntimeDefault".', status: 'in-progress' },
            { id: 'r-t9-7', threatId: 'th-t9-7', likelihood: 2, impact: 5, level: 'high', mitigation: 'Image-Signierung mit Sigstore/Cosign; Admission Controller (Connaisseur/Kyverno) blockt unsignierte Images; Trivy-Scan in CI.', status: 'open' },
          ],
          measures: [
            { id: 'm-t9-1', title: 'Cosign Image Signing in CI', description: 'GitHub Actions signiert jedes Image mit Cosign (keyless via OIDC); Kyverno-Policy erzwingt Signatur-Check vor Deployment.', status: 'open', riskId: 'r-t9-7', owner: 'DevSecOps' },
          ],
        },
      },
      {
        id: 't9-secrets-k8s',
        type: 'software',
        position: { x: BASE_X + 230, y: BASE_Y + 280 },
        data: {
          label: 'K8s Secrets / Vault Agent',
          componentType: 'application',
          version: 'External Secrets Operator 0.9',
          description: 'Secrets werden über External-Secrets-Operator aus Vault/AWS Secrets Manager in K8s Secrets gemountet. ETCD-Verschlüsselung aktiviert.',
          assets: [
            { id: 'a-t9-4', name: 'ETCD-Encryption-Key', category: 'operational', description: 'K8s-ETCD speichert Secrets verschlüsselt – KMS-Provider-Key-Kompromittierung entschlüsselt alle Cluster-Secrets.' },
          ],
          threats: [
            { id: 'th-t9-8', name: 'K8s Secret im Klartext in ETCD', stride: 'I', cweId: 'CWE-312', description: 'ETCD-Verschlüsselung (EncryptionConfiguration) nicht aktiviert; kubectl get secret -oyaml liefert base64-decodierbare Klartext-Credentials.' },
            { id: 'th-t9-9', name: 'Secret-Wert in Container-Log', stride: 'I', cweId: 'CWE-312', description: 'Applikation loggt Error-Stack-Trace mit Umgebungsvariablen; Secret-Werte erscheinen im zentralen Log-System und sind für alle Log-Leser sichtbar.' },
          ],
          risks: [
            { id: 'r-t9-8', threatId: 'th-t9-8', likelihood: 3, impact: 5, level: 'high', mitigation: 'EncryptionConfiguration mit AWS KMS / GCP CMEK für ETCD aktivieren; regelmäßige Key-Rotation; ETCD-Zugriff nur für Control-Plane.', status: 'open' },
            { id: 'r-t9-9', threatId: 'th-t9-9', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Secret-Werte nie in Env-Vars die geloggt werden könnten; Log-Scrubbing-Filter in Logging-Bibliothek; Log-Level WARN in Produktion.', status: 'open' },
          ],
        },
      },
      {
        id: 't9-hpa',
        type: 'software',
        position: { x: BASE_X + 395, y: BASE_Y + 280 },
        data: {
          label: 'HPA / KEDA',
          componentType: 'application',
          version: 'Kubernetes HPA / KEDA 2',
          description: 'Horizontal Pod Autoscaler skaliert Deployments basierend auf CPU/Memory oder benutzerdefinierten Metriken (Kafka Consumer Lag via KEDA).',
          threats: [
            { id: 'th-t9-10', name: 'Autoscaling-Manipulation (Metrik-Spoofing)', stride: 'T', cweId: 'CWE-20', description: 'Angreifer manipuliert benutzerdefinierte Metriken-Quelle; HPA skaliert auf 0 Replicas und macht den Service nicht verfügbar (DoS) oder auf Maximum (Kostentreiber).' },
          ],
          risks: [
            { id: 'r-t9-10', threatId: 'th-t9-10', likelihood: 2, impact: 3, level: 'medium', mitigation: 'Metriken-Endpunkte mit Authentifizierung absichern; MinReplicas auf mindestens 2 setzen; Budget-Alert bei ungewöhnlichem Skalierungsverhalten.', status: 'open' },
          ],
        },
      },

      // ── Supporting Infrastructure ──────────────────────────────────────────
      {
        id: 't9-registry',
        type: 'software',
        position: { x: BASE_X - 50, y: BASE_Y + 490 },
        data: {
          label: 'Container Registry',
          componentType: 'network_service',
          version: 'AWS ECR / Harbor 2',
          description: 'Private Container Registry mit Image-Scanning und Signatur-Verifikation. Nur CI/CD-Pipeline hat Push-Rechte; Cluster hat Pull-Only-Zugriff.',
          threats: [
            { id: 'th-t9-11', name: 'Registry Push von unauthorisiertem System', stride: 'S', cweId: 'CWE-284', description: 'Registry-Push-Credentials werden aus CI/CD-System gestohlen; Angreifer überschreibt produktives Image mit Backdoor-Version.' },
          ],
          risks: [
            { id: 'r-t9-11', threatId: 'th-t9-11', likelihood: 2, impact: 5, level: 'high', mitigation: 'Push-Credentials nur über kurzlebige OIDC-Tokens aus CI/CD (GitHub Actions OIDC); keine langlebigen Push-Credentials.', status: 'open' },
          ],
        },
      },
      {
        id: 't9-monitoring',
        type: 'software',
        position: { x: BASE_X + 230, y: BASE_Y + 490 },
        data: {
          label: 'Monitoring / SIEM',
          componentType: 'application',
          version: 'Prometheus + Grafana / Falco',
          description: 'Zentrales Monitoring: Prometheus scraped Metriken, Falco erkennt Laufzeit-Anomalien (Container Escape-Versuche, ungewöhnliche Syscalls), Alerts in PagerDuty.',
          assets: [
            { id: 'a-t9-5', name: 'Audit-Logs (K8s API-Server)', category: 'operational', description: 'Kubernetes API-Server Audit-Logs dokumentieren alle Cluster-Operationen – Löschung verhindert Incident-Forensik.' },
          ],
          threats: [
            { id: 'th-t9-12', name: 'Log-Tampering / Log-Löschung', stride: 'R', cweId: 'CWE-778', description: 'Angreifer mit Cluster-Admin-Rechten löscht Kubernetes-Audit-Logs und Pod-Logs um Spuren eines Angriffs zu verwischen.' },
            { id: 'th-t9-13', name: 'Prometheus-Metrik-Exposition (Information Leak)', stride: 'I', cweId: 'CWE-200', description: '/metrics-Endpunkt ohne Authentifizierung gibt detaillierte Systeminformationen (Versionen, interne IPs, Request-Patterns) preis.' },
          ],
          risks: [
            { id: 'r-t9-12', threatId: 'th-t9-12', likelihood: 1, impact: 5, level: 'high', mitigation: 'Audit-Logs sofort in externes, append-only Log-Storage streamen (S3 Object Lock / Splunk); Falco-Alert bei kubectl delete pod/log.', status: 'open' },
            { id: 'r-t9-13', threatId: 'th-t9-13', likelihood: 3, impact: 3, level: 'medium', mitigation: 'NetworkPolicy blockiert externen Zugriff auf Port 9090/9100; Prometheus-Scraping nur aus Monitoring-Namespace; optional: Bearer-Token-Auth.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't9-e1', source: 't9-ingress', target: 't9-mesh', label: 'HTTPS → mTLS' },
      { id: 't9-e2', source: 't9-mesh', target: 't9-pod-a', label: 'mTLS' },
      { id: 't9-e3', source: 't9-pod-a', target: 't9-secrets-k8s', label: 'Secret Mount' },
      { id: 't9-e4', source: 't9-pod-a', target: 't9-hpa' },
      { id: 't9-e5', source: 't9-registry', target: 't9-pod-a', label: 'Image Pull' },
      { id: 't9-e6', source: 't9-pod-a', target: 't9-monitoring', label: 'Metrics / Logs' },
      { id: 't9-e7', source: 't9-ingress', target: 't9-monitoring', label: 'Access Logs' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OWASP JUICE SHOP - bewusst verwundbare Web-Anwendung (OWASP Top 10 Demo)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'owasp-juice-shop',
    name: 'OWASP Juice Shop',
    description: 'TARA für die bewusst verwundbare OWASP Juice Shop (Angular SPA + Node.js/Express REST-API + SQLite/MongoDB). Bildet die OWASP Top 10 als konkrete Bedrohungen, Risiken und Gegenmaßnahmen ab.',
    category: 'cloud',
    nodes: [
      // ── Client Zone ─────────────────────────────────────────────────────────
      {
        id: 't10-client-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y - 30 },
        style: { width: 560, height: 150 },
        data: { label: 'Client Zone (Browser)', boundaryType: 'trust-zone' },
      },
      {
        id: 't10-spa',
        type: 'software',
        position: { x: BASE_X + 170, y: BASE_Y + 25 },
        data: {
          label: 'Angular SPA Frontend',
          componentType: 'application',
          version: 'Angular 17 (Single Page App)',
          description: 'Im Browser laufende Single-Page-Application. Rendert Produktsuche, Warenkorb, Login und Bewertungen; spricht ausschließlich die REST-API über HTTPS an. JWT wird clientseitig gehalten.',
          assets: [
            { id: 'a-t10-1', name: 'JWT im Browser-Storage', category: 'privacy', description: 'Access-Token wird in localStorage abgelegt – per XSS auslesbar und ermöglicht Session-Übernahme.' },
            { id: 'a-t10-2', name: 'Kundeneingaben (Suche, Bewertungen)', category: 'operational', description: 'Frei eingebbare Felder (Produktsuche, Kommentare) – primärer Injektionsvektor in der gesamten Anwendung.' },
          ],
          threats: [
            { id: 'th-t10-1', name: 'DOM-/Reflected XSS in Produktsuche', stride: 'I', cweId: 'CWE-79', description: 'Der Suchparameter q wird ungefiltert ins DOM geschrieben; <iframe src="javascript:..."> oder <img onerror> führt beliebiges JavaScript im Browser des Opfers aus.' },
            { id: 'th-t10-2', name: 'Stored XSS über Produktbewertung', stride: 'I', cweId: 'CWE-79', description: 'Gespeicherte Bewertungen werden ohne Output-Encoding gerendert; eingeschleustes Skript wird bei jedem Aufruf der Produktseite ausgeführt.' },
            { id: 'th-t10-3', name: 'Token-Diebstahl aus localStorage', stride: 'S', cweId: 'CWE-522', description: 'Da das JWT in localStorage statt in einem HttpOnly-Cookie liegt, exfiltriert jeder erfolgreiche XSS das Token und übernimmt die Sitzung.' },
          ],
          risks: [
            { id: 'r-t10-1', threatId: 'th-t10-1', likelihood: 4, impact: 4, level: 'high', mitigation: 'Output-Encoding/Sanitizing (Angular DomSanitizer korrekt nutzen, kein bypassSecurityTrust); strikte Content-Security-Policy ohne unsafe-inline.', status: 'open' },
            { id: 'r-t10-2', threatId: 'th-t10-2', likelihood: 4, impact: 4, level: 'high', mitigation: 'Server- und clientseitiges HTML-Escaping aller benutzergenerierten Inhalte; CSP mit nonce-basierten Skripten.', status: 'open' },
            { id: 'r-t10-3', threatId: 'th-t10-3', likelihood: 3, impact: 5, level: 'high', mitigation: 'JWT in HttpOnly+SameSite-Cookie statt localStorage; kurze Token-TTL; XSS an der Wurzel beheben.', status: 'open' },
          ],
          measures: [
            { id: 'm-t10-1', title: 'Content-Security-Policy einführen', description: 'Strikte CSP (default-src self, kein unsafe-inline) als HTTP-Header setzen, um XSS-Auswirkungen zu begrenzen.', status: 'open', riskId: 'r-t10-1', owner: 'Frontend Team' },
          ],
          securityTests: [
            { id: 's-t10-1', title: 'Reflected XSS im Suchfeld', targetComponent: 'Angular SPA Frontend', precondition: 'Anwendung erreichbar, keine Authentifizierung nötig.', testSteps: ['Suchparameter aufrufen: /#/search?q=<iframe src="javascript:alert(`xss`)">', 'Beobachten ob das Skript im Browser ausgeführt wird'], expectedResult: 'Eingabe wird encodiert dargestellt, kein Skript-Ausführung (Test besteht, wenn KEIN Alert erscheint).', status: 'untested', threatId: 'th-t10-1', source: 'manual' },
          ],
        },
      },

      // ── Application / Server Zone ─────────────────────────────────────────────
      {
        id: 't10-app-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y + 150 },
        style: { width: 560, height: 200 },
        data: { label: 'Application Server (Node.js)', boundaryType: 'logical-zone' },
      },
      {
        id: 't10-api',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 225 },
        data: {
          label: 'Express REST API',
          componentType: 'application',
          version: 'Node.js 20 / Express 4',
          description: 'Zentrale Geschäftslogik: Produkte, Warenkorb, Bestellungen, Gutscheine, Feedback. Setzt Autorisierung pro Endpunkt durch und greift auf SQLite und MongoDB zu.',
          securityLevel: 'SL-2',
          assets: [
            { id: 'a-t10-3', name: 'Warenkorb- & Bestelldaten', category: 'financial', description: 'Warenkörbe und Bestellungen aller Kunden – fehlerhafte Autorisierung ermöglicht Einblick und Manipulation fremder Bestellungen.' },
            { id: 'a-t10-4', name: 'Rabatt-/Gutschein-Logik', category: 'financial', description: 'Gutschein- und Preisberechnung – Umgehung führt zu unberechtigten Rabatten und finanziellem Schaden.' },
          ],
          threats: [
            { id: 'th-t10-4', name: 'IDOR auf fremde Warenkörbe', stride: 'E', cweId: 'CWE-639', description: 'GET /rest/basket/{id} prüft nicht, ob der Warenkorb dem Token-Inhaber gehört; durch Hochzählen der ID werden fremde Warenkörbe gelesen und verändert (BOLA).' },
            { id: 'th-t10-5', name: 'Massenzuweisung / verstecktes Feld', stride: 'T', cweId: 'CWE-915', description: 'Registrierungs-/Update-Endpunkt übernimmt ungefiltert alle JSON-Felder; durch Mitsenden von "role":"admin" eskaliert ein normaler Nutzer zum Administrator.' },
            { id: 'th-t10-6', name: 'Gutschein-Fälschung (Business Logic)', stride: 'T', cweId: 'CWE-840', description: 'Clientseitig generierte Rabattcodes werden serverseitig nicht kryptografisch validiert; Angreifer leiten gültige Codes ab und erhalten beliebige Rabatte.' },
            { id: 'th-t10-7', name: 'Fehlerhafte Fehlerbehandlung (Info Leak)', stride: 'I', cweId: 'CWE-209', description: 'Unbehandelte Exceptions liefern vollständige Stacktraces inkl. Dateipfaden, SQL-Statements und Bibliotheksversionen an den Client.' },
            { id: 'th-t10-8', name: 'Verwundbare Abhängigkeiten (npm)', stride: 'E', cweId: 'CWE-1035', description: 'Veraltete npm-Pakete mit bekannten CVEs (z.B. Prototype Pollution, RCE) sind in Produktion eingebunden und ausnutzbar.' },
          ],
          risks: [
            { id: 'r-t10-4', threatId: 'th-t10-4', likelihood: 4, impact: 4, level: 'high', mitigation: 'Objekt-Level-Autorisierung: jeder Query mit ownerId-Filter (WHERE userId = :tokenUserId); automatisierter IDOR-Test in CI.', status: 'open' },
            { id: 'r-t10-5', threatId: 'th-t10-5', likelihood: 3, impact: 5, level: 'high', mitigation: 'Explizites Allowlisting erlaubter Felder pro DTO (Zod/Joi); role-Feld serverseitig niemals aus Request übernehmen.', status: 'open' },
            { id: 'r-t10-6', threatId: 'th-t10-6', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Gutscheine serverseitig signiert (HMAC) erzeugen und validieren; Einlösung an Server-State binden, einmalige Nutzung erzwingen.', status: 'open' },
            { id: 'r-t10-7', threatId: 'th-t10-7', likelihood: 4, impact: 2, level: 'medium', mitigation: 'Globaler Error-Handler liefert generische Meldungen; detaillierte Fehler nur ins serverseitige Log; NODE_ENV=production.', status: 'open' },
            { id: 'r-t10-8', threatId: 'th-t10-8', likelihood: 4, impact: 4, level: 'high', mitigation: 'npm audit / Dependabot / Trivy in CI; SBOM erzeugen und gegen Vulnerability-DB prüfen; regelmäßige Updates.', status: 'open' },
          ],
          measures: [
            { id: 'm-t10-2', title: 'Objekt-Level-Autorisierung erzwingen', description: 'Middleware prüft bei jedem Zugriff auf Warenkorb/Bestellung, ob die Ressource dem Token-Nutzer gehört; sonst 403.', status: 'open', riskId: 'r-t10-4', owner: 'Backend Team' },
            { id: 'm-t10-3', title: 'SBOM + Dependency-Scan in CI', description: 'Bei jedem Build CycloneDX-SBOM erzeugen und gegen OSV/NVD prüfen; Build bricht bei Critical-CVE ab.', status: 'open', riskId: 'r-t10-8', owner: 'DevSecOps' },
          ],
          securityTests: [
            { id: 's-t10-2', title: 'IDOR auf fremden Warenkorb', targetComponent: 'Express REST API', precondition: 'Zwei Nutzerkonten A und B mit je eigenem Warenkorb angelegt.', testSteps: ['Als Nutzer A einloggen, eigene basketId notieren', 'GET /rest/basket/{basketId von B} mit Token von A aufrufen'], expectedResult: 'Antwort 401/403 – kein Zugriff auf Warenkorb von B.', status: 'untested', threatId: 'th-t10-4', source: 'manual' },
          ],
        },
      },
      {
        id: 't10-auth',
        type: 'software',
        position: { x: BASE_X + 195, y: BASE_Y + 225 },
        data: {
          label: 'Auth / Login Service',
          componentType: 'application',
          version: 'JWT (RS256) + bcrypt',
          description: 'Authentifizierung und Token-Ausstellung. Validiert Login, stellt JWTs aus, verwaltet Passwort-Reset und Account-Verwaltung.',
          securityLevel: 'SL-3',
          assets: [
            { id: 'a-t10-5', name: 'Passwort-Hashes', category: 'privacy', description: 'Gespeicherte Nutzer-Passwörter – schwaches Hashing (MD5) ermöglicht schnelles Offline-Cracking.' },
            { id: 'a-t10-6', name: 'JWT-Signaturschlüssel', category: 'operational', description: 'Schlüsselmaterial zur Token-Signatur – Offenlegung erlaubt Fälschung beliebiger Identitäten inkl. Admin.' },
          ],
          threats: [
            { id: 'th-t10-9', name: 'SQL-Injection im Login (Auth-Bypass)', stride: 'S', cweId: 'CWE-89', description: 'Login-Query wird per String-Konkatenation gebaut; Eingabe \' OR 1=1-- umgeht die Authentifizierung und meldet als erster Nutzer (Admin) an.' },
            { id: 'th-t10-10', name: 'JWT-Forgery (alg=none / schwacher Key)', stride: 'S', cweId: 'CWE-347', description: 'Server akzeptiert Tokens mit alg=none oder schwach/öffentlich bekanntem Signaturschlüssel; Angreifer fälschen Admin-Tokens.' },
            { id: 'th-t10-11', name: 'Schwaches Passwort-Hashing', stride: 'I', cweId: 'CWE-916', description: 'Passwörter mit ungesalzenem MD5 gespeichert; bei DB-Leak sind nahezu alle Passwörter binnen Minuten rekonstruierbar.' },
            { id: 'th-t10-12', name: 'Credential Stuffing / Brute Force', stride: 'S', cweId: 'CWE-307', description: 'Kein Rate-Limiting/Lockout am Login-Endpunkt; automatisierte Passwort-Listen werden ungebremst durchprobiert.' },
          ],
          risks: [
            { id: 'r-t10-9', threatId: 'th-t10-9', likelihood: 4, impact: 5, level: 'critical', mitigation: 'Ausschließlich parametrisierte Queries/ORM; niemals Eingaben in SQL konkatenieren; WAF als zweite Schicht.', status: 'open' },
            { id: 'r-t10-10', threatId: 'th-t10-10', likelihood: 3, impact: 5, level: 'high', mitigation: 'Algorithmus serverseitig auf RS256 fixieren, alg=none ablehnen; Signaturschlüssel als Secret verwalten und rotieren.', status: 'open' },
            { id: 'r-t10-11', threatId: 'th-t10-11', likelihood: 3, impact: 4, level: 'high', mitigation: 'bcrypt/argon2id mit individuellem Salt; bestehende MD5-Hashes bei nächstem Login migrieren.', status: 'open' },
            { id: 'r-t10-12', threatId: 'th-t10-12', likelihood: 4, impact: 3, level: 'high', mitigation: 'Account-Lockout nach 5 Fehlversuchen; IP-Rate-Limiting; optional CAPTCHA; Breached-Password-Check.', status: 'open' },
          ],
          measures: [
            { id: 'm-t10-4', title: 'Parametrisierte Login-Query', description: 'Login-Statement auf Prepared Statement / ORM-Binding umstellen, um Auth-Bypass per SQLi zu verhindern.', status: 'open', riskId: 'r-t10-9', owner: 'Backend Team' },
            { id: 'm-t10-5', title: 'JWT-Algorithmus fixieren', description: 'Token-Verifikation auf RS256 festnageln; alg=none und HS256 ablehnen.', status: 'open', riskId: 'r-t10-10', owner: 'Backend Team' },
          ],
          securityTests: [
            { id: 's-t10-3', title: 'SQLi-Login-Bypass', targetComponent: 'Auth / Login Service', precondition: 'Login-Formular erreichbar.', testSteps: ["E-Mail-Feld: ' OR 1=1--", 'Beliebiges Passwort eingeben und absenden'], expectedResult: 'Login schlägt fehl (401); kein Auth-Bypass möglich.', status: 'untested', threatId: 'th-t10-9', source: 'manual' },
          ],
        },
      },
      {
        id: 't10-upload',
        type: 'software',
        position: { x: BASE_X + 385, y: BASE_Y + 225 },
        data: {
          label: 'File Upload / Profil',
          componentType: 'application',
          version: 'Multer + libxml',
          description: 'Verarbeitet Datei-Uploads (Profilbild, Beschwerde-Anhänge, B2B-XML-Bestellungen) und Profil-URLs. Speichert Dateien serverseitig ab.',
          assets: [
            { id: 'a-t10-7', name: 'Hochgeladene Dateien', category: 'operational', description: 'Vom Nutzer gelieferte Dateien – unkontrollierter Pfad/Typ ermöglicht Überschreiben von Server-Dateien.' },
          ],
          threats: [
            { id: 'th-t10-13', name: 'XXE über XML-Upload', stride: 'I', cweId: 'CWE-611', description: 'B2B-XML-Bestellungen werden mit aktivierten externen Entitäten geparst; <!ENTITY xxe SYSTEM "file:///etc/passwd"> liest lokale Dateien aus.' },
            { id: 'th-t10-14', name: 'Path Traversal beim Upload', stride: 'T', cweId: 'CWE-22', description: 'Dateiname wird nicht normalisiert; ../../-Sequenzen erlauben Schreiben außerhalb des Upload-Verzeichnisses.' },
            { id: 'th-t10-15', name: 'SSRF über Profil-Bild-URL', stride: 'I', cweId: 'CWE-918', description: 'Server lädt eine vom Nutzer angegebene Bild-URL serverseitig; Angreifer adressiert interne Dienste oder die Cloud-Metadaten-API (169.254.169.254).' },
          ],
          risks: [
            { id: 'r-t10-13', threatId: 'th-t10-13', likelihood: 3, impact: 4, level: 'high', mitigation: 'XML-Parser mit deaktivierten externen Entitäten/DTDs (noent=false, nonet); wo möglich JSON statt XML.', status: 'open' },
            { id: 'r-t10-14', threatId: 'th-t10-14', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Dateinamen serverseitig neu generieren (UUID); Zielpfad gegen Upload-Wurzel kanonisieren; Typ-Whitelist.', status: 'open' },
            { id: 'r-t10-15', threatId: 'th-t10-15', likelihood: 3, impact: 4, level: 'high', mitigation: 'URL-Allowlist für Outbound-Requests; IANA-Privatbereiche und Metadaten-IP blockieren; IMDSv2 erzwingen.', status: 'open' },
          ],
          measures: [
            { id: 'm-t10-6', title: 'XML-Parser absichern', description: 'libxml mit deaktivierten externen Entitäten und Netzwerkzugriff konfigurieren, um XXE zu verhindern.', status: 'open', riskId: 'r-t10-13', owner: 'Backend Team' },
          ],
        },
      },

      // ── Data Zone ─────────────────────────────────────────────────────────────
      {
        id: 't10-data-zone',
        type: 'boundary',
        position: { x: BASE_X - 60, y: BASE_Y + 380 },
        style: { width: 560, height: 180 },
        data: { label: 'Datenhaltung & Static Files', boundaryType: 'logical-zone' },
      },
      {
        id: 't10-sqlite',
        type: 'software',
        position: { x: BASE_X, y: BASE_Y + 450 },
        data: {
          label: 'SQLite Datenbank',
          componentType: 'network_service',
          version: 'SQLite 3 (Sequelize ORM)',
          description: 'Relationale Hauptdatenbank: Nutzer, Produkte, Warenkörbe, Bestellungen, Gutscheine. Wird von der REST-API und dem Auth-Service angesprochen.',
          assets: [
            { id: 'a-t10-8', name: 'Nutzerkonten (PII)', category: 'privacy', description: 'E-Mail, Name, Passwort-Hash aller Kunden – DSGVO-Meldepflicht bei Verlust.' },
            { id: 'a-t10-9', name: 'Bestell- & Zahlungsdaten', category: 'financial', description: 'Bestellhistorie und hinterlegte Zahlungsmittel – wirtschaftlich und rechtlich sensibel.' },
          ],
          threats: [
            { id: 'th-t10-16', name: 'UNION-basierte SQL-Injection', stride: 'I', cweId: 'CWE-89', description: 'Such-/Filterendpunkte bauen dynamisches SQL; UNION-SELECT exfiltriert die komplette Nutzer-Tabelle inkl. Passwort-Hashes.' },
            { id: 'th-t10-17', name: 'Datenbank-Datei frei zugänglich', stride: 'I', cweId: 'CWE-200', description: 'Die SQLite-Datei liegt im über /ftp erreichbaren Verzeichnis und kann komplett heruntergeladen werden.' },
          ],
          risks: [
            { id: 'r-t10-16', threatId: 'th-t10-16', likelihood: 4, impact: 5, level: 'critical', mitigation: 'Ausschließlich parametrisierte Queries über Sequelize-Binding; kein String-Building; Least-Privilege-DB-User.', status: 'open' },
            { id: 'r-t10-17', threatId: 'th-t10-17', likelihood: 3, impact: 5, level: 'high', mitigation: 'DB-Datei außerhalb jedes web-zugänglichen Verzeichnisses ablegen; Static-File-Server-Wurzel strikt begrenzen.', status: 'open' },
          ],
        },
      },
      {
        id: 't10-mongo',
        type: 'software',
        position: { x: BASE_X + 195, y: BASE_Y + 450 },
        data: {
          label: 'MongoDB (Reviews)',
          componentType: 'network_service',
          version: 'MongoDB 6',
          description: 'Speichert Produktbewertungen und -kommentare. Wird vom Review-Endpunkt der REST-API beschrieben und gelesen.',
          assets: [
            { id: 'a-t10-10', name: 'Produktbewertungen', category: 'operational', description: 'Nutzer-generierte Bewertungen – Manipulation oder Massenextraktion über fehlerhafte Query-Validierung möglich.' },
          ],
          threats: [
            { id: 'th-t10-18', name: 'NoSQL-Injection in Review-Query', stride: 'I', cweId: 'CWE-943', description: 'Filter-Operatoren wie {$ne:null} oder {$where:...} werden ungeprüft übernommen und erlauben Massenauslese oder serverseitige JS-Ausführung.' },
            { id: 'th-t10-19', name: 'Update fremder Bewertungen', stride: 'T', cweId: 'CWE-639', description: 'Review-Update prüft nicht den Autor; jeder authentifizierte Nutzer kann beliebige Bewertungen überschreiben.' },
          ],
          risks: [
            { id: 'r-t10-18', threatId: 'th-t10-18', likelihood: 3, impact: 4, level: 'high', mitigation: 'Operator-Allowlist; $where/$function deaktivieren; Eingaben als Werte casten statt als Query-Objekte übernehmen.', status: 'open' },
            { id: 'r-t10-19', threatId: 'th-t10-19', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Autorisierungsprüfung: Update nur durch Autor (authorId == tokenUserId).', status: 'open' },
          ],
        },
      },
      {
        id: 't10-ftp',
        type: 'software',
        position: { x: BASE_X + 385, y: BASE_Y + 450 },
        data: {
          label: 'Static /ftp File Server',
          componentType: 'network_service',
          version: 'Express static',
          description: 'Liefert öffentliche Dateien (Quittungen, AGB, Marketing). Verzeichnis ist ohne Authentifizierung über /ftp erreichbar.',
          assets: [
            { id: 'a-t10-11', name: 'Server-Dateien & Backups', category: 'operational', description: 'Im /ftp-Verzeichnis abgelegte Dateien inkl. versehentlich exponierter Backups und vertraulicher Dokumente.' },
          ],
          threats: [
            { id: 'th-t10-20', name: 'Sensitive Data Exposure (offenes /ftp)', stride: 'I', cweId: 'CWE-548', description: 'Directory-Listing und direkter Download legen vertrauliche Dateien (z.B. Coupon-Dateien, Backups) ohne Authentifizierung offen.' },
            { id: 'th-t10-21', name: 'Poison-Null-Byte Path Traversal', stride: 'I', cweId: 'CWE-22', description: 'Pfad-Filter (nur .md/.pdf) wird per Null-Byte (%2500) umgangen, sodass beliebige Dateitypen außerhalb der Whitelist gelesen werden.' },
          ],
          risks: [
            { id: 'r-t10-20', threatId: 'th-t10-20', likelihood: 4, impact: 4, level: 'high', mitigation: 'Directory-Listing deaktivieren; nur explizit freigegebene Dateien ausliefern; Zugriffskontrolle für vertrauliche Inhalte.', status: 'open' },
            { id: 'r-t10-21', threatId: 'th-t10-21', likelihood: 3, impact: 4, level: 'high', mitigation: 'Pfad serverseitig kanonisieren und gegen Wurzel prüfen; Null-Bytes ablehnen; aktuelle Runtime ohne Null-Byte-Bug.', status: 'open' },
          ],
          measures: [
            { id: 'm-t10-7', title: 'Static-Verzeichnis härten', description: 'Directory-Listing abschalten, Pfade kanonisieren, sensible Dateien aus dem öffentlichen Verzeichnis entfernen.', status: 'open', riskId: 'r-t10-20', owner: 'Backend Team' },
          ],
        },
      },
    ],
    edges: [
      { id: 't10-e1', source: 't10-spa', target: 't10-api', label: 'REST / HTTPS' },
      { id: 't10-e2', source: 't10-spa', target: 't10-auth', label: 'Login / JWT' },
      { id: 't10-e3', source: 't10-spa', target: 't10-upload', label: 'Upload' },
      { id: 't10-e4', source: 't10-api', target: 't10-sqlite', label: 'SQL (Sequelize)' },
      { id: 't10-e5', source: 't10-auth', target: 't10-sqlite', label: 'User Store' },
      { id: 't10-e6', source: 't10-api', target: 't10-mongo', label: 'Reviews' },
      { id: 't10-e7', source: 't10-upload', target: 't10-ftp', label: 'File Write' },
      { id: 't10-e8', source: 't10-spa', target: 't10-ftp', label: 'Static Files' },
    ],
  },

  // ─── ICS/SCADA Plant ─────────────────────────────────────────────────────────
  {
    id: 'ics-scada-plant',
    name: 'ICS/SCADA Plant',
    description: 'Full Purdue model: field devices (PLCs, RTUs) → control layer (HMI, Historian) → SCADA server. IEC 62443 SL-2 focus.',
    category: 'industrial',
    nodes: [
      // ── Field Zone ──────────────────────────────────────────────────────────
      {
        id: 't11-field-zone',
        type: 'boundary',
        position: { x: 60, y: 60 },
        style: { width: 680, height: 260 },
        data: { label: 'Level 1 – Field Zone (Purdue)', boundaryType: 'network-segment' },
      },
      {
        id: 't11-plc',
        type: 'hardware',
        position: { x: 120, y: 120 },
        data: {
          label: 'Process PLC',
          componentType: 'plc',
          securityLevel: 'SL-2',
          description: 'Controls main production process via Modbus/RTU and PROFIBUS. Safety-critical – unauthorized commands can cause physical damage.',
          assets: [
            { id: 'a-t11-1', name: 'Ladder Logic Program', category: 'safety', description: 'PLC program controlling actuators – tampering can cause unsafe process states.' },
            { id: 'a-t11-2', name: 'Process Setpoints', category: 'operational', description: 'Temperature, pressure and flow setpoints – manipulation disrupts production.' },
          ],
          threats: [
            { id: 'th-t11-1', name: 'Unauthenticated Modbus Command', stride: 'S', cweId: 'CWE-306', description: 'Attacker sends forged Modbus/TCP commands without authentication to force unsafe actuator states.' },
            { id: 'th-t11-2', name: 'PLC Logic Injection via Engineering Tool', stride: 'T', cweId: 'CWE-345', description: 'Compromised engineering workstation pushes unsigned ladder logic to PLC, embedding malicious control sequences.' },
          ],
          risks: [
            { id: 'r-t11-1', threatId: 'th-t11-1', likelihood: 4, impact: 5, level: 'critical', mitigation: 'Implement Modbus/TCP firewall; add application-layer gateway that authenticates commands against authorized setpoint ranges.', status: 'open' },
            { id: 'r-t11-2', threatId: 'th-t11-2', likelihood: 2, impact: 5, level: 'high', mitigation: 'Enable code-signing for PLC programs; restrict engineering workstation network access to dedicated VLAN.', status: 'open' },
          ],
          measures: [
            { id: 'm-t11-1', title: 'Modbus Application Firewall', description: 'Deploy industrial protocol firewall to whitelist allowed function codes and value ranges per register.', status: 'open', riskId: 'r-t11-1', owner: 'OT Security Team' },
          ],
        },
      },
      {
        id: 't11-rtu',
        type: 'hardware',
        position: { x: 360, y: 120 },
        data: {
          label: 'Remote RTU',
          componentType: 'rtu',
          securityLevel: 'SL-1',
          description: 'Remote Terminal Unit collecting field sensor data via DNP3. Communicates over serial link to SCADA master.',
          assets: [
            { id: 'a-t11-3', name: 'Field Sensor Readings', category: 'operational', description: 'Real-time process data from field sensors used for SCADA decisions.' },
          ],
          threats: [
            { id: 'th-t11-3', name: 'DNP3 Replay Attack', stride: 'T', cweId: 'CWE-294', description: 'Attacker replays captured DNP3 frames to inject stale or false sensor readings into SCADA master.' },
            { id: 'th-t11-4', name: 'RTU Firmware Downgrade', stride: 'T', cweId: 'CWE-494', description: 'Attacker exploits missing version check to downgrade RTU firmware to version with known vulnerabilities.' },
          ],
          risks: [
            { id: 'r-t11-3', threatId: 'th-t11-3', likelihood: 3, impact: 4, level: 'high', mitigation: 'Enable DNP3 Secure Authentication v5 (SAv5); use challenge-response authentication for all critical messages.', status: 'open' },
          ],
        },
      },
      {
        id: 't11-ot-gateway',
        type: 'hardware',
        position: { x: 590, y: 120 },
        data: {
          label: 'OT Gateway',
          componentType: 'gateway',
          securityLevel: 'SL-2',
          description: 'Unidirectional gateway (data diode) between field zone and control zone. Enforces Purdue model boundary.',
          threats: [
            { id: 'th-t11-5', name: 'Gateway Misconfiguration Allows Bidirectional Traffic', stride: 'I', cweId: 'CWE-668', description: 'Firewall rules misconfigured to allow inbound traffic from control zone, undermining data diode principle.' },
          ],
          risks: [
            { id: 'r-t11-5', threatId: 'th-t11-5', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Enforce hardware-based data diode; conduct quarterly firewall rule audits.', status: 'in-progress' },
          ],
        },
      },
      // ── Control Zone ────────────────────────────────────────────────────────
      {
        id: 't11-control-zone',
        type: 'boundary',
        position: { x: 60, y: 370 },
        style: { width: 540, height: 220 },
        data: { label: 'Level 2 – Control Zone (Purdue)', boundaryType: 'network-segment' },
      },
      {
        id: 't11-hmi',
        type: 'hardware',
        position: { x: 120, y: 430 },
        data: {
          label: 'Operator HMI',
          componentType: 'hmi',
          securityLevel: 'SL-2',
          description: 'Operator workstation for process visualization and manual control. Windows-based SCADA client.',
          assets: [
            { id: 'a-t11-4', name: 'Operator Credentials', category: 'operational', description: 'HMI login credentials – compromise gives full process control access.' },
          ],
          threats: [
            { id: 'th-t11-6', name: 'HMI Credential Brute-Force', stride: 'S', cweId: 'CWE-307', description: 'No account lockout policy allows attacker to brute-force HMI operator credentials.' },
            { id: 'th-t11-7', name: 'Malware via USB / Removable Media', stride: 'T', cweId: 'CWE-494', description: 'Operator inserts infected USB drive, introducing malware that captures credentials or manipulates process displays.' },
          ],
          risks: [
            { id: 'r-t11-6', threatId: 'th-t11-6', likelihood: 3, impact: 4, level: 'high', mitigation: 'Configure account lockout after 5 failed attempts; enforce MFA for privileged operator roles.', status: 'open' },
            { id: 'r-t11-7', threatId: 'th-t11-7', likelihood: 3, impact: 4, level: 'high', mitigation: 'Disable USB ports in BIOS; deploy application allowlisting (e.g. Symantec SEP); train operators.', status: 'open' },
          ],
        },
      },
      {
        id: 't11-historian',
        type: 'hardware',
        position: { x: 390, y: 430 },
        data: {
          label: 'Process Historian',
          componentType: 'historian',
          securityLevel: 'SL-1',
          description: 'OSIsoft PI / Ignition historian storing time-series process data for analysis, reporting and compliance.',
          assets: [
            { id: 'a-t11-5', name: 'Historical Process Data', category: 'operational', description: 'Years of process data used for compliance reporting and process optimization.' },
          ],
          threats: [
            { id: 'th-t11-8', name: 'Historian Data Manipulation', stride: 'T', cweId: 'CWE-345', description: 'Attacker modifies historical records to conceal abnormal process events or falsify compliance data.' },
            { id: 'th-t11-9', name: 'Historian SQL Injection', stride: 'I', cweId: 'CWE-89', description: 'Unsanitized query parameters in historian web interface allow extraction of all stored process data.' },
          ],
          risks: [
            { id: 'r-t11-8', threatId: 'th-t11-8', likelihood: 2, impact: 4, level: 'medium', mitigation: 'Enable write-once audit log for all historian record modifications; use cryptographic checksums per time-series block.', status: 'open' },
          ],
        },
      },
      // ── SCADA Zone ──────────────────────────────────────────────────────────
      {
        id: 't11-scada-zone',
        type: 'boundary',
        position: { x: 60, y: 650 },
        style: { width: 380, height: 180 },
        data: { label: 'Level 3 – SCADA Zone (Purdue)', boundaryType: 'network-segment' },
      },
      {
        id: 't11-scada-server',
        type: 'software',
        position: { x: 120, y: 710 },
        data: {
          label: 'SCADA Server',
          componentType: 'application',
          version: 'WinCC v7.5',
          securityLevel: 'SL-2',
          description: 'Central SCADA server aggregating data from all field devices, executing alarm management and supervisory control logic.',
          assets: [
            { id: 'a-t11-6', name: 'Supervisory Control Logic', category: 'safety', description: 'High-level process control scripts – compromise enables plant-wide disruption.' },
          ],
          threats: [
            { id: 'th-t11-10', name: 'IT-to-OT Lateral Movement', stride: 'E', cweId: 'CWE-284', description: 'Attacker compromises enterprise IT network and pivots via inadequate DMZ controls into SCADA zone, gaining supervisory control.' },
            { id: 'th-t11-11', name: 'Unpatched SCADA Software CVE', stride: 'E', cweId: 'CWE-269', description: 'Known CVE in SCADA server software exploited due to long patch cycles typical in OT environments.' },
          ],
          risks: [
            { id: 'r-t11-10', threatId: 'th-t11-10', likelihood: 3, impact: 5, level: 'high', mitigation: 'Deploy application-layer firewall at IT/OT boundary; enforce zero-trust segmentation; monitor with OT-specific IDS.', status: 'open' },
            { id: 'r-t11-11', threatId: 'th-t11-11', likelihood: 3, impact: 4, level: 'high', mitigation: 'Establish OT-compatible patch management process; test patches in staging environment; use virtual patching via IDS.', status: 'in-progress' },
          ],
        },
      },
    ],
    edges: [
      { id: 't11-e1', source: 't11-plc', target: 't11-ot-gateway', label: 'Modbus/TCP' },
      { id: 't11-e2', source: 't11-rtu', target: 't11-ot-gateway', label: 'DNP3' },
      { id: 't11-e3', source: 't11-ot-gateway', target: 't11-historian', label: 'OPC-UA' },
      { id: 't11-e4', source: 't11-historian', target: 't11-hmi', label: 'OPC-UA' },
      { id: 't11-e5', source: 't11-historian', target: 't11-scada-server', label: 'SQL/API' },
      { id: 't11-e6', source: 't11-hmi', target: 't11-plc', label: 'Control Commands' },
    ],
  },

  // ─── IoT Consumer Product (CRA) ───────────────────────────────────────────
  {
    id: 'iot-consumer-cra',
    name: 'IoT Consumer Product',
    description: 'Consumer device + mobile app + cloud backend + OTA server. EU CRA Class I/II focus with pre-filled Annex I threat model.',
    category: 'iot',
    nodes: [
      // ── Device Zone ─────────────────────────────────────────────────────────
      {
        id: 't12-device-zone',
        type: 'boundary',
        position: { x: 60, y: 60 },
        style: { width: 300, height: 300 },
        data: { label: 'Consumer Device Trust Zone', boundaryType: 'trust-zone' },
      },
      {
        id: 't12-device',
        type: 'hardware',
        position: { x: 110, y: 110 },
        data: {
          label: 'Smart Device',
          componentType: 'custom',
          securityLevel: 'SL-1',
          description: 'Connected consumer product (e.g. smart home device, wearable). Runs embedded Linux or RTOS. Network-connected → EU CRA in scope.',
          assets: [
            { id: 'a-t12-1', name: 'User Configuration & Credentials', category: 'privacy', description: 'Wi-Fi passwords, user settings and account tokens stored on device.' },
            { id: 'a-t12-2', name: 'Sensor / Usage Data', category: 'privacy', description: 'Behavioural and environmental data – privacy-sensitive under GDPR.' },
          ],
          threats: [
            { id: 'th-t12-1', name: 'Default Credentials Not Changed', stride: 'S', cweId: 'CWE-1392', description: 'Device ships with known default admin credentials that users never change, enabling trivial takeover.' },
            { id: 'th-t12-2', name: 'Physical Debug Port (UART/JTAG)', stride: 'E', cweId: 'CWE-1191', description: 'Active UART/JTAG debug interface provides shell access without authentication to anyone with physical access.' },
          ],
          risks: [
            { id: 'r-t12-1', threatId: 'th-t12-1', likelihood: 5, impact: 4, level: 'critical', mitigation: 'Enforce unique per-device credentials generated at factory; block login with default credentials via firmware.', status: 'open' },
            { id: 'r-t12-2', threatId: 'th-t12-2', likelihood: 3, impact: 5, level: 'high', mitigation: 'Disable JTAG/UART in production fuses; implement console authentication as defense-in-depth.', status: 'open' },
          ],
          measures: [
            { id: 'm-t12-1', title: 'Unique Per-Device Credentials', description: 'Generate unique credentials per device at manufacturing; store in HSM or secure element; enforce on first boot.', status: 'open', riskId: 'r-t12-1', owner: 'HW Team' },
          ],
        },
      },
      {
        id: 't12-firmware',
        type: 'software',
        position: { x: 110, y: 280 },
        data: {
          label: 'Device Firmware',
          componentType: 'firmware',
          version: 'v3.2.1',
          description: 'Embedded firmware (FreeRTOS / embedded Linux). Handles sensor data collection, connectivity and OTA update client.',
          threats: [
            { id: 'th-t12-3', name: 'OTA Update Without Signature Verification', stride: 'T', cweId: 'CWE-494', description: 'Firmware update client accepts packages without verifying cryptographic signature, allowing malicious firmware injection.' },
            { id: 'th-t12-4', name: 'Hardcoded Secrets in Firmware', stride: 'I', cweId: 'CWE-798', description: 'Firmware binary contains hardcoded API keys or cloud credentials recoverable via static analysis.' },
          ],
          risks: [
            { id: 'r-t12-3', threatId: 'th-t12-3', likelihood: 4, impact: 5, level: 'critical', mitigation: 'Implement signed OTA with RSA-2048/ECDSA-256; verify signature before flashing; support rollback prevention.', status: 'open' },
            { id: 'r-t12-4', threatId: 'th-t12-4', likelihood: 3, impact: 4, level: 'high', mitigation: 'Remove all hardcoded secrets; use device-specific certificates provisioned at manufacturing via secure element.', status: 'open' },
          ],
        },
      },
      // ── Backend Zone ────────────────────────────────────────────────────────
      {
        id: 't12-backend-zone',
        type: 'boundary',
        position: { x: 440, y: 60 },
        style: { width: 480, height: 450 },
        data: { label: 'Cloud Backend Zone', boundaryType: 'cloud-zone' },
      },
      {
        id: 't12-api',
        type: 'software',
        position: { x: 490, y: 120 },
        data: {
          label: 'Device Management API',
          componentType: 'network_service',
          description: 'REST API consumed by device and mobile app. Handles device registration, command dispatch and telemetry ingestion.',
          assets: [
            { id: 'a-t12-3', name: 'Device Fleet Telemetry', category: 'operational', description: 'Real-time and historical data from all connected devices.' },
          ],
          threats: [
            { id: 'th-t12-5', name: 'Broken Object-Level Authorization (BOLA)', stride: 'I', cweId: 'CWE-639', description: 'API endpoints lack per-resource ownership checks, allowing one user to read or command another user\'s device.' },
            { id: 'th-t12-6', name: 'API Rate Limit Bypass → DoS', stride: 'D', cweId: 'CWE-770', description: 'Missing rate limiting allows attacker to flood device management endpoints, making them unavailable.' },
          ],
          risks: [
            { id: 'r-t12-5', threatId: 'th-t12-5', likelihood: 4, impact: 4, level: 'critical', mitigation: 'Enforce object-level authorization checks on every API route; add automated BOLA test coverage to CI pipeline.', status: 'open' },
          ],
        },
      },
      {
        id: 't12-ota-server',
        type: 'software',
        position: { x: 490, y: 310 },
        data: {
          label: 'OTA Update Server',
          componentType: 'network_service',
          description: 'Firmware distribution service. Manages firmware versions, rollout channels and device targeting.',
          threats: [
            { id: 'th-t12-7', name: 'OTA Server Compromise → Fleet Takeover', stride: 'T', cweId: 'CWE-494', description: 'Attacker compromises OTA server and pushes malicious firmware to entire device fleet simultaneously.' },
          ],
          risks: [
            { id: 'r-t12-7', threatId: 'th-t12-7', likelihood: 2, impact: 5, level: 'high', mitigation: 'Sign all firmware at HSM-protected build pipeline; OTA server cannot produce valid signatures (defense-in-depth).', status: 'in-progress' },
          ],
        },
      },
      {
        id: 't12-auth',
        type: 'software',
        position: { x: 760, y: 120 },
        data: {
          label: 'Auth Service (OAuth2)',
          componentType: 'application',
          description: 'OAuth2/OIDC authentication server for device and mobile app. Issues access tokens scoped per device.',
          threats: [
            { id: 'th-t12-8', name: 'Token Scope Escalation', stride: 'E', cweId: 'CWE-269', description: 'Attacker manipulates OAuth2 scope parameters to obtain token with elevated device control permissions.' },
          ],
          risks: [
            { id: 'r-t12-8', threatId: 'th-t12-8', likelihood: 2, impact: 5, level: 'high', mitigation: 'Server-side scope validation; use opaque tokens; implement strict scope whitelist per client type.', status: 'open' },
          ],
        },
      },
      // ── Mobile App ──────────────────────────────────────────────────────────
      {
        id: 't12-mobile-zone',
        type: 'boundary',
        position: { x: 60, y: 420 },
        style: { width: 300, height: 160 },
        data: { label: 'Mobile App (User Device)', boundaryType: 'logical-zone' },
      },
      {
        id: 't12-mobile',
        type: 'software',
        position: { x: 110, y: 470 },
        data: {
          label: 'Companion App',
          componentType: 'application',
          description: 'iOS/Android companion app for device setup, configuration and monitoring. Communicates via BLE (local) and REST API (cloud).',
          assets: [
            { id: 'a-t12-4', name: 'User Account Token', category: 'privacy', description: 'OAuth2 access token cached on mobile – theft allows account impersonation.' },
          ],
          threats: [
            { id: 'th-t12-9', name: 'Insecure Token Storage on Mobile', stride: 'I', cweId: 'CWE-312', description: 'OAuth2 tokens stored in SharedPreferences or NSUserDefaults instead of platform keystore, readable by other apps on rooted device.' },
            { id: 'th-t12-10', name: 'BLE Proximity Spoofing', stride: 'S', cweId: 'CWE-290', description: 'Attacker spoofs device BLE advertisement to pair with companion app and send unauthorized configuration commands.' },
          ],
          risks: [
            { id: 'r-t12-9', threatId: 'th-t12-9', likelihood: 3, impact: 3, level: 'medium', mitigation: 'Store tokens in Android Keystore / iOS Keychain; never write credentials to shared storage.', status: 'open' },
          ],
        },
      },
    ],
    edges: [
      { id: 't12-e1', source: 't12-device', target: 't12-firmware', label: 'runs' },
      { id: 't12-e2', source: 't12-firmware', target: 't12-api', label: 'MQTT/HTTPS' },
      { id: 't12-e3', source: 't12-firmware', target: 't12-ota-server', label: 'HTTPS (OTA)' },
      { id: 't12-e4', source: 't12-mobile', target: 't12-api', label: 'REST/HTTPS' },
      { id: 't12-e5', source: 't12-mobile', target: 't12-device', label: 'BLE' },
      { id: 't12-e6', source: 't12-api', target: 't12-auth', label: 'Token Validation' },
    ],
  },
];
