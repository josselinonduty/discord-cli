export default {
    scripts: ["bin/discord-cli.cjs"],
    assets: ["bin/discord-cli.cjs", "static/**/*"],
    targets: [
        "node18-linux-x64",
        "node18-macos-x64",
        "node18-win-x64",
        "node18-alpine-x64",
    ],
    outputPath: "bin",
};