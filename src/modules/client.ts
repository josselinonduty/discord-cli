import "./env.js";
import DiscordCLI from "../lib/DiscordCLI.js";

const client = new DiscordCLI({
    scopes: ["identify", "guilds"],
});

export default client;
