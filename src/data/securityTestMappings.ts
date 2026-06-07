import type { Threat, IEC62443Mapping, SecurityTest } from '@/types';

// ─── STRIDE → relevant IEC 62443 requirement IDs ──────────────────────────────

const STRIDE_TO_REQUIREMENTS: Record<Threat['stride'], string[]> = {
  S: ['CR 1.1', 'CR 1.2', 'CR 1.11', 'CR 1.7', 'CR 1.5', 'SR 1.1'],
  T: ['CR 3.1', 'CR 3.4', 'CR 3.5', 'SR 3.1'],
  R: ['CR 2.8', 'CR 2.9', 'CR 2.12', 'SR 2.8'],
  I: ['CR 4.1', 'CR 4.3', 'SR 4.1'],
  D: ['CR 7.1', 'CR 7.2', 'SR 7.1'],
  E: ['CR 2.1', 'CR 2.5', 'SR 2.1'],
};

// ─── Per-requirement test templates ──────────────────────────────────────────

type TestTemplate = Pick<SecurityTest, 'title' | 'precondition' | 'testSteps' | 'expectedResult'>;

type TemplateFn = (threatName: string, component: string) => TestTemplate;

const REQUIREMENT_TEMPLATES: Record<string, TemplateFn> = {
  'CR 1.1': (threat, comp) => ({
    title: `User Authentication Enforcement – ${threat}`,
    precondition: `${comp} network interface is accessible. A valid test account exists.`,
    testSteps: [
      `Attempt to access protected resources on ${comp} without credentials.`,
      'Send requests with expired or revoked authentication tokens.',
      'Present valid credentials and verify successful access.',
    ],
    expectedResult: `${comp} rejects all unauthenticated and invalid-credential requests. Only valid credentials grant access.`,
  }),
  'CR 1.2': (threat, comp) => ({
    title: `Software/Device Authentication – ${threat}`,
    precondition: `${comp} is reachable from the test network. A second component or test tool can simulate peer-device traffic.`,
    testSteps: [
      `Send traffic to ${comp} from an unauthenticated device identity.`,
      'Use a forged or invalid device certificate/key.',
      'Present a valid device credential and verify the connection is accepted.',
    ],
    expectedResult: 'Only traffic from authenticated software processes and devices is accepted.',
  }),
  'CR 1.5': (threat, comp) => ({
    title: `Authenticator Management – ${threat}`,
    precondition: `${comp} administrative interface is accessible.`,
    testSteps: [
      `Verify that default factory credentials cannot be used on ${comp} without a mandatory change prompt.`,
      'Attempt to reuse a previously used password.',
      'Change the authenticator and confirm the old credential is no longer valid.',
    ],
    expectedResult: 'Default credentials require change on first use. Old authenticators are immediately invalidated.',
  }),
  'CR 1.7': (threat, comp) => ({
    title: `Password Policy Enforcement – ${threat}`,
    precondition: `${comp} user management interface is accessible.`,
    testSteps: [
      `Attempt to set a password shorter than the minimum required length on ${comp}.`,
      'Attempt to set a password that lacks required character classes (uppercase, number, symbol).',
      'Set a compliant password and verify acceptance.',
    ],
    expectedResult: 'Non-compliant passwords are rejected with a descriptive error. Compliant passwords are accepted.',
  }),
  'CR 1.11': (threat, comp) => ({
    title: `Account Lockout After Failed Logins – ${threat}`,
    precondition: `${comp} login interface is accessible. A valid test account exists.`,
    testSteps: [
      `Submit invalid credentials to ${comp} 5 times consecutively.`,
      'Immediately attempt login with the correct credentials.',
      'Wait for the configured lockout duration and retry with correct credentials.',
    ],
    expectedResult: `${comp} locks the account after 5 failed attempts. Correct credentials are rejected during lockout. Access is restored after the lockout period.`,
  }),
  'CR 2.1': (threat, comp) => ({
    title: `Least-Privilege Authorization – ${threat}`,
    precondition: `${comp} is accessible. A low-privileged test account exists.`,
    testSteps: [
      `Authenticate to ${comp} with a low-privileged account.`,
      'Attempt to read or modify resources that require elevated privileges.',
      'Attempt privilege escalation via parameter manipulation (e.g., role=admin in request body).',
    ],
    expectedResult: 'All access attempts beyond the assigned privilege level are rejected with a 403 or equivalent error.',
  }),
  'CR 2.5': (threat, comp) => ({
    title: `Session Lock / Inactivity Timeout – ${threat}`,
    precondition: `${comp} session management is accessible.`,
    testSteps: [
      `Authenticate to ${comp} and leave the session idle beyond the configured timeout period.`,
      'Attempt to perform an action with the idle session token.',
      'Verify that re-authentication is required.',
    ],
    expectedResult: `${comp} invalidates the session after the inactivity timeout and requires re-authentication for further access.`,
  }),
  'CR 2.8': (threat, comp) => ({
    title: `Audit Log Generation – ${threat}`,
    precondition: `${comp} audit log system is accessible to the tester.`,
    testSteps: [
      `Perform a security-relevant action on ${comp} (login, config change, access denial).`,
      'Access the audit log and locate the entry for the performed action.',
      'Verify the log entry contains: timestamp, user identity, action type, and outcome.',
    ],
    expectedResult: 'Every security-relevant action produces a complete, timestamped audit record.',
  }),
  'CR 2.9': (threat, comp) => ({
    title: `Audit Storage Capacity & Overflow – ${threat}`,
    precondition: `${comp} audit storage is accessible. Ability to fill or simulate a full audit store.`,
    testSteps: [
      `Fill the audit storage on ${comp} to near capacity.`,
      'Trigger additional auditable events and observe behavior.',
      'Verify the component alerts on near-full storage or overwrites oldest entries per policy.',
    ],
    expectedResult: `${comp} handles full audit storage gracefully without losing new audit records or crashing.`,
  }),
  'CR 3.1': (threat, comp) => ({
    title: `Communication Integrity Verification – ${threat}`,
    precondition: `Network access between tester and ${comp}. A man-in-the-middle (MITM) test tool is available.`,
    testSteps: [
      `Intercept a data packet in transit between client and ${comp}.`,
      'Modify a field in the intercepted payload.',
      'Forward the modified packet and observe the response from the component.',
    ],
    expectedResult: `${comp} detects the tampered payload and rejects it (e.g., via MAC/HMAC verification or TLS integrity).`,
  }),
  'CR 3.4': (threat, comp) => ({
    title: `Software & Firmware Integrity Check – ${threat}`,
    precondition: `${comp} exposes a software update or boot verification mechanism.`,
    testSteps: [
      `Obtain a firmware or software image for ${comp}.`,
      'Modify a byte of the image and attempt to install it.',
      'Verify the component rejects the modified image during verification.',
    ],
    expectedResult: `${comp} refuses to install or run firmware/software whose integrity signature does not match.`,
  }),
  'CR 3.5': (threat, comp) => ({
    title: `Input Validation – ${threat}`,
    precondition: `${comp} exposes an input interface (API, form, protocol field).`,
    testSteps: [
      `Send an oversized value (buffer overflow candidate) to an input field of ${comp}.`,
      'Send a value with special characters (null bytes, script tags, SQL metacharacters).',
      'Send a value outside the valid numeric range.',
    ],
    expectedResult: `${comp} validates and sanitizes all inputs; malformed inputs are rejected with an error and do not cause crashes or unexpected behavior.`,
  }),
  'CR 4.1': (threat, comp) => ({
    title: `Data Confidentiality / Encryption Verification – ${threat}`,
    precondition: `Network capture tool (e.g., Wireshark) positioned to observe ${comp} traffic.`,
    testSteps: [
      `Capture network traffic to and from ${comp} during normal operation.`,
      'Inspect the captured traffic for plaintext sensitive data (credentials, PII, keys).',
      "Verify TLS version and cipher suite used by ${comp}.",
    ],
    expectedResult: 'All sensitive data is encrypted in transit. Weak protocols (TLS 1.0/1.1, SSLv3) and null ciphers are absent.',
  }),
  'CR 4.3': (threat, comp) => ({
    title: `Cryptographic Compliance – ${threat}`,
    precondition: `${comp} cryptographic configuration is readable or testable.`,
    testSteps: [
      `Enumerate the cipher suites and key lengths advertised or used by ${comp}.`,
      'Identify any algorithm considered weak (MD5, SHA-1, DES, RC4, RSA < 2048 bit).',
      'Verify encryption key management procedures (rotation, storage).',
    ],
    expectedResult: `${comp} uses only approved, current cryptographic algorithms and key lengths as per applicable standards (e.g., NIST SP 800-131A).`,
  }),
  'CR 5.1': (threat, comp) => ({
    title: `Network Segmentation Enforcement – ${threat}`,
    precondition: `Tester has access to a network segment that should NOT have access to ${comp}.`,
    testSteps: [
      `Attempt to reach ${comp} from the unauthorized network segment.`,
      'Scan ports of ${comp} from the untrusted segment.',
      'Verify firewall/ACL rules are in place and correctly configured.',
    ],
    expectedResult: `${comp} is not reachable from unauthorized network segments. All such connection attempts are blocked.`,
  }),
  'CR 5.2': (threat, comp) => ({
    title: `Zone Boundary Protection – ${threat}`,
    precondition: `${comp} zone boundary (firewall/DMZ) is identifiable.`,
    testSteps: [
      'Attempt to send traffic directly from an untrusted zone to a trusted zone bypassing boundary controls.',
      'Test for split-tunneling or routing-table manipulation that could bypass zone boundaries.',
      'Verify deep packet inspection or protocol whitelisting at the boundary.',
    ],
    expectedResult: 'All cross-zone traffic is inspected and filtered at zone boundaries; bypass attempts are blocked.',
  }),
  'CR 7.1': (threat, comp) => ({
    title: `Denial-of-Service Resilience – ${threat}`,
    precondition: `${comp} is running and accessible. A traffic generation tool is available.`,
    testSteps: [
      `Send a high volume of legitimate requests to ${comp} (load test).`,
      'Send a flood of malformed/oversized packets.',
      'Monitor response time, availability, and resource consumption during the test.',
    ],
    expectedResult: `${comp} degrades gracefully under load; rate limiting or throttling activates; the component remains responsive or recovers automatically.`,
  }),
  'CR 7.2': (threat, comp) => ({
    title: `Resource Management Under Attack – ${threat}`,
    precondition: `${comp} monitoring/metrics accessible.`,
    testSteps: [
      `Open a large number of concurrent connections to ${comp} without completing them (slow-loris style).`,
      'Monitor CPU, memory, and file descriptor usage.',
      'Verify the component limits per-source connections or times out idle connections.',
    ],
    expectedResult: `${comp} enforces connection limits and timeouts; resource exhaustion does not cause service disruption.`,
  }),
  'SR 1.1': (threat, comp) => ({
    title: `System-Level Authentication – ${threat}`,
    precondition: `${comp} (system level) network interface is accessible.`,
    testSteps: [
      `Attempt to interact with ${comp} system functions without system-level authentication.`,
      'Test with invalid or expired system credentials.',
      'Verify proper credential acceptance.',
    ],
    expectedResult: `${comp} enforces authentication for all human users at the system level; unauthenticated access is rejected.`,
  }),
  'SR 3.1': (threat, comp) => ({
    title: `System Communication Integrity – ${threat}`,
    precondition: `Network path between ${comp} and peer systems is accessible for MITM testing.`,
    testSteps: [
      `Intercept system-level communication involving ${comp}.`,
      'Alter message content and replay.',
      'Observe if modification is detected by the receiving party.',
    ],
    expectedResult: 'System-level communications use integrity-protected channels; tampered messages are detected and rejected.',
  }),
  'SR 4.1': (threat, comp) => ({
    title: `System Information Confidentiality – ${threat}`,
    precondition: `${comp} system-level interfaces are observable.`,
    testSteps: [
      `Capture traffic on system-level interfaces of ${comp}.`,
      'Check for unencrypted sensitive control data.',
      'Verify that stored sensitive data (config files, logs) is protected.',
    ],
    expectedResult: 'All sensitive control system data is encrypted both in transit and at rest.',
  }),
  'SR 7.1': (threat, comp) => ({
    title: `Control System DoS Protection – ${threat}`,
    precondition: `${comp} is in operational state.`,
    testSteps: [
      `Simulate a network-level DoS event targeting ${comp}.`,
      'Verify the component continues operating in degraded mode.',
      'Verify alarms or notifications are generated.',
    ],
    expectedResult: `${comp} maintains critical control functions during a DoS event and alerts operators.`,
  }),
};

