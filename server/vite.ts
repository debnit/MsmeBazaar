import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { type Server } from "http";

// Only import Vite in development
let createViteServer: any = null;
let createLogger: any = null;
let viteConfig: any = null;

if (process.env.NODE_ENV !== "production") {
  try {
    const viteModule = await import("vite");
    createViteServer = viteModule.createServer;
    createLogger = viteModule.createLogger;
    viteConfig = (await import("../vite.config.js")).default;
  } catch (error) {
    console.warn("Vite not available, running in production mode");
  }
}

const viteLogger = createLogger?.() || {
  error: console.error,
  warn: console.warn,
  info: console.log,
};

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  if (process.env.NODE_ENV === "production") {
    log("Skipping Vite setup in production");
    return;
  }

  if (!createViteServer || !viteConfig) {
    log("Vite not available, skipping development setup");
    return;
  }

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: any, options: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Use process.cwd() instead of import.meta.dirname for Node.js compatibility
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use process.cwd() instead of import.meta.dirname for Node.js compatibility
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
