import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

export default defineConfig({
    test: {
        globals: true,
        environment: "node",
    },
    plugins: [
        swc.vite({
            jsc: {
                parser: {
                    syntax: "typescript",
                    decorators: true,
                },
                transform: {
                    legacyDecorator: true,
                    decoratorMetadata: true,
                },
            },
        }),
    ],
});
