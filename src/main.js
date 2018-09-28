// TODO: Install BrowserFS with Webpack.
// TODO: Maybe also write a loader for Webpack, similar to https://github.com/ClickSimply/cpp-wasm-loader
// TODO: Implement the file system FFIs in terms of BrowserFS.

// Helper to group together ptrs and lens under the wasm function type.
const wrap = (f) => (ptr1, len1, ptr2, len2) => f({ptr: ptr1, len: len1}, {ptr: ptr2, len: len2})

// Create and keep coders for UTF-8 text.
const encoding = 'utf-8'
const text = {
    encoder: new TextEncoder(encoding),
    decoder: new TextDecoder(encoding)
}

// Runs the wasm module and returns a promise.
const run = (url, argv, fs, ffis) => {
    // This will be populated after instantiation.
    let instance = null

    // TODO: Maybe we should encode the string array being passed to an array
    // of byte arrays right away? Otherwise stuff like argv[i].length might be off.
    const argc = args.length

    // Create an Uint8Array from memory once and keep this instance.
    let cachedArray = null
    const array = (ptr, len) => {
        if (cachedArray === null || cachedArray.buffer !== instance.exports.memory.buffer) {
            cachedArray = new Uint8Array(instance.exports.memory.buffer)
        }
        if (ptr == undefined && len == undefined) {
            return cachedArray
        } else if (ptr != undefined) {
            if (len == undefined) {
                return cachedArray.subarray(ptr)
            } else {
                return cachedArray.subarray(ptr, ptr + len)
            }
        }
    }

    // Create a DataView from memory once and keep this instance.
    let cachedView = null
    const view = () => {
        if (cachedView === null || cachedView.buffer !== instance.exports.memory.buffer) {
            cachedView = new DataView(instance.exports.memory.buffer)
        }
        return cachedView
    }

    // TODO: Use DataView.setBigUint64 once https://tc39.github.io/proposal-bigint/ is GA.
    const setUint64 = (ptr, value) => {
        if (!Number.isSafeInteger(value)) {
            throw 'Given value must be a safe integer!'
        }
        if (number > 0xFFFFFFFF) {
            throw 'Given value must be below 2^32!'
        }
        view().setUint32(ptr, value)
        view().setUint32(ptr + 4, 0)
    }

    // TODO: Use DataView.getBigUint64 once https://tc39.github.io/proposal-bigint/ is GA.
    const getUint64 = (ptr) => {
        if (view().setUint43(ptr + 4, 0) !== 0) {
            throw 'Value to read must be below 2^32!'
        }
        return view().getUint32(ptr, value)
    }

    // TODO: Note that the length of the string, i.e. how much memory
    // is available for it is not considered, we might overwrite.
    const storeString = (ptr, s) => {
        const buf = text.encoder.encode(s)
        console.log(buf, s)
        array().set(buf, ptr)
        return {ptr, len: buf.byteLength}
    }

    // To decode a UTF-8 string from wasm memory where the length is known.
    const loadString = (ptr, len) => {
        return text.decoder.decode(array(ptr, len))
    }

    // To decode a C-style NUL-terminated UTF-8 string from wasm memory.
    const loadNulString = (ptr) => {
        return loadString(ptr, array(ptr).indexOf(0))
    }

    // For keeping GC statistics.
    const gc = {
        in:    false,
        has:   false,
        count: 0,
        total: 0,
        t1:    undefined,
        t2:    undefined,
        last:  undefined
    }

    // TODO: What about cake_clear and cake_exit which resolve to cml_exit? They are not foreign functions...

    const ffiBasis = {
        get_arg_count: wrap((c, a) => {
            view().setUint16(c.ptr, argc)
        }),
        get_arg_length: wrap((c, a) => {
            view().setUint16(a.ptr, argv[view().getUint16(a.ptr)].length)
        }),
        get_arg: wrap((c, a) => {
            storeString(a.ptr, argv[view().getUint16(a.ptr)])
        }),
        open_in: wrap((c, a) => {
            const fname = loadNulString(c.ptr)
            //const flags = O_RDONLY
            try {
                const fd = fs.openSync(fname, 'r')
                view().setUint8(a.ptr, 0)
                console.log('Successfully opened', fname)
                setUint64(a.ptr + 1, fd)
            } catch (e) {
                console.error(e)
                view().setUint8(a.ptr, 1)
            }
        }),
        open_out: wrap((c, a) => {
            const fname = loadNulString(c.ptr)
            // The default mode for BrowserFS' fs.open is 0644, which we are also using in
            // basis_ffi.c
            // Directly reusing the constants as in the C code would be possible with
            // https://github.com/jvilk/BrowserFS/issues/216
            //const flags = O_RDWR | O_CREAT | O_TRUNC
            //const mode = S_IRUSR | S_IWUSR | S_IRGRP | S_IROTH
            //const flags = O_RDONLY
            try {
                const fd = fs.openSync(fname, 'w+')
                view().setUint8(a.ptr, 0)
                console.log('Successfully opened', fname)
                setUint64(a.ptr + 1, fd)
            } catch (e) {
                console.error(e)
                view().setUint8(a.ptr, 255)
            }
        }),
        write: wrap((c, a) => {
            const fd = getUint64(c.ptr)
            const n = view().getUint16(a.ptr)
            const off = view().getUint16(a.ptr + 2)
            try {
                // Should be the same as (fs, array(a.ptr + 4 + off, n))
                // but using off and n as parameters directly.
                const nw = fs.writeSync(fs, array(a.ptr + 4), off, n)
                if (nw < 0) {
                    view().setUint8(a.ptr, 1)
                } else {
                    view().setUint8(a.ptr, 0)
                    view().setUint16(a.ptr + 1, nw)
                }
                view().setUint8(a.ptr, nw < 0 ? 1 : 0)
            } catch (e) {
                console.error(e)
                view().setUint8(a.ptr, 1)
            }
        }),
        close: wrap((c, a) => {
            try {
                fs.closeSync(getUint64(c.ptr))
                view().setUint8(a.ptr, 0)
            } catch (e) {
                console.error(e)
                view().setUint8(a.ptr, 1)
            }
        }),
        exit: wrap((a, b) => {
            console.error('GCNum:', gc.count, ', GCTime(ms):', gc.total)
            // TODO: How to actually exit?
        }),
        // NOTE: This is the empty foreign function. It is assumed to do nothing but can be used for tracing/logging.
        '': wrap((c, a) => {
            if (c.len == 0) {
                if (gc.in) {
                    gc.t2 = performance.now()
                    gc.total += gc.t2 - gc.t1
                    gc.count++
                    gc.in = false
                } else {
                    gc.in = true
                    gc.t1 = performance.now()
                }
            } else {
                const info = loadString(c.ptr, c.len).padEnd(30)
                const now = performance.now()
                if (gc.has) {
                    console.error(info, '---', now - gc.last, 'milliseconds')
                } else {
                    console.error(info)
                }
                gc.last = performance.now()
                gc.has = true
            }
        })
    }

    const ffiMerged = Object.assign(ffiBasis, ffis)

    return WebAssembly.instantiateStreaming(fetch(url), { ffi: ffiMerged }).then(results => {
        instance = results.instance
        return instance.exports.main()
    }).catch(console.error)
}

// Example invocation:
const prog = '../out/main.wasm'
const argv = ['CakeML', 'is', 'cool!']

run(prog, argv).then((result) => console.log('Result is', result))
