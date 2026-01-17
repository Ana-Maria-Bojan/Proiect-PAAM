const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const safeMkdirp = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const safeCopyIfMissing = (from, to) => {
  if (!fs.existsSync(from)) return;
  if (fs.existsSync(to)) return;
  safeMkdirp(path.dirname(to));
  fs.copyFileSync(from, to);
};

try {
  const baseJson = path.join(root, 'node_modules', 'expo-module-scripts', 'tsconfig.base.json');

  // Some tooling expects the extensionless path.
  safeCopyIfMissing(
    baseJson,
    path.join(root, 'node_modules', 'expo-module-scripts', 'tsconfig.base')
  );

  // Some validators treat the extends path as relative to the package (wrongly),
  // so we provide a shim under expo-location too.
  safeCopyIfMissing(
    baseJson,
    path.join(root, 'node_modules', 'expo-location', 'expo-module-scripts', 'tsconfig.base')
  );
  safeCopyIfMissing(
    baseJson,
    path.join(root, 'node_modules', 'expo-location', 'expo-module-scripts', 'tsconfig.base.json')
  );
} catch {
  // Don't fail installs because of a dev-environment VS Code diagnostic.
  process.exit(0);
}
