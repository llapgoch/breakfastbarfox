// web-ext settings. API keys live in .env (untracked), not here — see README.
module.exports = {
  // Don't ship the dev cruft inside the signed .xpi
  ignoreFiles: [
    'package.json',
    'package-lock.json',
    'node_modules',
    'web-ext-config.cjs',
    'web-ext-artifacts',
    'README.md',
    'CLAUDE.md',
    '.env',
    '.git',
    'icons/icon.svg',
  ],
  build: {
    overwriteDest: true,
  },
  sign: {
    // Self-distributed: signed but not publicly listed on AMO
    channel: 'unlisted',
  },
};
