import { Command } from "commander";

import client from "../modules/client.js";
client.setupCLI();

const program = new Command();

program
    .command("login")
    .description("Login to Discord")
    .action(async () => {
        await client.login();
    });

program.parse(process.argv);

export default program;
