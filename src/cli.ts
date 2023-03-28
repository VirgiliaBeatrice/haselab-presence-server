// load a command line interface
import { Command } from "commander";
const program = new Command();

// define a command line interface
program
  .version("0.0.1")
  .description("A simple CLI application")
  .option("-u, --username <value>", "username")
  .option("-p, --password <value>", "password")
  .option("-l, --login", "login")
  .option("-o, --logout", "logout")
  .option("-s, --status", "status")
  .parse(process.argv);

// define a function to execute the login command
function login(username: string, password: string) {
  console.log(`login with username ${username} and password ${password}`);
}

// define a function to execute the logout command
function logout() {
  console.log(`logout`);
}

// define a function to execute the status command
function status() {
  console.log(`status`);
}

// define a function to execute the default command
function defaultCommand() {
  console.log(`no command specified`);
}

// execute the command line interface
if (program.login) {
  login(program.username, program.password);
} else if (program.logout) {
  logout();
} else if (program.status) {
  status();
} else {
  defaultCommand();
}

// add a new command
program
  .command("test")
  .description("test command")
  .action(() => {
    console.log("test command");
  });

// execute the command line interface
program.parse(process.argv);

// define a function to execute the test command
function test() {
  console.log("test command");
}

// add a new command
program.command("test2").description("test2 command").action(test);

// execute the command line interface
program.parse(process.argv);

// add a new command
program
  .command("test3")
  .description("test3 command")
  .action(() => {
    test();
  });

// execute the command line interface
program.parse(process.argv);

// add a new command
program.command("test4").description("test4 command");
