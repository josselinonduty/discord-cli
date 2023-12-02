import { defineConfig } from "rollup";

export default defineConfig({
    input: "dist/setup.js",
    output: {
        file: "bin/discord-cli.bundle.mjs",
        format: "es",
    },
    external: [
        "dotenv",
        "commander",
        "node:path",
        "@discordjs/core",
        "@discordjs/rest",
        "open",
        "keytar",
        "crypto",
        "express",
    ],
    context: "this",
});
