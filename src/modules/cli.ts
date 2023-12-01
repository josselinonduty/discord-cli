import { Command } from "commander";

import client from "../modules/client.js";

const program = new Command();

program
    .command("login")
    .description("Login to Discord")
    .action(async () => {
        await client.login();
    });

program
    .command("logout")
    .description("Logout of Discord")
    .action(async () => {
        await client.logout();
    });

program.parse(process.argv);

export default program;
