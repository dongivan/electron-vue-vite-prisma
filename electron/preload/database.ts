import { ipcRenderer } from "electron";
import { PrismaClient } from "@prisma/client";
import useUsers from "./database/users";
import path from "path"
import fs from "fs"
import { fork } from "child_process";
import { config } from "dotenv"

const appPath = ipcRenderer.sendSync("app:getAppPath");

config();
const dbUrl = process.env["DATABASE_URL"];

let params = undefined
if (import.meta.env.PROD && dbUrl?.startsWith("file:")) {
  const userDataPath = ipcRenderer.sendSync("app:getPath", "userData")
  const dbPath = path.join(userDataPath, dbUrl.substring(5))
  params = {
    datasources: {
      db: {
        url: `file:${dbPath}`
      }
    } 
  }
}

const prisma = new PrismaClient(params as any);

const runPrismaCommand = async function(args: string) {
  const exitCode = await new Promise((resolve, reject) => {
    const executePath = path.join(appPath)
    const enginePath = path.join(`${appPath}.unpacked`, "node_modules", "@prisma", "engines", "migration-engine-windows.exe")
    const child = fork(executePath +"/node_modules/prisma/build/index.js", args.split(" "), {
      stdio: "pipe",
      env: {
        ...process.env,
        ...(params.datasources?.db?.url ? { DATABASE_URL: params.datasources.db.url } : {}),
        PRISMA_MIGRATION_ENGINE_BINARY: enginePath,
      }
    })
    child.on("error", e => {
      reject(new Error(`Run \`prisma ${args}\` failed. \nmessage:\n${e.message}`))
    })
    child.on("close", (code) => {
      resolve(code)
    })
    child.stderr?.on("data", data => {
      reject(new Error(`Run \`prisma ${args}\` failed. \nstderr message:\n${data.toString()}`))
    })
  })
  return exitCode
}

const getLastMigration = function() {
  const migrationsPath = path.join(appPath, "prisma", "migrations")
  if (!fs.existsSync(migrationsPath)) {
    return undefined
  }
  const migrations = fs.readdirSync(migrationsPath).filter(filename => filename != "migration_lock.toml")
  if (migrations.length == 0) {
    return undefined
  }
  migrations.sort()
  return migrations[migrations.length - 1]
}

const migrate = async function() {
  if (import.meta.env.PROD) {
    const schemaPath = path.join(`${appPath}.unpacked`, "prisma", "schema.prisma")
    const exitCode = await runPrismaCommand(`migrate deploy --schema ${schemaPath}`)
    if (exitCode !== 0) {
      throw new Error(`Executed command \`prisma migrate deploy\` failed. ExitCode: ${exitCode}.`)
    }
  } else {
    console.warn("Database migration request detected in non-production environment!");
    console.warn("Maybe you've executed `prisma db push`, and then the table `_prisma_migrations` was dropped.")
  }
  return
};

const initialize = async function() {
  try {
    await prisma.$connect()
  } catch (e) {
    /*
      The error thrown with errorCode == "P1002" means that there is no such `database` at `server` or `file system`.
      However when using sqlite, the sqlite database file will be created automatically. So when "P1002" error
      thrown, we should try to create the database by using `prisma migrate`.
    */
    if (e instanceof Error && (e as any).errorCode == "P1003") {
      return migrate()
    } else {
      throw e
    }
  }

  let records: {
    migration_name: string
  }[] = [];

  try {
    records = await prisma.$queryRaw`SELECT * FROM _prisma_migrations ORDER BY migration_name DESC LIMIT 1`;
  } catch (e) {
    /*
      Fetching migrations data failed.
      Try to migrate.
    */
    return migrate()
  }

  const record = records.length > 0 ? records[0] : { migration_name: "" }
  const lastMigration = getLastMigration()
  if (lastMigration && record.migration_name !== lastMigration) {
    return migrate()
  }
}

const api = {
  initialize,
  users: useUsers(prisma),
};
export type Api = typeof api;

export default api;
