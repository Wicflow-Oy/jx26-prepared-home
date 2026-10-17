// Metro config for Prepared Home.
// The rules engine lives outside this project (../packages/engine) as TypeScript source.
// Metro watches that folder and resolves "@prepared-home/engine" straight to its source entry,
// so the app works whether or not the file: dependency link exists in node_modules.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const engineRoot = path.resolve(projectRoot, "../packages/engine");
const engineEntry = path.join(engineRoot, "src", "index.ts");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), engineRoot];

// Resolve every bare import (also those inside the engine) from this app's node_modules only.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, "node_modules")];

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@prepared-home/engine") {
    return { type: "sourceFile", filePath: engineEntry };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
