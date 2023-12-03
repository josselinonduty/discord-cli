import DiscordCLI from "../lib/DiscordCLI.js";

const client = new DiscordCLI({
    host: "localhost",
    port: 3310,
    protocol: "http",
    callback: "/callback",
    scopes: ["identify", "guilds"],
});

export default client;
