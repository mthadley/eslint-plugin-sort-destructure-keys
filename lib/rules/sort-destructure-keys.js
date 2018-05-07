const naturalCompare = require('natural-compare-lite');

/**
 * Returns whether or not a `Property` is safe
 * to be sorted.
 */
function shouldCheck({value}) {
    return value.type === 'Identifier' ||
        value.type === 'ObjectPattern' ||
        value.type === 'AssignmentPattern' &&
        value.right.type === 'Literal';
}

module.exports = {
    meta: {
        docs: {
            description: 'require object destructure keys to be sorted',
            category: 'Stylistic Issues',
            recommended: false
        },
        schema: []
    },

    create(context) {
        return {
            ObjectPattern(node) {
                /**
                 * If the node is more complex than just basic destructuring
                 * with literal defaults, we just skip it. If some values use
                 * previous values as defaults, then we cannot simply sort them.
                 */
                if (!node.properties.every(shouldCheck)) {
                    return;
                }

                let prevNode = null;

                for (const nextNode of node.properties) {
                    if (prevNode &&
                        naturalCompare(prevNode.key.name, nextNode.key.name) > 0
                    ) {
                        context.report({
                            node: nextNode,
                            message: `Expected object keys to be in sorted order. Expected ${nextNode.key.name} to be before ${prevNode.key.name}.`
                        });

                        break;
                    }

                    prevNode = nextNode;
                }
            }
        };
    }
};
