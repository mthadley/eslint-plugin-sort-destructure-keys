const rule = require('../../../lib/rules/sort-destructure-keys');
const RuleTester = require('eslint').RuleTester;

function msg(second, first) {
    return {
        messageId: 'sort',
        data: {first, second}
    };
}

function just(...args) {
    return [msg(...args)];
}

const ruleTester = new RuleTester({
    parserOptions: {
        ecmaVersion: 2018
    }
});

ruleTester.run('sort-destructure-keys', rule, {
    valid: [
        `
            const {
                a,
                b
            } = someObj;
        `,
        'const {owner, ...userRoleNames} = FaroConstants.userRoleNames;',
        'const {a, b} = someObj;',
        'const {aBc, abd} = someObj;',
        'const {1: a, 2: b} = someObj;',
        'const {a: foo, b} = someObj;',
        'const {b, a = b} = someObj;',
        'const {a = {}, b = {}} = someObj;',
        'const {a, b, ...other} = someObj;',
        'const {...other} = someObj;',
        'const func = ({a, b}) => a + b;',
        'const {a: {b, c}, d: {e, f: {g}}} = someObj;',
        {
            code: 'const {a, b} = someObj;',
            options: [{ caseSensitive: true }]
        },
        {
            code: 'const {B, a} = someObj;',
            options: [{ caseSensitive: true }]
        },
        {
            code: 'const {aCc, abb} = someObj;',
            options: [{ caseSensitive: true }]
        }
    ],
    invalid: [
        {
            code: `
                const {
                    b,
                    a
                } = someObj;
            `,
            errors: just('b', 'a'),
            output: `
                const {
                    a,
                    b
                } = someObj;
            `
        },
        {
            code: `
                const {
                    b,
                    a = 3,
                    c
                } = someObj;
            `,
            errors: just('b', 'a'),
            output: `
                const {
                    a = 3,
                    b,
                    c
                } = someObj;
            `
        },
        {
            code: `
                const {
                    a,
                    b: {
                        e,
                        d
                    },
                    c
                } = someObj;
            `,
            errors: just('e', 'd'),
            output: `
                const {
                    a,
                    b: {
                        d,
                        e
                    },
                    c
                } = someObj;
            `
        },
        {
            code: 'const {b, a} = someObj;',
            errors: just('b', 'a'),
            output: 'const {a, b} = someObj;'
        },
        {
            code: 'const func = ({b, a}) => a + b;',
            errors: just('b', 'a'),
            output: 'const func = ({a, b}) => a + b;',
        },
        {
            code: 'const {a, c, b} = someObj;',
            errors: just('c', 'b'),
            output: 'const {a, b, c} = someObj;'
        },
        {
            code: 'const {a, c, b = 3} = someObj;',
            errors: just('c', 'b'),
            output: 'const {a, b = 3, c} = someObj;'
        },
        {
            code: 'const {a, b, c: {e, d}} = someObj;',
            errors: just('e', 'd'),
            output: 'const {a, b, c: {d, e}} = someObj;'
        },
        {
            code: 'const {a, c: {e, d}, b} = someObj;',
            errors: [msg('e', 'd'), msg('c', 'b')],
            output: 'const {a, b, c: {e, d}} = someObj;'
        },
        {
            code: 'const {a, c: {e, d = e}, b} = someObj;',
            errors: [msg('c', 'b')],
            output: 'const {a, b, c: {e, d = e}} = someObj;'
        },
        {
            code: 'const {a, c: {e, d}, b = c} = someObj;',
            errors: [msg('e', 'd')],
            output: 'const {a, c: {d, e}, b = c} = someObj;'
        },
        {
            code: 'const {b, a} = someObj;',
            errors: just('b', 'a'),
            output: 'const {a, b} = someObj;',
            options: [{ caseSensitive: true }]
        },
        {
            code: 'const {a, B} = someObj;',
            errors: just('a', 'B'),
            output: 'const {B, a} = someObj;',
            options: [{ caseSensitive: true }]
        },
        {
            code: 'const {abc, aBd} = someObj;',
            errors: just('abc', 'aBd'),
            output: 'const {aBd, abc} = someObj;',
            options: [{ caseSensitive: true }]
        },
    ]
});
