const naturalCompare = require('natural-compare-lite');

function isRestProperty({type}) {
    return type === 'RestElement' ||
        type === 'RestProperty' ||
        type === 'ExperimentalRestProperty';
}

/**
 * Returns whether or not a node is safe
 * to be sorted.
 */
function shouldCheck(node) {
    const {value} = node;

    return isRestProperty(node) ||
        value.type === 'Identifier' ||
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
        messages: {
            sort: `Expected object keys to be in sorted order. Expected {{first}} to be before {{second}}.`
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
                        !isRestProperty(nextNode) &&
                        naturalCompare(prevNode.key.name, nextNode.key.name) > 0
                    ) {
                        context.report({
                            node: nextNode,
                            messageId: 'sort',
                            data: {
                                first: nextNode.key.name,
                                second: prevNode.key.name
                            }
                        });

                        break;
                    }

                    prevNode = nextNode;
                }
            }
        };
    }
};
