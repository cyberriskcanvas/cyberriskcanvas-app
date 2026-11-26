// SPDX license ids by how far their obligations reach into your own code. Used by license policies.
// Not legal advice: a lawyer decides what applies to your product.

export const LICENSE_GROUPS = {
  'strong-copyleft': [
    'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-3.0-only', 'GPL-3.0-or-later', 'GPL-2.0', 'GPL-2.0+', 'GPL-3.0', 'GPL-3.0+',
    'AGPL-3.0-only', 'AGPL-3.0-or-later', 'AGPL-3.0', 'SSPL-1.0', 'EUPL-1.1', 'EUPL-1.2', 'OSL-3.0',
  ],
  'weak-copyleft': [
    'LGPL-2.1-only', 'LGPL-2.1-or-later', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'LGPL-2.1', 'LGPL-2.1+', 'LGPL-3.0', 'LGPL-3.0+',
    'MPL-1.1', 'MPL-2.0', 'EPL-1.0', 'EPL-2.0', 'CDDL-1.0', 'CDDL-1.1',
  ],
  permissive: [
    'MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense', 'CC0-1.0', 'Zlib', 'BSL-1.0', 'PostgreSQL', 'Python-2.0',
  ],
} as const;

export type LicenseGroup = keyof typeof LICENSE_GROUPS;
