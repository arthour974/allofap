import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

// CloudFront → ALB uses HTTP internally. CloudFront forwards X-Forwarded-Proto
// set to the viewer protocol (https); ALB appends its own (http), making the
// header "https, http". With trust proxy: 1 Express reads the first value
// (https) so req.secure = true and express-session sets the Secure cookie.

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ?? [];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (origin.endsWith(".cloudfront.net")) {
        callback(null, true);
        return;
      }
      if (process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }),
);
app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

const sessionSecret = process.env.SESSION_SECRET ?? "fap-expert-dev-secret-change-in-prod";

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

export default app;
