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
