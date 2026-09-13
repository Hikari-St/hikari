const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Resolve cargo binary path
let cargoBin = 'cargo';
const userCargo = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cargo', 'bin', process.platform === 'win32' ? 'cargo.exe' : 'cargo');

if (fs.existsSync(userCargo)) {
  cargoBin = userCargo;
}

console.log(`[Hikari Test Runner] Executing Soroban smart contract test suite via ${cargoBin}...`);
const result = spawnSync(cargoBin, ['test', '--manifest-path', 'contracts/Cargo.toml', '--workspace'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${path.dirname(cargoBin)}${path.delimiter}${process.env.PATH}`,
  },
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
console.log('[Hikari Test Runner] All Soroban smart contract unit tests passed successfully!');
