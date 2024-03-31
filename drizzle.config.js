"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    driver: "better-sqlite",
    dbCredentials: {
        url: "db.sqlite",
    },
    schema: "./src/lib/database/schema.ts",
    out: "./drizzle",
};
