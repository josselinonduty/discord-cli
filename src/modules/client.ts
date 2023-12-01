import "./env.js";
import DiscordCLI from "../lib/DiscordCLI.js";

const client = new DiscordCLI({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    serverHost: process.env.SERVER_HOST,
    serverPort: +process.env.SERVER_PORT,
    serverProtocol: process.env.SERVER_PROTOCOL,
    redirectPath: process.env.REDIRECT_PATH,
    scopes: ["identify", "guilds"],
});

export default client;
