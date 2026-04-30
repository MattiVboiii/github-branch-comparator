import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: undefined,
  redact: {
    paths: [
      "token",
      "accessToken",
      "headers.authorization",
      "req.headers.authorization",
    ],
    remove: true,
  },
});
