import { describe, expect, it } from "vitest";

import type { CookieOptions, HttpResponse } from "../src/index.js";

describe("CookieOptions", () => {
    it("accepts the documented cookie flags", () => {
        const options: CookieOptions = {
            maxAge: 3600,
            httpOnly: true,
            secure: true,
            path: "/",
            sameSite: "strict",
        };
        const cookies: Record<string, string | undefined> = {};
        const response: HttpResponse = {
            status: 204,
            headers: {},
            body: null,
            cookies,
            setCookie(name, value, cookieOptions) {
                expect(cookieOptions).toEqual(options);
                cookies[name] = value;
            },
            clearCookie(name) {
                delete cookies[name];
            },
        };

        response.setCookie("sid", "abc", options);
        expect(cookies.sid).toBe("abc");
        response.clearCookie("sid", options);
        expect(cookies.sid).toBeUndefined();
    });
});
