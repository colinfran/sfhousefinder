import path from "node:path"
import { fileURLToPath } from "node:url"

import nextEnv from "@next/env"

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirPath = path.dirname(currentFilePath)
const workspaceRootPath = path.resolve(currentDirPath, "..")
const { loadEnvConfig } = nextEnv

loadEnvConfig(workspaceRootPath, globalThis.process.env.NODE_ENV !== "production")

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
