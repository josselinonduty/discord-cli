import { defineConfig } from "rollup";

export default defineConfig({
    input: "dist/setup.js",
    output: {
        file: "bin/discord-cli.js",
        format: "cjs",
    },
    external: [
        "dotenv",
        "commander",
        "node:path",
        "@discordjs/core",
        "@discordjs/rest",
        "openurl",
        "keytar",
        "crypto",
        "express",
    ],
    context: "this",
});
