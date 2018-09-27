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
const run = (url, argv, ffis) => {
    // This will be populated after instantiation.
    let instance = null

    // TODO: Maybe we should encode the string array being passed to an array
    // of byte arrays right away? Otherwise stuff like argv[i].length might be off.
    const argc = args.length

    // Create an Uint8Array from memory once and keep this instance.
    let cachedArray = null
    function memory() {
        if (cachedArray === null || cachedArray.buffer !== instance.exports.memory.buffer) {
            cachedArray = new Uint8Array(instance.exports.memory.buffer);
        }
        return cachedArray;
    }

    // Helper to get a Uint8Array backed by wasm memory.
    const view = (ptr, len) => memory().subarray(ptr, ptr + len)

    // TODO: Note that the length of the string, i.e. how much memory
    // is available for it is not considered, we might overwrite.
    const storeString = (s, ptr) => {
        const buf = text.encoder.encode(s)
        console.log(buf, s)
        memory().set(buf, ptr)
        return {ptr, len: buf.byteLength}
    }

    // To decode a UTF-8 string from wasm memory where the length is known.
    const loadString = (ptr, len) => {
        return text.decoder.decode(memory().subarray(ptr, ptr + len))
    }

    // To decode a C-style NUL-terminated UTF-8 string from wasm memory.
    const loadNulString = (ptr) => {
        const len = memory().subarray(ptr).indexOf(0)
        return text.decoder.decode(ptr, len)
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
        get_arg_count: wrap((a, b) => {
            const dst = view(a.ptr, 2)
            dst[0] = argc
            dst[1] = argc / 256
        }),
        get_arg_length: wrap((a, b) => {
            const buf = view(a.ptr, 2)
            const i = buf[0] + (buf[1] * 256)
            if (i >= argv.length) {
                console.error('Index for get_arg_length out of bounds.')
            }
            const res = argv[i].length
            buf[0] = res
            buf[1] = res / 256
        }),
        get_arg: wrap((a, b) => {
            const buf = view(a.ptr, 2)
            const i = buf[0] + (buf[1] * 256)
            if (i >= argv.length) {
                console.error('Index for get_arg_length out of bounds.')
            }
            storeString(argv[i], a.ptr)
        }),
        // To open the file with name at fname (zero-terminated) as O_RDONLY
        // b[0] = 1 indicates error
        // b[0] = 0 indicates success
        // The file descriptor, an i64, should be written to b[1].
        open_in: wrap((fname, b) => { console.error('Foreign function "open_in" is not implemented.') }),
        open_out: wrap((fname, b) => { console.error('Foreign function "open_out" is not implemented.') }),
        write: wrap((a, b) => { console.error('Foreign function "write" is not implemented.') }),
        close: wrap((a, b) => { console.error('Foreign function "close" is not implemented.') }),
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
