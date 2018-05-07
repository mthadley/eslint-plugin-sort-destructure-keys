const rule = require('../../../lib/rules/sort-destructure-keys');
const RuleTester = require('eslint').RuleTester;

function msg(before, after) {
    return `Expected object keys to be in sorted order. Expected ${after} to be before ${before}.`;
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
        'const {owner, ...userRoleNames} = FaroConstants.userRoleNames;',
        'const {a, b} = someObj;',
        'const {a: foo, b} = someObj;',
        'const {b, a = b} = someObj;',
        'const {a = {}, b = {}} = someObj;',
        'const {a, b, ...other} = someObj;',
        'const {...other} = someObj;',
        'const func = ({a, b}) => a + b;'
    ],
    invalid: [
        {
            code: 'const {b, a} = someObj;',
            errors: just('b', 'a')
        },
        {
            code: 'const func = ({b, a}) => a + b;',
            errors: just('b', 'a')
        },
        {
            code: 'const {a, c, b} = someObj;',
            errors: just('c', 'b')
        },
        {
            code: 'const {a, c, b = 3} = someObj;',
            errors: just('c', 'b')
        },
        {
            code: 'const {a, b, c: {e, d}} = someObj;',
            errors: just('e', 'd')
        },
        {
            code: 'const {a, c: {e, d}, b} = someObj;',
            errors: [msg('e', 'd'), msg('c', 'b')]
        },
        {
            code: 'const {a, c: {e, d = e}, b} = someObj;',
            errors: [msg('c', 'b')]
        },
        {
            code: 'const {a, c: {e, d}, b = c} = someObj;',
            errors: [msg('e', 'd')]
        },
    ]
});
