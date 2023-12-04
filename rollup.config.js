import { defineConfig } from "rollup";

export default defineConfig({
    input: "dist/setup.js",
    output: {
        file: "bin/discord-cli.js",
        format: "cjs",
    },
    external: [
        "commander",
        "node:path",
        "node:fs",
        "@discordjs/core",
        "@discordjs/rest",
        "openurl",
        "keytar",
        "node:crypto",
        "express",
    ],
    context: "this",
});
