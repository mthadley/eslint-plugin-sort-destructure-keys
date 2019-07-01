const naturalCompare = require("natural-compare-lite");

/**
 * Get's the "name" of the node, which could be an Identifier,
 * StringLiteral, or NumberLiteral.
 */
function getNodeName(node) {
  return typeof node.name === "undefined" ? node.value.toString() : node.name;
}

/**
 * Determines if the node is a RestElement, accounting for different
 * parsers.
 */
function isRestProperty({ type }) {
  return (
    type === "RestElement" ||
    type === "RestProperty" ||
    type === "ExperimentalRestProperty"
  );
}

/**
 * Returns whether or not a node is safe
 * to be sorted.
 */
function shouldCheck(node) {
  const { value } = node;

  return (
    isRestProperty(node) ||
    value.type === "Identifier" ||
    value.type === "ObjectPattern" ||
    (value.type === "AssignmentPattern" && value.right.type === "Literal")
  );
}

/**
 * Returns a function that will sort two nodes found in an `ObjectPattern`.
 *
 * TODO: Maybe it makes sense to do a topological sort here based on identifiers?
 * Ideally we wouldn't need to arbitrarily skip sorting nodes because we are worried
 * about breaking the code.
 */
function createSorter(caseSensitive) {
  const sortName = a => (caseSensitive ? a : a.toLowerCase());

  return (a, b) => {
    // Make sure rest properties always come later.
    if (isRestProperty(a)) {
      return 1;
    } else if (isRestProperty(b)) {
      return -1;
    }

    return naturalCompare(sortName(a.key.name), sortName(b.key.name));
  };
}

/**
 * Creates a "fixer" function to be used by `--fix`.
 */
function createFix({ context, fixer, node, sorter }) {
  const sourceCode = context.getSourceCode();
  const sourceText = sourceCode.getText();

  const sorted = node.properties.concat().sort(sorter);

  const newText = sorted
    .map((child, i) => {
      const textAfter =
        i === sorted.length - 1
          ? // If it's the last item, there's no text after to append.
            ""
          : // Otherwise, we need to grab the text after the original node.
            sourceText.slice(
              node.properties[i].range[1], // End index of the current node .
              node.properties[i + 1].range[0] // Start index of the next node.
            );

      return sourceCode.getText(child) + textAfter;
    })
    .join("");

  return fixer.replaceTextRange(
    [
      node.properties[0].range[0], // Start index of the first node.
      node.properties[node.properties.length - 1].range[1] // End index of the last node.
    ],
    newText
  );
}

module.exports = {
  meta: {
    docs: {
      description: "require object destructure keys to be sorted",
      category: "Stylistic Issues",
      recommended: false
    },
    fixable: "code",
    messages: {
      sort: `Expected object keys to be in sorted order. Expected {{first}} to be before {{second}}.`
    },
    schema: [
      {
        type: "object",
        properties: {
          caseSensitive: {
            type: "boolean"
          }
        },
        additionalProperties: false
      }
    ]
  },

  create(context) {
    const options = context.options[0] || {};
    const { caseSensitive = true } = options;
    const sorter = createSorter(caseSensitive);

    return {
      ObjectPattern(node) {
        /*
         * If the node is more complex than just basic destructuring
         * with literal defaults, we just skip it. If some values use
         * previous values as defaults, then we cannot simply sort them.
         */
        if (!node.properties.every(shouldCheck)) {
          return;
        }

        let prevNode = null;

        for (const nextNode of node.properties) {
          if (prevNode && sorter(prevNode, nextNode) > 0) {
            context.report({
              node: nextNode,
              messageId: "sort",
              data: {
                first: getNodeName(nextNode.key),
                second: getNodeName(prevNode.key)
              },
              fix: fixer =>
                createFix({
                  context,
                  caseSensitive,
                  fixer,
                  node,
                  sorter
                })
            });

            break;
          }

          prevNode = nextNode;
        }
      }
    };
  }
};
