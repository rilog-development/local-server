# Rilog local server

**Tool for [rilog-lib](https://github.com/rilog-development/rilog-lib) local storing logs (events) to your drive.**

## Installation and usage
___

### Installing

Clone project and execute:

`yarn && yarn dev`

The project will start at `localhost:2525`

### Usage

Rilog local server stores logs (rilog-lib events) in `logs` folder. For every project it creates unique folder (depends on app name in rilog-lib config). Also, it creates separate log files for every connection inside every project.

> Be sure, that you've started Rilog local server when you're debugging with rilog-lib in localServer mode.

