# eslint-plugin-sort-destructure-keys

require object destructure key to be sorted

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-sort-destructure-keys`:

```
$ npm install eslint-plugin-sort-destructure-keys --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-sort-destructure-keys` globally.

## Usage

Add `sort-destructure-keys` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "sort-destructure-keys"
    ]
}
```


Then configure the rule under the rules section.

```json
{
    "rules": {
        "sort-destructure-keys/sort-destructure-keys": 2
    }
}
```

## Rule Options

```json
{
    "sort-destructure-keys/sort-destructure-keys": [2, {"caseSensitive": false}]
}
```

### `caseSensitive`

When `true` the rule will enforce properties to be in case-sensitive order. Default is `false`.

Example of **incorrect** code for the `{"caseSensitive": false}` option:

```js
let {B, a, c} = obj;
```

Example of **correct** code for the `{"caseSensitive": false}` option:

```js
let {a, B, c} = obj;
```

Example of **incorrect** code for the `{"caseSensitive": true}` option:

```js
let {a, B, c} = obj;
```

Example of **correct** code for the `{"caseSensitive": true}` option:

```js
let {B, a, c} = obj;
```

## Changelog

### `1.3.0`

- Add support for `--fix` eslint cli flag

### `1.2.0`

- Add peer dependenct support for eslint `^5.0.0`.

### `1.1.0`

- Add `caseSensitive` option.
