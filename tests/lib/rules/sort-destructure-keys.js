const rule = require('../../../lib/rules/sort-destructure-keys');
const RuleTester = require('eslint').RuleTester;


const ruleTester = new RuleTester({
    parserOptions: {
        ecmaVersion: 2015
    }
});

ruleTester.run('sort-destructure-keys', rule, {
    valid: [
        'const {a, b} = someObj;'
    ],
    invalid: [
        {
            code: 'const {b, a} = someObj;',
            errors: [{
                message: 'Fill me in.',
                type: 'Me too'
            }]
        }
    ]
});
