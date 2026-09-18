import { readFileSync } from 'node:fs';
export function Bad() {
  return readFileSync('/etc/passwd', 'utf8');
}
