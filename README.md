# CakeML WebAssembly Runtime

This repository contains everything needed to run a
CakeML program compiled to WebAssembly in the browser.

What it offers in particular is a basic harness that will
take the WebAssembly module (obtained through CakeML) and
instantiate it with links to a JS implementation of the FFI.

## Build Instructions

```bash
# Install dependencies such as Webpack and BrowserFS
npm install
# Place your module in out
cp .../main.wasm out
# Generate a HTML that will bundle everything
npm run build
# Done! Open out/index.html in your browser.
```

## Dependencies

The CakeML basis offers foreign functions that enable
file I/O. Instead of implementing our own file system
(probably POSIX compatible, mocking linux syscalls)
we implement those foreign functions by wrapping
[BrowserFS](https://github.com/jvilk/BrowserFS).
