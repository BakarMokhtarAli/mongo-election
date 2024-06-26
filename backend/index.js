import chalk from "chalk";
import app from "./app.js";
import connect from "./config/db.js";

const PORT = 8000;

app.listen(PORT, () => {
  console.log(chalk.cyanBright("app running on port", PORT));
});
