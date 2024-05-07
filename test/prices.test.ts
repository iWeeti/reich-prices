import { describe, expect, it, test } from "@jest/globals";
import { formatPrice } from "../src/lib/prices";

const locks = {
    bgl: "bgl",
    dl: "dl",
    wl: "wl",
};

describe("Price Formatting", () => {
    it("should format positive numbers correctly", () => {
        const expected = `<p>1</p> <img src="bgl" /><p>23</p> <img src="dl" /><p>45</p> <img src="wl" />`;
        const formatted = formatPrice({ minWls: 12345, maxWls: null }, locks);

        expect(formatted).toEqual(expected);
    });
    it("should format negative numbers correctly", () => {
        const expected = `<p>-23</p> <img src="dl" /><p>-45</p> <img src="wl" />`;
        const formatted = formatPrice({ minWls: -2345, maxWls: null }, locks);

        expect(formatted).toEqual(expected);
    });
    it("should format negative numbers correctly", () => {
        const expected = `<p>-12</p> <img src="bgl" /><p>-23</p> <img src="dl" /><p>-45</p> <img src="wl" />`;
        const formatted = formatPrice({ minWls: -122345, maxWls: null }, locks);

        expect(formatted).toEqual(expected);
    });
});
