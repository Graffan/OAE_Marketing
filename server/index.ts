import { config } from "dotenv";
config({ path: ".env" });

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { pool } from "./db.js";
import { randomBytes } from "crypto";

// Validate required env vars
if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}
if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("SESSION_SECRET is required in production. Set it in your .env file.");
    process.exit(1);
  }
  console.warn("SESSION_SECRET not set — using insecure default. Set it in production!");
}

const app = express();

const trustProxy = process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY, 10) : 1;
app.set("trust proxy", trustProxy);

const isDev = process.env.NODE_ENV === "development";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        scriptSrc: isDev
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
          : ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: isDev ? ["'self'", "ws:"] : ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 20,
  message: { error: "Too many authentication attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const PgSession = connectPgSimple(session);
const sessionSecret = process.env.SESSION_SECRET ?? randomBytes(32).toString("hex");

const cookieSecure =
  process.env.SESSION_COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const cookieSameSite =
  (process.env.SESSION_COOKIE_SAMESITE as "lax" | "strict" | "none") ?? "lax";

app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: cookieSecure,
      httpOnly: true,
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      sameSite: cookieSameSite,
    },
    name: "sessionId",
  })
);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined;
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson as Record<string, unknown>;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + "…";
      log(logLine);
    }
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as { status?: number; statusCode?: number; message?: string };
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    const responseMessage =
      process.env.NODE_ENV === "production" && status === 500
        ? "Internal Server Error"
        : message;
    res.status(status).json({ message: responseMessage });
  });

  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = parseInt(process.env.PORT ?? "5003");
  server.listen({ port: PORT, host: "0.0.0.0" }, () => {
    log(`OAE Marketing running on port ${PORT}`);
  });
})();
