import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const SUPPORTED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function isSupportedContentType(contentType: string): boolean {
  return SUPPORTED_CONTENT_TYPES.includes(contentType);
}

export interface StoredAttachmentMeta {
  caseKey: string;
  filename: string;
  contentType: string;
}

function scratchDir(): string {
  return path.join(process.cwd(), '.testpulse', 'attachments');
}

/**
 * Writes an attachment's bytes plus a JSON sidecar into the scratch
 * directory. The on-disk filename is a hash of the case key plus a
 * fresh random identifier per call -- never derived from the
 * caller-supplied filename, which is stored only as JSON *content* --
 * no path-traversal surface, matching every other plugin's attachment
 * storage. A fresh identifier per call (not the case key alone) means
 * multiple attachments under one case key never collide or overwrite
 * each other.
 */
export function writeAttachment(
  caseKey: string,
  data: Buffer,
  filename: string,
  contentType: string,
): void {
  const dir = scratchDir();
  fs.mkdirSync(dir, { recursive: true });

  const id = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(`${caseKey}:${id}`).digest('hex');

  fs.writeFileSync(path.join(dir, `${hash}.data`), data);
  const meta: StoredAttachmentMeta = { caseKey, filename, contentType };
  fs.writeFileSync(path.join(dir, `${hash}.json`), JSON.stringify(meta));
}

export interface StoredAttachment extends StoredAttachmentMeta {
  data: Buffer;
}

/**
 * Recursively searches searchRoot for .testpulse/attachments directories
 * and reads every <hash>.json + <hash>.data pair found. Skips (rather
 * than throwing on) a malformed or partially-written sidecar -- a real,
 * ordinary occurrence if a process is killed mid-write (CI timeout,
 * OOM-kill), not just an adversarial-input concern, the same lesson
 * learned the hard way in the gtest plugin's own post-implementation
 * review.
 */
export function readAttachments(searchRoot: string): StoredAttachment[] {
  const result: StoredAttachment[] = [];
  walk(searchRoot, result);
  return result;
}

function walk(dir: string, result: StoredAttachment[]): void {
  if (!fs.existsSync(dir)) {
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, result);
      continue;
    }
    if (!entry.name.endsWith('.json') || path.basename(dir) !== 'attachments') {
      continue;
    }
    try {
      const meta: StoredAttachmentMeta = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const dataPath = fullPath.replace(/\.json$/, '.data');
      if (!fs.existsSync(dataPath)) {
        continue;
      }
      const data = fs.readFileSync(dataPath);
      result.push({ ...meta, data });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `testpulse-jasmine: skipping malformed attachment sidecar ${fullPath}: ${(e as Error).message}`,
      );
    }
  }
}
