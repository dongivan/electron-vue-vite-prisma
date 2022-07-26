# electron-vite-vue-prisma

本模板基于[`electron-vite-vue@2.0`](https://github.com/electron-vite/electron-vite-vue)，整合[`prisma@4.0`](https://github.com/prisma/prisma)。

## 在渲染进程使用`prisma`
`prisma`**不能**在**浏览器**中使用，所以也不可以直接在渲染进程中使用。有两个办法解决这个问题：

1. 在主进程中使用，然后通过`ipcMain`和`ipcRenderer`与渲染进程交互。
2. 在独立上下文中使用，然后在preload script中将api暴露在全局变量`window`中。

本模板使用了第2个办法:
```ts
// electron/main/index.ts
async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: join(ROOT_PATH.public, 'favicon.ico'),
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: true, // <== 将`contextIsolation`设置为`true`
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
const users = db.findUsers()
```

### 那我为什么不直接暴露一个`PrismaClient`实例？
在`prisma`的早期保本应该可以，但是我在版本4中无法像这样实现：
```ts
// electron/preload/index.ts
import { contextBridge } from "electron";
import { PrismaClient } from "@prisma/client";

const _prisma = new PrismaClient();
contextBridge.exposeInMainWorld("prisma", () => _prisma);
```
实例变量`_prisma`会是一个代理，`electron`无法暴露它。如果你可以通过这样的方式成功暴露，请一定要教给我（比如开一个issue）。

## 使`prisma`在打包后正常运行
以下目录在使用`electron-builder`打包时必须一同打包：
- `node_modules/.prisma`: 使用`npx prisma generate`命令之后`prisma`会在`node_modules/.prisma`目录中生成相关代码。我们在编码时引入 `@prisma/client`，实际上是引入了`node_modules/.prisma/client`。
- `node_modules/@prisma`
- `node_modules/prisma`: 如果使用`prisma`的数据库迁移功能，那么CLI需要打包。
- `prisma`: schema文件和数据库迁移文件。
- `.env` file: 在本模板中`.env`在打包时会被`.production/.env`替换。
- 如果使用`sqlite`，数据库文件也许也需要打包。本模板中的数据库文件是`prisma/dev.db`。你可以在`.env`中修改（不要忘了`.production/.env`）。

相关细节请在[electron-builder.json5](electron-builder.json5)中查看。

## 怎么在我电脑上跑不起来？
1. 如果你要在渲染进程使用Node.js的API（见接下来的配置代码），那么一定不要将`vite`升级到版本3：
```ts
export default defineConfig({
  plugins: [
    electron({
      renderer: {}, // <== 如果你要使用`vite@3`，必须移除此行
      main: { /* */ },
      preload: { /* */ }
    })
    /* other plugins */
  ],
  /* other config */
});
```
2. 注释掉prisma的相关代码然后重试一下，也许是`electron-vite-vue`的bug呢 :)
3. 在我这确实可以跑（Windows 11） :P