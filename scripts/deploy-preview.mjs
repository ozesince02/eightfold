// The Preview command for Cloudflare Workers Builds (D-034): only the `preview` branch gets a
// Preview, at a stable address (preview-onemorefold.<subdomain>.workers.dev). Every other branch
// is skipped, so work branches don't use up the account's Previews. Production stays
// `npx wrangler deploy`, from main only. Usage (Cloudflare dashboard, Preview command):
//   npm run deploy:preview
import { spawnSync } from 'node:child_process';

const PREVIEW_BRANCH = 'preview';
const branch = process.env.WORKERS_CI_BRANCH || '';
const sha = (process.env.WORKERS_CI_COMMIT_SHA || '').slice(0, 7);

if (branch !== PREVIEW_BRANCH) {
  console.log(`deploy:preview: "${branch || 'unknown'}" isn't the ${PREVIEW_BRANCH} branch, so no Preview is made.`);
  process.exit(0);
}

const args = ['wrangler', 'preview', '--name', PREVIEW_BRANCH];
if (/^[0-9a-f]{7}$/.test(sha)) args.push('--tag', sha, '--message', `preview at ${sha}`);
const run = spawnSync('npx', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(run.status ?? 1);
