import os from "os"

const pkgFile = Bun.file(`${os.homedir()}/.bun/install/global/package.json`)
if (await pkgFile.exists()) {
  const data = await pkgFile.json()
  if (data.dependencies) {
    delete data.dependencies[""]
  }
  await Bun.write(pkgFile, JSON.stringify(data, null, 2) + "\n")
}

const lockFile = Bun.file(`${os.homedir()}/.bun/install/global/bun.lock`)
if (await lockFile.exists()) {
  await lockFile.delete()
}
