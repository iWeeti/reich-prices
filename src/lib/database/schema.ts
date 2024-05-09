import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
    text,
    integer,
    sqliteTable,
    int,
    unique,
    uniqueIndex,
    primaryKey,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("user", {
    id: text("id").primaryKey().notNull(),
    isAdmin: integer("is_admin", {
        mode: "boolean",
    }),
});

export type UserSelect = InferSelectModel<typeof users>;
export type UserInsert = InferInsertModel<typeof users>;

export const usersRelations = relations(users, ({ many, one }) => ({
    priceRowAdmin: many(priceRowAdmins),
}));

export const priceRows = sqliteTable("price_row", {
    id: int("id").primaryKey({ autoIncrement: true }).notNull(),
    name: text("name"),
});
export type PriceRowSelect = InferSelectModel<typeof priceRows>;
export type PriceRowInsert = InferInsertModel<typeof priceRows>;

export const priceRowsRelations = relations(priceRows, ({ many, one }) => ({
    admins: many(priceRowAdmins),
    rowItems: many(priceRowItems),
}));

export const priceRowAdmins = sqliteTable("price_row_admin", {
    id: int("id").primaryKey({ autoIncrement: true }).notNull(),
    priceRowId: int("price_row_id")
        .references(() => priceRows.id, { onDelete: "cascade" })
        .notNull(),
    userId: text("user_id")
        .references(() => users.id, { onDelete: "cascade" })
        .notNull(),
});

export type PriceRowAdminSelect = InferSelectModel<typeof priceRowAdmins>;
export type PriceRowAdminInsert = InferInsertModel<typeof priceRowAdmins>;

export const priceRowAdminsRelations = relations(
    priceRowAdmins,
    ({ many, one }) => ({
        priceRow: one(priceRows, {
            fields: [priceRowAdmins.priceRowId],
            references: [priceRows.id],
        }),
        user: one(users, {
            fields: [priceRowAdmins.userId],
            references: [users.id],
        }),
    })
);

export const priceRowItems = sqliteTable(
    "price_row_item",
    {
        id: int("id").primaryKey({ autoIncrement: true }).notNull(),
        priceRowId: int("price_row_id")
            .references(() => priceRows.id, { onDelete: "cascade" })
            .notNull(),
        itemId: int("item_id").notNull(),
    },
    (t) => ({
        priceRowId_itemId_unique: uniqueIndex("price_row_id_item_id_unique").on(
            t.itemId,
            t.priceRowId
        ),
    })
);

export type PriceRowItemSelect = InferSelectModel<typeof priceRowItems>;
export type PriceRowItemInsert = InferInsertModel<typeof priceRowItems>;

export const priceRowItemRelations = relations(
    priceRowItems,
    ({ one, many }) => ({
        priceRow: one(priceRows, {
            fields: [priceRowItems.priceRowId],
            references: [priceRows.id],
        }),
        prices: many(prices),
    })
);

export const prices = sqliteTable("price", {
    id: int("id").primaryKey({ autoIncrement: true }).notNull(),
    priceRowItemId: int("price_row_item_id")
        .references(() => priceRowItems.id, { onDelete: "cascade" })
        .notNull(),
    minCount: int("min_count").notNull(),
    maxCount: int("max_count"),
    minWLs: int("min_wls").notNull(),
    maxWLs: int("max_wls"),
    createdAt: int("created_at", {
        mode: "timestamp_ms",
    })
        .defaultNow()
        .notNull(),
});

export type PriceSelect = InferSelectModel<typeof prices>;
export type PriceInsert = InferInsertModel<typeof prices>;

export const pricesRelations = relations(prices, ({ one, many }) => ({
    priceRowItem: one(priceRowItems, {
        fields: [prices.priceRowItemId],
        references: [priceRowItems.id],
    }),
}));
