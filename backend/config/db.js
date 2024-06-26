import mongoose from "mongoose";
import chalk from "chalk";
import { dbURL } from "./config.js";

const connect = mongoose
  .connect(dbURL)
  .then(() => {
    console.log(chalk.yellow("Database connected success"));
  })
  .catch((err) => {
    console.log(chalk.cyanBright(`error for connection DB ${chalk.red(err)}`));
  });
export default connect;
