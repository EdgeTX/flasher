<a href="url"><img src="https://github.com/EdgeTX/edgetx.github.io/blob/master/images/edgetx-v2.png" align="center" height="150" width="150" ></a>
# EdgeTX Flasher
The new alternative to OpenTX Companion for updating radio firmware and optimizing backups.

### Prebuilt Binaries
Check the releases section for prebuilt rolling-release binaries for the flasher.
<br>
<br>

## Features working
- Downloading firmware and saving
- Themeing and Persistent config storage
- DFU Flashing
- SD Card automated downloads and setups

## In-Progress Features
- YAML Configuration Interface
- SD Card and DFU Backup

## Development
Please note that development of Flasher requires `node@16`. This can be installed with a version manager such as [fnm](https://github.com/Schniz/fnm).

### NPM Tasks

#### Setup project
```
npm install
```

#### Compiles and hot-reloads for development
```
npm run electron:serve
```
This compiles and hot-reloads inside of a fully functioned electron window, just note that DFU-util may not be found in this mode.

#### Create executables for production
```
npm run electron:build
```
This will compile and package into the executable/installer for whatever OS you are running. On MacOS it will create an app, dmg, and zip file. On linux it will create an AppImage, snap, and deb file. On windows it will create an exe.

### Customized configurations
See [Configuration Reference](https://cli.vuejs.org/config/).
