/// <reference types="vite-plugin-electron/electron-env" />
/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly DATABASE_URL: string
  }
}
