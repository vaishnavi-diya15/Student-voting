require("dotenv").config();

const bcrypt = require("bcryptjs");
const readline = require("node:readline");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");

const ask = (question) => {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => terminal.question(question, (answer) => {
    terminal.close();
    resolve(answer.trim());
  }));
};

const askPassword = () => new Promise((resolve, reject) => {
  const { stdin, stdout } = process;
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    reject(new Error("Run npm run create-admin in an interactive terminal."));
    return;
  }

  let password = "";
  stdout.write("Admin password: ");
  stdin.setRawMode(true);
  stdin.resume();
  const onData = (buffer) => {
    for (const character of buffer.toString("utf8")) {
      if (character === "\u0003") {
        stdin.setRawMode(false);
        stdin.off("data", onData);
        stdout.write("\n");
        reject(new Error("Admin setup cancelled."));
        return;
      }
      if (character === "\r" || character === "\n") {
        stdin.setRawMode(false);
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(password);
        return;
      }
      if (character === "\u007f" || character === "\b") {
        password = password.slice(0, -1);
      } else {
        password += character;
      }
    }
  };
  stdin.on("data", onData);
});

const createFirstAdmin = async () => {
  if (!(await connectDB())) throw new Error("Could not connect to MongoDB.");
  if (await Admin.exists({})) throw new Error("An admin already exists; bootstrap is first-admin only.");

  const username = await ask("Admin username: ");
  const email = (await ask("Admin email: ")).toLowerCase();
  const password = await askPassword();
  if (!username || !email || !password) throw new Error("Username, email, and password are required.");
  if (password.length < 12) throw new Error("Use an admin password with at least 12 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ username, email, passwordHash });
  console.log(`[admin] Created first admin account for ${username}.`);
};

createFirstAdmin()
  .catch((error) => {
    console.error(`[admin] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });