import { contextBridge } from "electron";
import "./splash";
import database from "./database";

const api = {
  database,
};
type Api = typeof api;
declare global {
  interface Window extends Api {}
};

Object.keys(api).forEach(key => contextBridge.exposeInMainWorld(key, api[key]));