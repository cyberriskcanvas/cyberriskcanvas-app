export interface CweEntry {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const CWE_DATABASE: CweEntry[] = [
  // Memory Safety
  { id: 'CWE-119', name: 'Improper Restriction of Operations within Buffer Bounds', description: 'The software performs operations on a memory buffer but reads from or writes to a memory location outside the intended boundary.', category: 'Memory Safety' },
  { id: 'CWE-120', name: 'Buffer Copy without Checking Size of Input', description: 'The program copies an input buffer to an output buffer without verifying that the size of the input buffer is less than or equal to the size of the output buffer.', category: 'Memory Safety' },
  { id: 'CWE-121', name: 'Stack-based Buffer Overflow', description: 'A stack-based buffer overflow condition is a buffer overflow where the buffer that can be overwritten is allocated on the stack.', category: 'Memory Safety' },
  { id: 'CWE-122', name: 'Heap-based Buffer Overflow', description: 'A heap-based buffer overflow condition is a buffer overflow where the buffer that can be overwritten is allocated in the heap portion of memory.', category: 'Memory Safety' },
  { id: 'CWE-125', name: 'Out-of-bounds Read', description: 'The software reads data past the end, or before the beginning, of the intended buffer.', category: 'Memory Safety' },
  { id: 'CWE-416', name: 'Use After Free', description: 'The product reuses or references memory after it has been freed.', category: 'Memory Safety' },
  { id: 'CWE-476', name: 'NULL Pointer Dereference', description: 'A NULL pointer dereference occurs when the application dereferences a pointer that it expects to be valid, but is NULL.', category: 'Memory Safety' },
  { id: 'CWE-787', name: 'Out-of-bounds Write', description: 'The software writes data past the end, or before the beginning, of the intended buffer.', category: 'Memory Safety' },
  { id: 'CWE-190', name: 'Integer Overflow or Wraparound', description: 'The software performs a calculation that can produce an integer overflow or wraparound, potentially leading to unexpected behavior.', category: 'Memory Safety' },

  // Authentication & Access Control
  { id: 'CWE-287', name: 'Improper Authentication', description: 'The software does not verify a user\'s identity or does not do so in a secure manner.', category: 'Authentication' },
  { id: 'CWE-306', name: 'Missing Authentication for Critical Function', description: 'The software does not perform any authentication for functionality that requires a provable user identity.', category: 'Authentication' },
  { id: 'CWE-522', name: 'Insufficiently Protected Credentials', description: 'The product transmits or stores authentication credentials, but uses an insecure method that is susceptible to unauthorized interception.', category: 'Authentication' },
  { id: 'CWE-798', name: 'Use of Hard-coded Credentials', description: 'The software contains hard-coded credentials for an inbound or outbound authentication.', category: 'Authentication' },
  { id: 'CWE-862', name: 'Missing Authorization', description: 'The software does not perform an authorization check when an actor attempts to access a resource or perform an action.', category: 'Authorization' },
  { id: 'CWE-863', name: 'Incorrect Authorization', description: 'The software performs an authorization check, but it incorrectly performs the check leading to unintended access.', category: 'Authorization' },
  { id: 'CWE-269', name: 'Improper Privilege Management', description: 'The software does not properly assign, modify, track, or check privileges for an actor, creating an unintended sphere of control.', category: 'Authorization' },
  { id: 'CWE-276', name: 'Incorrect Default Permissions', description: 'During installation, installed file permissions are set to allow anyone to modify those files.', category: 'Authorization' },
  { id: 'CWE-732', name: 'Incorrect Permission Assignment for Critical Resource', description: 'The product specifies permissions for a security-critical resource in a way that allows that resource to be read or modified by unintended actors.', category: 'Authorization' },

  // Cryptography
  { id: 'CWE-295', name: 'Improper Certificate Validation', description: 'The software does not validate, or incorrectly validates, a certificate.', category: 'Cryptography' },
  { id: 'CWE-311', name: 'Missing Encryption of Sensitive Data', description: 'The software does not encrypt sensitive or critical information before storage or transmission.', category: 'Cryptography' },
  { id: 'CWE-319', name: 'Cleartext Transmission of Sensitive Information', description: 'The software transmits sensitive or security-critical data in cleartext in a communication channel.', category: 'Cryptography' },
  { id: 'CWE-326', name: 'Inadequate Encryption Strength', description: 'The software stores or transmits sensitive data using an encryption scheme that is theoretically sound, but is not strong enough for the level of risk.', category: 'Cryptography' },
  { id: 'CWE-327', name: 'Use of a Broken or Risky Cryptographic Algorithm', description: 'The use of a broken or risky cryptographic algorithm is an unnecessary risk that may result in exposure of sensitive information.', category: 'Cryptography' },
  { id: 'CWE-330', name: 'Use of Insufficiently Random Values', description: 'The software uses insufficiently random numbers or values in a security context that depends on unpredictable numbers.', category: 'Cryptography' },
  { id: 'CWE-916', name: 'Use of Password Hash With Insufficient Computational Effort', description: 'The software generates a hash for a password, but uses a scheme that does not provide a sufficient level of computational effort.', category: 'Cryptography' },

  // Input Validation
  { id: 'CWE-20', name: 'Improper Input Validation', description: 'The product receives input or data, but it does not validate or incorrectly validates that the input has the properties required for safe and correct processing.', category: 'Input Validation' },
  { id: 'CWE-22', name: 'Path Traversal', description: 'The software uses external input to construct a pathname that is intended to identify a file/directory below a restricted parent directory.', category: 'Input Validation' },
  { id: 'CWE-78', name: 'OS Command Injection', description: 'The software constructs all or part of an OS command using externally-influenced input from an upstream component.', category: 'Input Validation' },
  { id: 'CWE-89', name: 'SQL Injection', description: 'The software constructs all or part of an SQL command using externally-influenced input from an upstream component.', category: 'Input Validation' },
  { id: 'CWE-502', name: 'Deserialization of Untrusted Data', description: 'The application deserializes untrusted data without sufficiently verifying that the resulting data will be valid.', category: 'Input Validation' },

  // Information Disclosure
  { id: 'CWE-200', name: 'Exposure of Sensitive Information to Unauthorized Actor', description: 'The product exposes sensitive information to an actor that is not explicitly authorized to have access to that information.', category: 'Information Disclosure' },
  { id: 'CWE-209', name: 'Generation of Error Message Containing Sensitive Information', description: 'The software generates an error message that includes sensitive information about its environment, users, or data.', category: 'Information Disclosure' },
  { id: 'CWE-668', name: 'Exposure of Resource to Wrong Sphere', description: 'The product exposes a resource to the wrong control sphere, providing unintended actors with inappropriate access to the resource.', category: 'Information Disclosure' },

  // Resource Management
  { id: 'CWE-400', name: 'Uncontrolled Resource Consumption (DoS)', description: 'The software does not properly restrict the size or amount of resources that are requested or influenced by an actor.', category: 'Resource Management' },
  { id: 'CWE-362', name: 'Concurrent Execution with Shared Resource (Race Condition)', description: 'The product contains a concurrent code sequence that requires temporary exclusive access to a shared resource.', category: 'Resource Management' },
  { id: 'CWE-676', name: 'Use of Potentially Dangerous Function', description: 'The program invokes a potentially dangerous function that could introduce a vulnerability if it is used incorrectly.', category: 'Resource Management' },

  // Network / Protocol
  { id: 'CWE-352', name: 'Cross-Site Request Forgery (CSRF)', description: 'The web application does not, or can not, sufficiently verify whether a well-formed, valid, consistent request was intentionally provided by the user who submitted the request.', category: 'Network' },
  { id: 'CWE-434', name: 'Unrestricted Upload of File with Dangerous Type', description: 'The software allows the attacker to upload or transfer files of dangerous types that can be automatically processed within the product\'s environment.', category: 'Network' },

  // Embedded / Automotive specific
  { id: 'CWE-1188', name: 'Insecure Default Initialization of Resource', description: 'The software initializes or sets a resource with a default that is intended to be changed by the administrator, but the default is not secure.', category: 'Embedded' },
  { id: 'CWE-1191', name: 'On-Chip Debug and Test Interface With Insufficient Access Control', description: 'The chip does not implement or does not correctly perform access control for on-chip debug and test interfaces.', category: 'Embedded' },
  { id: 'CWE-1233', name: 'Security-Sensitive Hardware Controls with Missing Lock Bit Protection', description: 'The hardware lock bit protection is not properly implemented or enabled.', category: 'Embedded' },
  { id: 'CWE-1240', name: 'Use of a Cryptographic Primitive with a Risky Implementation', description: 'To fulfill the need for a cryptographic primitive, the product implements a cryptographic algorithm using a non-standard, unproven, or disallowed/non-compliant cryptographic implementation.', category: 'Embedded' },
  { id: 'CWE-1259', name: 'Improper Restriction of Security Token Assignment', description: 'The System-on-Chip (SoC) implements a Security Token mechanism to differentiate actions and data accesses by various agents, but this security token assignment is improperly implemented.', category: 'Embedded' },
];

export function searchCwe(query: string): CweEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return CWE_DATABASE.slice(0, 10);
  return CWE_DATABASE.filter(
    (c) =>
      c.id.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q),
  ).slice(0, 15);
}