// ─── Generic STRIDE fallback templates ──────────────────────────────────────

const STRIDE_GENERIC_TEMPLATES: Record<Threat['stride'], TemplateFn> = {
  S: (threat, comp) => ({
    title: `Spoofing / Authentication Test – ${threat}`,
    precondition: `${comp} is accessible on the network.`,
    testSteps: [
      `Attempt to access ${comp} while impersonating another valid identity.`,
      'Send requests without authentication headers/credentials.',
      'Replay a previously captured valid authentication token.',
    ],
    expectedResult: 'All spoofing attempts are rejected; identity verification is enforced on every access.',
  }),
  T: (threat, comp) => ({
    title: `Tampering / Data Integrity Test – ${threat}`,
    precondition: `Network access between tester and ${comp}.`,
    testSteps: [
      `Intercept a data message sent to or from ${comp}.`,
      'Modify the payload and retransmit.',
      'Verify whether the receiving end detects the modification.',
    ],
    expectedResult: `${comp} detects and rejects tampered data; communication integrity mechanisms are active.`,
  }),
  R: (threat, comp) => ({
    title: `Repudiation / Audit Log Test – ${threat}`,
    precondition: `${comp} audit log is accessible.`,
    testSteps: [
      `Perform a security-relevant operation on ${comp}.`,
      'Verify the operation is captured in the audit log with user, timestamp, and action.',
      'Attempt to delete or modify an audit entry.',
    ],
    expectedResult: 'All security-relevant actions are logged and the log is protected against unauthorized modification.',
  }),
  I: (threat, comp) => ({
    title: `Information Disclosure / Confidentiality Test – ${threat}`,
    precondition: `Network capture capability on the ${comp} communication path.`,
    testSteps: [
      `Capture network traffic to and from ${comp}.`,
      'Inspect for sensitive data (credentials, keys, PII) in plaintext.',
      `Trigger an error condition on ${comp} and inspect the error message for internal details.`,
    ],
    expectedResult: 'No sensitive data is exposed in transit or in error messages.',
  }),
  D: (threat, comp) => ({
    title: `Denial of Service / Availability Test – ${threat}`,
    precondition: `${comp} is running. A traffic generator is available.`,
    testSteps: [
      `Send a large number of requests per second to ${comp}.`,
      'Send malformed protocol messages.',
      'Monitor availability and response times during the test.',
    ],
    expectedResult: `${comp} remains available or degrades gracefully; rate limiting or circuit breakers activate.`,
  }),
  E: (threat, comp) => ({
    title: `Elevation of Privilege / Authorization Test – ${threat}`,
    precondition: `${comp} is accessible. Low-privileged test account available.`,
    testSteps: [
      `Authenticate with a low-privileged account to ${comp}.`,
      'Attempt to access admin functions or sensitive data.',
      'Try to escalate privileges via HTTP parameter manipulation, JWT tampering, or IDOR.',
    ],
    expectedResult: 'All privilege escalation attempts are rejected; authorization is enforced based on least privilege.',
  }),
};

