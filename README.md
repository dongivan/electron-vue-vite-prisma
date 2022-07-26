# electron-vite-vue-prisma

This boilerplate based on [`electron-vite-vue@2.0`](https://github.com/electron-vite/electron-vite-vue) and integrates [`prisma@4.0`](https://github.com/prisma/prisma).

## Get `prisma` work in renderer process
`prisma` **cannot** work in a **browser**, so we cannot use it directly in the renderer process. There are two ways to use it with `electron`:

1. Use `prisma` in main process, and transfer commands & data with renderer process by `ipcMain` & `ipcRenderer` of `electron`.
2. Use `prisma` in the isolated context and expose apis to the global var `window` in preload script.

This template uses the second way:
```ts
// electron/main/index.ts
async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(ROOT_PATH.public, 'favicon.ico'),
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: true, // <== Setting `contextIsolation` to `true` here
    },
  });

  // other codes
}
```
```ts
// electron/preload/index.ts
import { contextBridge } from "electron";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

contextBridge.exposeInMainWorld("database", {
  findUsers: async function() {
    return prisma.users.findMany({});
  }
});
```
```ts
// src/main.ts
const db = (window as any).database;
const users = db.findUsers();
```

### Why don't I just expose a `PrismaClient` instance?
Maybe it could work in early version of `prisma`, however I cannot do it at version 4 like this:
```ts
// electron/preload/index.ts
import { contextBridge } from "electron";
import { PrismaClient } from "@prisma/client";

const _prisma = new PrismaClient();
contextBridge.exposeInMainWorld("prisma", () => _prisma);
```
The `_prisma` is a proxied instance, and `electron` cannot expose it by this way. If you can make it work, please let me know (open an issue e.g.).

## Get `prisma` work after package
There are some directories or files which must be packaged while building by `electron-builder`:
- `node_modules/.prisma`: `prisma` will generate a lot of codes in `node_modules/.prisma` after we execute `npx prisma generate`. When we import something from `@prisma/client`, we actually import them from `node_modules/.prisma/client`.
- `node_modules/@prisma`
- `node_modules/prisma`: we would use the cli of `prisma` if we decide to use the migration feature.
- `prisma`: the schema file and migration files.
- `.env` file: in this template we will replace `.env` with `.production/.env` while building.
- The database file may should be packaged if we use `sqlite`. In this template it is `prisma/dev.db`. You can change it by modifying `.env` (and remember `.production/.env`)

Please see [electron-builder.json5](electron-builder.json5) for details.

## Why does it not work on my computer?
1. Do not upgrade vite to version 3 if you want to use Node.js in renderer process which means you have this line in `vite.config.js`:
```ts
export default defineConfig({
  plugins: [
    electron({
      renderer: {}, // <== remove this line if you want this template work on `vite@3`
      main: { /* */ },
      preload: { /* */ }
    })
    /* other plugins */
  ],
  /* other config */
});
```
2. Comment codes about prisma and retry, maybe there are some bugs on `electron-vite-vue` :)
3. Good luck and it really works on my current laptop (Windows 11) :P