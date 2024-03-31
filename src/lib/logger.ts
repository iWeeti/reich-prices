import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: new Date().toISOString() }),
    format.simple(),
    format.label()
  ),
  level: "debug",
  transports: [new transports.Console()],
});
