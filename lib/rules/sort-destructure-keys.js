const naturalCompare = require("natural-compare-lite");

/**
 * Get's the "name" of the node, which could be an Identifier,
 * StringLiteral, or NumberLiteral, etc.
 *
 * This returned string is used to sort nodes of the same type.
 */
function getNodeName(node) {
  switch (node.type) {
    case "Property":
      return getNodeName(node.key);
    case "Identifier":
      return node.name;
    case "Literal":
      return node.value.toString();
    case "RestElement":
    case "RestProperty":
    case "ExperimentalRestProperty":
      return node.argument.name;
    default:
      return node.type;
  }
}

/**
 * Sort priority for node types.
 */
const NODE_TYPE_SORT_ORDER = {
  /* ObjectPattern children */
  Property: 1,
  RestElement: 99,
  RestProperty: 99,
  ExperimentalRestProperty: 99,

  /* Property keys */
  Identifier: 1,
  Literal: 1,
  TemplateLiteral: 2,
  ComputedProperty: 2,
};

const SORT_ORDER_DEFAULT = 98;

function getSortOrder(node) {
  return isComputedProperty(node)
    ? NODE_TYPE_SORT_ORDER.ComputedProperty
    : NODE_TYPE_SORT_ORDER[node.type] || SORT_ORDER_DEFAULT;
}

/**
 * Returns true if the node is a "real", computed property. We don't consider
 * computed properties with a literal value to be a "real" computed property. This
 * is useful since that means they can be sorted.
 */
function isComputedProperty(node) {
  return node.computed && node.key.type !== "Literal";
}

/**
 * Returns true if any references to this ID are within the objectPatternNode
 */
function isReferencedByOtherProperties(scope, objectPatternNode, id) {
  for (const variable of scope.variables) {
    if (variable.name !== id.name) {
      continue;
    }

    for (const reference of variable.references) {
      if (reference.identifier === id) {
        continue;
      }

      let current = reference.identifier;
      while (current) {
        if (current === objectPatternNode) {
          return true;
        }

        current = current.parent;
      }
    }

    return false;
  }
}

/**
 * Returns whether or not a node is safe to be sorted.
 */
function shouldCheck(scope, objectPatternNode, node) {
  if (node.type !== "Property") {
    return true;
  }

  switch (node.value.type) {
    case "ObjectPattern":
      return node.value.properties.every((propertyNode) =>
        shouldCheck(scope, objectPatternNode, propertyNode),
      );
    case "ArrayPattern":
      // Fake the element as a property for simplicity
      return node.value.elements.every(
        (element) =>
          !element ||
          shouldCheck(scope, objectPatternNode, {
            type: "Property",
            value: element,
          }),
      );
    case "AssignmentPattern":
      if (node.value.left.type === "Identifier") {
        return !isReferencedByOtherProperties(
          scope,
          objectPatternNode,
          node.value.left,
        );
      }
      return true;
    case "Identifier":
      return !isReferencedByOtherProperties(
        scope,
        objectPatternNode,
        node.value,
      );
    default:
      return true;
  }
}

/**
 * Returns a function that will sort two nodes found in an `ObjectPattern`.
 *
 * TODO: Maybe it makes sense to do a topological sort here based on identifiers?
 * Ideally we wouldn't need to arbitrarily skip sorting nodes because we are worried
 * about breaking the code.
 */
function createSorter(caseSensitive) {
  const sortName = (a) => (caseSensitive ? a : a.toLowerCase());

  return (a, b) => {
    // When we have different node "types"
    const nodeResult = getSortOrder(a) - getSortOrder(b);
    if (nodeResult !== 0) return nodeResult;

    // When the keys have different "types"
    const keyResult = getSortOrder(a.key) - getSortOrder(b.key);
    if (keyResult !== 0) return keyResult;

    return naturalCompare(sortName(getNodeName(a)), sortName(getNodeName(b)));
  };
}

const LINEBREAK_MATCHER = /[\r\n]/;

/**
 * Splits the comments after `token` into the ones trailing it on the same
 * line, and the ones leading up to whatever comes next.
 */
function splitCommentsAfter(sourceCode, token, nextNode) {
  const comments = sourceCode.getCommentsAfter(token);
  let i = 0;

  while (
    i < comments.length &&
    comments[i].loc.start.line === token.loc.end.line &&
    (!nextNode || comments[i].loc.end.line < nextNode.loc.start.line)
  ) {
    i++;
  }

  return [comments.slice(0, i), comments.slice(i)];
}

/**
 * Breaks each property up into the text that should move with it when sorting
 * (its leading comments, itself, and its trailing comments on the same line),
 * and the text that should stay in place (commas and whitespace).
 *
 * Returns `null` if there are comments we don't know how to move.
 */
