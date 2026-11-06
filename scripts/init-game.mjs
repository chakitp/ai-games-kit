#!/usr/bin/env node
// AI Games Kit: scaffold a game project that the kit's agents, commands and scripts work in. Zero dependencies.
// Usage: node <kit>/scripts/init-game.mjs <new-game-dir> [--name "My Game"]
// Creates: scripts/ (+mock-sdks), platforms/, CLAUDE.md, docs/, package.json, .gitignore. Never overwrites existing files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const target = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--name') || '');
if (!args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--name')) { console.error('Usage: node init-game.mjs <new-game-dir> [--name "My Game"]'); process.exit(2); }
const ni = args.indexOf('--name'); const title = ni >= 0 ? args[ni + 1] : path.basename(target);
const slug = path.basename(target).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-game';

const made = [], kept = [];
const put = (rel, content) => { const p = path.join(target, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p)) return kept.push(rel); fs.writeFileSync(p, content); made.push(rel); };
const copy = (from, rel) => { const p = path.join(target, rel); fs.mkdirSync(path.dirname(p), { recursive: true });
  if (fs.existsSync(p)) return kept.push(rel); fs.copyFileSync(from, p); made.push(rel); };
const copyDir = (from, rel) => { for (const e of fs.readdirSync(from, { withFileTypes: true })) e.isDirectory() ? copyDir(path.join(from, e.name), path.join(rel, e.name)) : copy(path.join(from, e.name), path.join(rel, e.name)); };

fs.mkdirSync(target, { recursive: true });
copyDir(path.join(kit, 'scripts'), 'scripts');
copyDir(path.join(kit, 'platforms'), 'platforms');
copy(path.join(kit, 'templates', 'GAME_PROJECT_CLAUDE.md'), 'CLAUDE.md');
put('docs/.gitkeep', '');
put('.gitignore', 'node_modules/\ndist/\n.aigk/\nmarketing/raw/\n.DS_Store\n');
put('package.json', JSON.stringify({ name: slug, version: '0.1.0', private: true, type: 'module',
  scripts: { playtest: 'node scripts/playtest.mjs .', audit: 'node scripts/audit-bundle.mjs dist --portal all',
    'build:all': 'node scripts/build-portal.mjs . --portal all --out dist', 'build:poki': 'node scripts/build-portal.mjs . --portal poki --out dist',
    'build:crazygames': 'node scripts/build-portal.mjs . --portal crazygames --out dist', 'build:youtube': 'node scripts/build-portal.mjs . --portal youtube --out dist',
    'build:itch': 'node scripts/build-portal.mjs . --portal itch --out dist', clip: 'node scripts/record-clip.mjs . --clip --seconds 22 --out marketing/raw' },
  devDependencies: { playwright: '^1.50.0' } }, null, 2) + '\n');
put('README.md', `# ${title}\n\nBuilt with the AI Games Kit. Start with \`/game-new "<your idea>"\` in Claude Code.\n\n\`\`\`\nnpm install && npx playwright install chromium\nnpm run playtest        # smoke test\nnpm run build:all       # dist/<portal>/ + zips\n\`\`\`\n`);

console.log(`\nCreated ${path.relative(process.cwd(), target) || '.'}  (${made.length} files${kept.length ? `, ${kept.length} kept as-is` : ''})\n`);
console.log('Next:\n  1. cd ' + path.relative(process.cwd(), target) + '\n  2. npm install && npx playwright install chromium\n  3. claude            # then: /game-new "<one-line idea>"\n');
