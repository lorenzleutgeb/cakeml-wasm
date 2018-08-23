(module
  (type $ffiFunc (func (param i32 i32 i32 i32)))

  ;; Import foreign functions.
  (import "basis" "get_arg_count" (func $getArgCount (type $ffiFunc)))
  (import "basis" "get_arg_length" (func $getArgLength (type $ffiFunc)))
  (import "basis" "get_arg" (func $getArg (type $ffiFunc)))

  ;; We export memory such that foreign functions can write to it.
  (memory $0 1)
  (export "memory" (memory $0))

  ;; Analoguous to a program counter, this is used to dispatch.
  (global $next (mut i32) (i32.const 0))

  ;; TODO: The number of regs should be guessed, depending on which
  ;; hardware we expect this code to be JITed to in the browser.

  ;; Integer registers:
  (global $ri0 (mut i64) (i64.const 0))
  (global $ri1 (mut i64) (i64.const 0))
  (global $ri2 (mut i64) (i64.const 0))
  (global $ri3 (mut i64) (i64.const 0))
  (global $ri4 (mut i64) (i64.const 0))
  (global $ri5 (mut i64) (i64.const 0))
  (global $ri6 (mut i64) (i64.const 0))
  (global $ri7 (mut i64) (i64.const 0))
  (global $ri8 (mut i64) (i64.const 0))
  (global $ri9 (mut i64) (i64.const 0))

  ;; Floating Point registers:
  (global $rf0 (mut f64) (f64.const 0))
  (global $rf1 (mut f64) (f64.const 0))
  (global $rf2 (mut f64) (f64.const 0))
  (global $rf3 (mut f64) (f64.const 0))
  (global $rf4 (mut f64) (f64.const 0))

  (func $main
    (export "main")

    ;; argc value
    (param $argc i32)

    ;; Pointer to argv in memory.
    (param $argv i32)

    (result i32)

    (loop $loop
      (block $switch
        (block $default
          (block $3_2
            (block $3_1
              (block $2_1
                (block $1_1
                  (br_table
                    $1_1
                    $2_1
                    $3_1
                    $3_2
                    $default

                    (get_global $next)
                  )
                )
                ;; 1_1
              )
              ;; 2_1

              ;; To jump:
              (set_global $next (i32.const 2))
              (br $switch)
            )
            ;; 3_1
          )
          ;; 3_2
        )
        ;; default
      )
      ;; switch

      (br $loop)
    )
    ;; loop

    (i32.const 0)
  )
)