function getPropertyChunks(sourceCode, node) {
  const sourceText = sourceCode.getText();
  const { properties } = node;
  const chunks = [];

  // Comments on the same line as the opening brace stay where they are.
  let [, leading] = splitCommentsAfter(
    sourceCode,
    sourceCode.getTokenBefore(properties[0]),
    properties[0],
  );

  for (let i = 0; i < properties.length; i++) {
    const property = properties[i];
    const nextProperty = properties[i + 1];
    const tokenAfter = sourceCode.getTokenAfter(property);
    const hasComma = tokenAfter.value === ",";

    // Comments between a property and its comma are ambiguous, so bail.
    if (hasComma && sourceCode.getCommentsAfter(property).length > 0) {
      return null;
    }

    const anchor = hasComma ? tokenAfter : property;
    const [trailing, nextLeading] = splitCommentsAfter(
      sourceCode,
      anchor,
      nextProperty,
    );

    const start = leading.length ? leading[0].range[0] : property.range[0];
    const end = trailing.length
      ? trailing[trailing.length - 1].range[1]
      : anchor.range[1];
    const next =
      nextLeading[0] || nextProperty || sourceCode.getTokenAfter(anchor);

    chunks.push({
      node: property,
      start,
      end,
      leadingText: sourceText.slice(start, property.range[0]),
      commaText: sourceText.slice(property.range[1], anchor.range[1]),
      trailingText: sourceText.slice(anchor.range[1], end),
      gapText: sourceText.slice(end, next.range[0]),
    });

    leading = nextLeading;
  }

  return chunks;
}

/**
 * Creates a "fixer" function to be used by `--fix`.
 */
function createFix({ sourceCode, fixer, node, sorter }) {
  const chunks = getPropertyChunks(sourceCode, node);
  if (!chunks) return null;

  const sorted = chunks.concat().sort((a, b) => sorter(a.node, b.node));

  // Moving a trailing comment in front of code on the same line would attach
  // it to the wrong property, or in the case of line comments, break the code.
  if (
    sorted.some(
      (chunk, i) =>
        chunk !== chunks[i] &&
        chunk.trailingText &&
        !LINEBREAK_MATCHER.test(chunks[i].gapText),
    )
  ) {
    return null;
  }

  const newText = sorted
    .map((chunk, i) => {
      const slot = chunks[i];
      const textAfter =
        i === sorted.length - 1
          ? // If it's the last item, there's no text after to append.
            ""
          : // Otherwise, keep the whitespace after the original chunk.
            slot.gapText;

      return (
        chunk.leadingText +
        sourceCode.getText(chunk.node) +
        slot.commaText +
        chunk.trailingText +
        textAfter
      );
    })
    .join("");

  return fixer.replaceTextRange(
    [
      chunks[0].start, // Start index of the first chunk.
      chunks[chunks.length - 1].end, // End index of the last chunk.
    ],
    newText,
  );
}

module.exports = {
  meta: {
    docs: {
      description: "require object destructure keys to be sorted",
      category: "Stylistic Issues",
      recommended: false,
    },
    fixable: "code",
    messages: {
      sort: `Expected object keys to be in sorted order. Expected {{first}} to be before {{second}}.`,
    },
    schema: [
      {
        type: "object",
        properties: {
          caseSensitive: {
            type: "boolean",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const options = context.options[0] || {};
    const { caseSensitive = true } = options;
    const sorter = createSorter(caseSensitive);

    return {
      ObjectPattern(objectPatternNode) {
        const scope =
          sourceCode && sourceCode.getScope
            ? sourceCode.getScope(objectPatternNode)
            : context.getScope();

        /*
         * If the node is more complex than just basic destructuring
         * with literal defaults, we just skip it. If some values use
         * previous values as defaults, then we cannot simply sort them.
         */
        if (
          !objectPatternNode.properties.every((node) =>
            shouldCheck(scope, objectPatternNode, node),
          )
        ) {
          return;
        }

        let prevNode = null;

        for (const nextNode of objectPatternNode.properties) {
          if (prevNode && sorter(prevNode, nextNode) > 0) {
            context.report({
              node: nextNode,
              messageId: "sort",
              data: {
                first: getNodeName(nextNode),
                second: getNodeName(prevNode),
              },
              fix: (fixer) =>
                createFix({
                  sourceCode,
                  caseSensitive,
                  fixer,
                  node: objectPatternNode,
                  sorter,
                }),
            });

            break;
          }

          prevNode = nextNode;
        }
      },
    };
  },
};
