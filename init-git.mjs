import fs from "fs";
import path from "path";
import git from "isomorphic-git";

const rootDir = process.cwd();

async function initRepo() {
  console.log("Initializing Git repository at:", rootDir);

  await git.init({ fs, dir: rootDir, defaultBranch: "main" });

  // Leer todos los archivos excluyendo los ignorados
  const filesToStage = [];

  function walk(dir) {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (
        item === "node_modules" ||
        item === ".next" ||
        item === ".git" ||
        item === ".env.local" ||
        item.endsWith(".DS_Store")
      ) {
        continue;
      }
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else {
        const relPath = path.relative(rootDir, fullPath);
        filesToStage.push(relPath);
      }
    }
  }

  walk(rootDir);

  console.log(`Staging ${filesToStage.length} files...`);
  for (const filepath of filesToStage) {
    await git.add({ fs, dir: rootDir, filepath });
  }

  const sha = await git.commit({
    fs,
    dir: rootDir,
    author: {
      name: "Matias",
      email: "matias@example.com",
    },
    message: "feat: initial commit for Panel de Vida personal dashboard",
  });

  console.log("Git commit created successfully! Commit SHA:", sha);
}

initRepo().catch(console.error);
