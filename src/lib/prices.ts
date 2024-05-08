import nodeHtmlToImage from "node-html-to-image";
import { db } from "./database";
import { priceRowItems, priceRows, prices } from "./database/schema";
import { readFile } from "fs/promises";
import { and, desc, eq } from "drizzle-orm";
import { getItemById } from "./items";
import * as fs from "fs/promises";
import path from "path";

export async function getOrCreatePriceRowItem({
    rowId,
    itemId,
}: {
    rowId: number;
    itemId: number;
}) {
    const [item] = await db
        .insert(priceRowItems)
        .values({
            itemId,
            priceRowId: rowId,
        })
        .onConflictDoNothing({
            target: [priceRowItems.itemId, priceRowItems.priceRowId],
        })
        .returning();

    if (!item) {
        const existing = await db.query.priceRowItems.findFirst({
            where: and(
                eq(priceRowItems.itemId, itemId),
                eq(priceRowItems.priceRowId, rowId)
            ),
        });

        if (!existing) {
            throw new Error(
                "Failed to create or get an existing price row item."
            );
        }

        return existing;
    }

    return item;
}

export async function getPriceRows() {
    return await db.query.priceRows.findMany();
}

async function loadLockImages() {
    const wlFile = await fs.readFile(
        path.join(process.env.LOCKS_PATH ?? "/app/data", "wl.webp")
    );
    const dlFile = await fs.readFile(
        path.join(process.env.LOCKS_PATH ?? "/app/data", "dl.webp")
    );
    const bglFile = await fs.readFile(
        path.join(process.env.LOCKS_PATH ?? "/app/data", "bgl.webp")
    );

    const wlBase64Image = Buffer.from(wlFile).toString("base64");
    const dlBase64Image = Buffer.from(dlFile).toString("base64");
    const bglBase64Image = Buffer.from(bglFile).toString("base64");

    return {
        wl: `data:image/jpeg;base64,${wlBase64Image}`,
        dl: `data:image/jpeg;base64,${dlBase64Image}`,
        bgl: `data:image/jpeg;base64,${bglBase64Image}`,
    };
}

type Locks = Awaited<ReturnType<typeof loadLockImages>>;

export function formatPrice(
    current: { minWls: number; maxWls: number | null },
    locks: Locks
): string {
    let wls =
        current.maxWls !== null
            ? current.minWls + (current.maxWls - current.minWls) / 2
            : current.minWls;

    if (current.maxWls && current.minWls > current.maxWls) wls = current.minWls;
    const bgls = Math[wls >= 0 ? "floor" : "ceil"](wls / 10_000);
    wls %= 10_000;
    const dls = Math[wls >= 0 ? "floor" : "ceil"](wls / 100);
    wls %= 100;

    let s =
        current.minWls !== current.maxWls && current.maxWls !== null ? "~" : "";
    if (bgls !== 0) {
        s += `<p>${bgls}</p> <img src="${locks.bgl}" />`;
    }
    if (dls !== 0) {
        s += `<p>${dls}</p> <img src="${locks.dl}" />`;
    }
    if (wls !== 0) {
        s += `<p>${wls}</p> <img src="${locks.wl}" />`;
    }

    if (s.length === 0) {
        s += "±0";
    }

    return s;
}

export async function generatePriceTableImage(rowId: number) {
    const locks = await loadLockImages();
    const template = await readFile("./data/price-table.html");
    const row = await db.query.priceRows.findFirst({
        where: eq(priceRows.id, rowId),
        with: {
            rowItems: {
                with: {
                    prices: {
                        limit: 2,
                        orderBy: desc(prices.createdAt),
                    },
                },
            },
        },
    });
    const image = await nodeHtmlToImage({
        html: template.toString(),
        content: {
            prices: await Promise.all(
                (row?.rowItems ?? []).map(async (rowItem) => {
                    const [current, last] = rowItem.prices;

                    const price = formatPrice(
                        { minWls: current.minWLs, maxWls: current.maxWLs },
                        locks
                    );
                    const lastPrice = last
                        ? formatPrice(
                              { minWls: last.minWLs, maxWls: last.maxWLs },
                              locks
                          )
                        : "N/A";
                    const priceChangeAmount = last
                        ? current.minWLs - last.minWLs
                        : 0;

                    const change = formatPrice(
                        {
                            minWls: last ? current.minWLs - last.minWLs : 0,
                            maxWls: null,
                        },
                        locks
                    );
                    const itemName = (await getItemById(rowItem.itemId)).name;
                    const changeText =
                        priceChangeAmount !== 0
                            ? `${priceChangeAmount > 0 ? "+" : ""}${change}`
                            : 0 ?? "N/A";

                    return {
                        name: itemName,
                        lastPrice,
                        price,
                        change: changeText,
                        changeStyle: `
                                background-color: ${
                                    priceChangeAmount === 0
                                        ? "yellow; color: black;"
                                        : current.minWLs > (last?.minWLs ?? 0)
                                        ? "green"
                                        : "#780c0c"
                                };
                            `,
                        changeTextStyle: `${
                            current.minWLs < (last?.minWLs ?? 0)
                                ? "color: white;"
                                : ""
                        }`,
                    };
                })
            ),
        },
        waitUntil: "networkidle2",
        type: "png",
        transparent: true,
    });

    return image as Buffer;
}
