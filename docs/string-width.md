---
description: Modern alternatives to the string-width package for measuring the visual width of a string
replacements:
  - fast-string-width
---

# Replacements for `string-width`

## `fast-string-width`

[`fast-string-width`](https://github.com/fabiospampinato/fast-string-width) is a drop‑in replacement for `string-width`
that’s faster and smaller.

```ts
import stringWidth from 'string-width' // [!code --]
import stringWidth from 'fast-string-width' // [!code ++]

console.log(stringWidth('abc')) // 3
console.log(stringWidth('👩‍👩‍👧‍👦')) // 1
console.log(stringWidth('\u001B[31mhello\u001B[39m')) // 5
```

## Bun API (native)

If you’re on Bun ≥ 1.0.29, you can use the built‑in [`stringWidth`](https://bun.com/reference/bun/stringWidth):

```ts
import stringWidth from 'string-width' // [!code --]
import { stringWidth } from 'bun' // [!code ++]

console.log(stringWidth('abc')) // 3
console.log(stringWidth('👩‍👩‍👧‍👦')) // 1
console.log(stringWidth('\u001B[31mhello\u001B[39m')) // 5
console.log(
  stringWidth('\u001B[31mhello\u001B[39m', { countAnsiEscapeCodes: false })
) // 5
```
