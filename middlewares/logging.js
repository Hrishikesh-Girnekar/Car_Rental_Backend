import winston from "winston";
import morgan from "morgan";
import { v4 as uuidv4 } from "uuid";
import { Logtail } from "@logtail/node";
import { LogtailTransport } from "@logtail/winston";

// 🔒 Sanitize sensitive data
const sanitizeBody = (body) => {
  if (!body) return body;
  const cloned = { ...body };

  if (cloned.password) cloned.password = "***";
  if (cloned.token) cloned.token = "***";
  if (cloned.cardNumber) cloned.cardNumber = "***";

  return cloned;
};

// 🧠 Winston Logger
const logger = winston.createLogger({
  level:
    process.env.NODE_ENV === "production"
      ? "info"
      : "debug",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "car-rental-backend" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// 🌐 Production external logging (optional)
if (process.env.NODE_ENV === "production" && process.env.LOGTAIL_TOKEN) {


  const logtail = new Logtail(process.env.LOGTAIL_TOKEN);

  logger.add(new LogtailTransport(logtail));
}

// 🆔 Request ID Middleware
const requestIdMiddleware = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader("x-request-id", req.id);
  next();
};

// 📡 Morgan HTTP Logger
const morganLogger = morgan(
  process.env.NODE_ENV === "production" ? "combined" : "dev",
  {
    stream: {
      write: (message) => {
        logger.info("HTTP Request", {
          message: message.trim(),
          type: "http",
        });
      },
    },
    skip: (req) =>
      req.url === "/api/health" || req.url === "/favicon.ico",
  }
);

// 📥 Request/Response Logger
const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      body: sanitizeBody(req.body),
      timestamp: new Date().toISOString(),
    };

    if (req.user) logData.userId = req.user.id;

    if (res.statusCode >= 400) {
      logger.error("Request failed", logData);
    } else if (duration > 1000) {
      logger.warn("Slow request detected", logData);
    } else {
      logger.info("Request success", logData);
    }
  });

  next();
};

// ❌ Error Logger Middleware
const errorLogger = (err, req, res, next) => {
  logger.error("Unhandled error", {
    requestId: req.id,
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: sanitizeBody(req.body),
    timestamp: new Date().toISOString(),
  });

  next(err);
};

// 🗄️ Database Logger
const dbLogger = {
  logQuery: (collection, operation, query, duration) => {
    logger.info("DB Query", {
      collection,
      operation,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
    });
  },

  logSlowQuery: (collection, operation, query, duration) => {
    logger.warn("Slow DB Query", {
      collection,
      operation,
      query: JSON.stringify(query),
      duration: `${duration}ms`,
    });
  },
};

// 🚗 Domain Loggers (Car Rental)
const bookingLogger = {
  created: (userId, vehicleId) => {
    logger.info("Booking created", { userId, vehicleId });
  },
};

const paymentLogger = {
  success: (userId, amount) => {
    logger.info("Payment success", { userId, amount });
  },
  failed: (userId, error) => {
    logger.error("Payment failed", { userId, error });
  },
};

const vehicleLogger = {
  added: (vehicleId) => {
    logger.info("Vehicle added", { vehicleId });
  },
};

// 💥 Crash Handlers
const setupCrashHandlers = () => {
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Rejection", {
      message: err?.message || err,
      stack: err?.stack,
    });
  });
};

export  {
  logger,
  morganLogger,
  requestLogger,
  errorLogger,
  requestIdMiddleware,
  dbLogger,
  bookingLogger,
  paymentLogger,
  vehicleLogger,
  setupCrashHandlers,
};