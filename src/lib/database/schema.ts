import { text, integer, sqliteTable, int } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
  id: text("id"),
  isAdmin: integer("is_admin", {
    mode: "boolean",
  }),
});

export const priceRow = sqliteTable("price_row", {
  id: int("id").primaryKey({ autoIncrement: true }).notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  name: text("name"),
});

export const prices = sqliteTable("price_row_item", {
  id: int("id").primaryKey({ autoIncrement: true }).notNull(),
  priceRowId: int("price_row_id")
    .references(() => priceRow.id)
    .notNull(),
  itemId: int("item_id").notNull(),
});
