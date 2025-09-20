#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { ESLint } from 'eslint';
import prettier from 'prettier';
import { fileURLToPath } from 'url';
import JSON5 from "json5";
import { parseSync } from "@babel/core";
import * as t from "@babel/types";
import postcss from "postcss";
import discardComments from "postcss-discard-comments";

import traverseModule from "@babel/traverse";
import generateModule from "@babel/generator";

const generate = generateModule.default;
const traverse = traverseModule.default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.length < 3) {
  console.error('Usage: npm run lint <path-to-webextension-zip>');
  process.exit(1);
}

const zipFile = path.resolve(process.argv[2]);
const tempDir = path.join(__dirname, 'tmp_extract');

// Cleanup previous extraction
fs.removeSync(tempDir);
fs.mkdirSync(tempDir);

console.log(`Extracting ${zipFile}...`);
const zip = new AdmZip(zipFile);
zip.extractAllTo(tempDir, true);

// ESLint automatically loads eslint.config.js
const eslint = new ESLint({ fix: true });

// Inline Prettier config
const prettierConfig = {
  singleQuote: false,
  trailingComma: "es5",
  printWidth: 100,
};

// Recursively gather all files
async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getAllFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

// Remove unused parameters using Babel AST
function removeUnusedParamsAndComments(code) {
  // Parse code to AST
  const ast = parseSync(code, { filename: "file.js", parserOpts: { sourceType: "module" } });

  traverse(ast, {
    Function(path) {
      const used = new Set();

      // Collect all identifiers used in function body
      path.traverse({
        Identifier(innerPath) {
          if (!t.isFunction(innerPath.parent)) {
            used.add(innerPath.node.name);
          }
        }
      });

      // Filter out unused params (keep those starting with _)
      path.node.params = path.node.params.filter(p => t.isIdentifier(p) && (used.has(p.name)));
    }
  });

  // Generate code from AST without comments
  const { code: transformed } = generate(ast, { comments: false });
  return transformed;
}

async function lintFile(file) {
  const ext = path.extname(file).toLowerCase();
  let code = await fs.readFile(file, 'utf8');
  // Strip BOM
  if (code.charCodeAt(0) === 0xfeff) code = code.slice(1);

  try {
    if (ext === '.js') {
      // Remove unused parameters and comments
      code = removeUnusedParamsAndComments(code);

      // ESLint fix
      const results = await eslint.lintText(code, { filePath: file });
      await ESLint.outputFixes(results);
      code = results[0].output || code;

      // Prettier formatting
      code = await prettier.format(code, { parser: 'babel', ...prettierConfig });

    } else if (ext === '.json') {
      code = JSON.stringify(JSON5.parse(code), null, 2);
    } else if (ext === '.html') {
      code = await prettier.format(code, { parser: 'html', ...prettierConfig });
    } else if (ext === '.css') {
      // Remove comments
      const result = await postcss([discardComments({ removeAll: true })]).process(code, { from: undefined });
      code = await prettier.format(result.css, { parser: "css", ...prettierConfig });
    } else {
      return;
    }

    await fs.writeFile(file, code, 'utf8');
    console.log(`Linted: ${path.relative(tempDir, file)}`);
  } catch (err) {
    console.error(`Error linting ${path.relative(tempDir, file)}`, err);
  }
}

(async () => {
  const all = await getAllFiles(tempDir);
  const files = all.filter(f => ['.js', '.json', '.html', '.css'].includes(path.extname(f).toLowerCase()));

  for (const file of files) {
    await lintFile(file);
  }

  const newZipName = path.join(path.dirname(zipFile), 'linted_' + path.basename(zipFile));
  if (fs.existsSync(newZipName)) {
    fs.removeSync(newZipName);
  }

  const lintedZip = new AdmZip();
  const allFiles = await getAllFiles(tempDir);
  for (const absPath of allFiles) {
    const relPath = path.relative(tempDir, absPath);
    const zipFolder = path.dirname(relPath);
    lintedZip.addLocalFile(absPath, zipFolder === '.' ? '' : zipFolder);
  }
  lintedZip.writeZip(newZipName);
  console.log(`Linted zip created: ${newZipName}`);
})();