// ─── Main generation function ─────────────────────────────────────────────────

export function generateSecurityTests(
  nodeLabel: string,
  threats: Threat[],
  iecMappings: IEC62443Mapping[],
): Omit<SecurityTest, 'id' | 'status'>[] {
  const results: Omit<SecurityTest, 'id' | 'status'>[] = [];
  const usedKeys = new Set<string>();

  for (const threat of threats) {
    const relevantReqIds = STRIDE_TO_REQUIREMENTS[threat.stride];
    const mappedReqIds = iecMappings.map((m) => m.requirementId);

    // Find IEC requirements that are both relevant to this STRIDE and present on the node
    const matchedReqIds = relevantReqIds.filter((rid) => mappedReqIds.includes(rid));

    if (matchedReqIds.length > 0) {
      for (const reqId of matchedReqIds) {
        const templateFn = REQUIREMENT_TEMPLATES[reqId];
        if (!templateFn) continue;
        const key = `${threat.id}-${reqId}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        results.push({
          ...templateFn(threat.name, nodeLabel),
          targetComponent: nodeLabel,
          threatId: threat.id,
          requirementId: reqId,
          source: 'auto',
        });
      }
    } else {
      // No IEC requirement match - use generic STRIDE template
      const key = `${threat.id}-stride`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      const templateFn = STRIDE_GENERIC_TEMPLATES[threat.stride];
      results.push({
        ...templateFn(threat.name, nodeLabel),
        targetComponent: nodeLabel,
        threatId: threat.id,
        source: 'auto',
      });
    }
  }

  return results;
}
