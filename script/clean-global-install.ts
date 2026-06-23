import { file } from "bun"
import os from "os"

const packagePath = `${os.homedir()}/.bun/install/global/package.json`
const lockPath = `${os.homedir()}/.bun/install/global/bun.lock`

const pkgFile = file(packagePath)
if (await pkgFile.exists()) {
  try {
    const data = await pkgFile.json()
    if (data.dependencies) {
      delete data.dependencies[""]
    }
    await Bun.write(pkgFile, JSON.stringify(data, null, 2) + "\n")
  } catch (e) {
    // Ignore parsing errors
  }
}

const lockFile = file(lockPath)
if (await lockFile.exists()) {
  await lockFile.delete()
}
