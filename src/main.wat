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
  (global $lab (mut i32) (i32.const 0))
  (global $seg (mut i32) (i32.const 0))

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
          (block
            (block
              (block
                (block
                  (br_table 0 1 2 3 4 5 (get_global $seg))
                )
                ;; 0

                ;; To kill everything:
                (unreachable)
               
                (block
                  (block
                    (block
                      (br_table 0 1 2 (get_global $lab)
                    )
                    ;; 0 0
                  )
                  ;; 0 1
                )
                ;; 0 2
              )
              ;; 1

              ;; To jump (where 2 is the target):
              (set_global $seg (i32.const 2))
              (set_global $lab (i32.const 0))
              (br $switch)
            )
            ;; 3_1

            ;; Falling through is obvious.
          )
          ;; 3_2
               
          ;; To jump to the same location again:
          (br $switch)
        )
        ;; default
      )
      ;; switch

      (br $loop)
    )
    ;; loop

    ;; TODO: Think about what to return.
    (i32.const 0)
  )
)
