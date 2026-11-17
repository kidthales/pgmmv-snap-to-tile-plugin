import console from 'node:console';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { LanguageVariant, SyntaxKind } from 'typescript/unstable/ast';
import { createScanner } from 'typescript/unstable/ast/scanner';

/**
 * Strip non-banner comments from JavaScript source while preserving `/**!` / `/*!` headers.
 *
 * @param {string} source
 * @returns {string}
 */
function stripComments(source) {
  const scanner = createScanner(false, LanguageVariant.Standard, source);
  const chunks = [];
  let token = scanner.scan();

  while (token !== SyntaxKind.EndOfFile) {
    const text = scanner.getTokenText();

    if (token === SyntaxKind.SingleLineCommentTrivia) {
      token = scanner.scan();
      continue;
    }

    if (token === SyntaxKind.MultiLineCommentTrivia) {
      const isBanner = text.startsWith('/**!') || text.startsWith('/*!');
      chunks.push(isBanner ? text : ' ');
      token = scanner.scan();
      continue;
    }

    chunks.push(text);
    token = scanner.scan();
  }

  return chunks.join('');
}

async function main() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  const unscopedName = String(pkg.name).replace(/^@[^/]+\//, '');
  const inputPath = resolve(rootDir, 'plugin.js');
  const defaultOutPath = resolve(rootDir, 'dist', `${unscopedName}-v${pkg.version}.js`);
  const outputPath = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : defaultOutPath;

  const source = readFileSync(inputPath, 'utf8');
  const stripped = stripComments(source);
  const prettierConfig = await prettier.resolveConfig(inputPath);
  const formatted = await prettier.format(stripped, {
    ...(prettierConfig ?? {}),
    filepath: inputPath
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, formatted, 'utf8');
  console.log(`Built ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
