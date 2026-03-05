const { contextBridge } = require("electron")
const process = require("node:process")

contextBridge.exposeInMainWorld("researchlmDesktop", {
  isDesktop: true,
  platform: process.platform,
})
