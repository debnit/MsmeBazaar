import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { type Server } from "http";

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
  // In production, we don't set up Vite at all
  if (process.env.NODE_ENV === "production") {
    log("Production mode: Skipping Vite development server setup");
    return;
  }

  // Only in development, dynamically import and setup Vite
  log("Development mode: Setting up Vite development server");
  
  try {
    // Dynamic imports only happen in development
    const { createServer: createViteServer, createLogger } = await import("vite");
    const viteConfig = (await import("../vite.config.js")).default;
    
    const viteLogger = createLogger();

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
        const clientTemplate = path.resolve(
          process.cwd(),
          "client",
          "index.html",
        );

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

    log("Vite development server setup complete");
  } catch (error) {
    log("Failed to setup Vite development server, falling back to static serving");
    console.error(error);
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  log(`Setting up static file serving from: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Make sure to run 'npm run build:client' first.`,
    );
  }

  // Serve static files
  app.use(express.static(distPath, {
    maxAge: process.env.NODE_ENV === "production" ? "1y" : "0",
    etag: true,
    lastModified: true,
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Application not found. Please build the client first.");
    }
  });

  log("Static file serving setup complete");
}
