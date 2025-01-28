function isComponentishName(name) {
  return typeof name === 'string' && name[0] >= 'A' && name[0] <= 'Z';
}

export default function (babel, opts = {}) {
  if (typeof babel.env === 'function') {
    // Only available in Babel 7.
    const env = babel.env();
    if (env !== 'development' && !opts.skipEnvCheck) {
      throw new Error(
        'React Refresh Babel transform should only be enabled in development environment. ' +
          'Instead, the environment is: "' +
          env +
          '". If you want to override this check, pass {skipEnvCheck: true} as plugin options.',
      );
    }
  }

  const { types: t } = babel;

  function isJSX(node) {
    if (t.isJSXElement(node) || t.isJSXFragment(node)) return true;
    return false;
  }

  const alreadyOptimized = new Set();
  const toOptimize = new Set();

  if (!opts.module) throw new Error('The module name should be specified');
  const moduleName = opts.module;

  const UNISON_NAME = '$unison';
  let currentUnisonName = UNISON_NAME;
  let program;

  const optimizeFnProp = {
    JSXAttribute(path) {
      if (!path.node.value) return;
      const expression = path.get('value.expression');
      if (expression.isArrowFunctionExpression() || expression.isFunctionExpression()) {
        const cbId = path.scope.generateUidIdentifier('cb');
        const cbVar = t.variableDeclaration('const', [t.variableDeclarator(cbId, expression.node)]);
        this.componentReturn.insertBefore(cbVar);
        expression.replaceWith(cbId);
      }
    },
  };

  const isDirtyTraverse = {
    'ArrowFunctionExpression|FunctionExpression': {
      enter(path) {
        if (!this.ignoredBlock) {
          this.ignoredBlock = path.node;
          this.ignore = true;
        }
      },
      exit(path) {
        if (this.ignoredBlock === path.node) {
          this.ignoredBlock = null;
          this.ignore = false;
        }
      },
    },
    JSXExpressionContainer: {
      enter(path) {
        if (this.toInspect.includes(path.node)) {
          this.observe = true;
        }
      },
      exit(path) {
        if (this.toInspect.includes(path.node)) {
          this.observe = false;
        }
      },
    },
    MemberExpression(path) {
      if (this.observe && !this.ignore) {
        this.dirty();
        path.stop();
      }
    },
    CallExpression(path) {
      if (this.observe && !this.ignore) {
        this.dirty();
        path.stop();
      }
    },
  };

  function isDirty(path) {
    const toInspect = [];
    for (const child of path.node.children) {
      if (t.isJSXExpressionContainer(child)) {
        toInspect.push(child);
      }
    }

    if (path.isJSXElement()) {
      for (const child of path.node.openingElement.attributes) {
        if (t.isJSXExpressionContainer(child.value)) {
          toInspect.push(child.value);
        }
      }
    }
    let dirty = false;
    path.traverse(isDirtyTraverse, { dirty: () => (dirty = true), toInspect });
    return dirty;
  }

  function moveChildren(parent, dirtiness, componentReturn) {
    const p = componentReturn;
    if (!p) return;
    const children = parent.node.children;

    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (!isJSX(child)) continue;
      if (dirtiness.get(child)) continue;
      if (t.isJSXExpressionContainer(child)) child = child.expression;
      const jsxId = parent.scope.generateUidIdentifier('jsx');
      const jsxDec = t.variableDeclarator(jsxId, child);
      const jsxVar = t.variableDeclaration('const', [jsxDec]);
      p.insertBefore(jsxVar);
      parent.get(`children.${i}`).replaceWith(t.JSXExpressionContainer(jsxId));
    }
  }

  const optimizeStatic = {
    'ArrowFunctionExpression|FunctionExpression': {
      enter(path) {
        if (!this.ignoredBlock) {
          this.ignoredBlock = path.node;
          this.ignore = true;
        }
      },
      exit(path) {
        if (this.ignoredBlock === path.node) {
          this.ignoredBlock = null;
          this.ignore = false;
        }
      },
    },
    'JSXElement|JSXFragment': {
      enter(path) {
        if (this.ignore) return;
        if (!this.dirtiness.has(path.node)) this.dirtiness.set(path.node, false);

        const parent = this.parents[this.parents.length - 1];
        const isParentDirty = this.dirtiness.get(parent);

        if (isDirty(path)) {
          this.dirtiness.set(path.node, true);
          if (!isParentDirty) for (const parent of this.parents) this.dirtiness.set(parent, true);
        }

        this.parents.push(path.node);
      },
      exit(path) {
        if (this.ignore) return;
        if (path.node === this.parents.at(-1)) {
          this.parents.length--;
        }

        const isDirty = this.dirtiness.get(path.node);

        if (isDirty) {
          moveChildren(path, this.dirtiness, this.componentReturn);
        }
      },
    },
  };

  let rsxIdentifier;
  const breakDownReturn = {
    JSXElement: {
      exit(path) {
        const container = path.findParent((path) => path.isJSXExpressionContainer());
        if (container) {
          const isInFunctionCall = path
            .findParent((path) => path.node === container.node || path.isCallExpression())
            .isCallExpression();
          if (isInFunctionCall) return;
        }
        const props = path.get('openingElement');
        props.traverse(optimizeFnProp, {
          types: t,
          seen: this.seen,
          componentReturn: this.componentReturn,
        });

        const cbJsx = t.arrowFunctionExpression([], path.node);

        const cbId = path.scope.generateUidIdentifier('cbJsx');
        const cbVar = t.variableDeclaration('const', [t.variableDeclarator(cbId, cbJsx)]);

        this.componentReturn.insertBefore(cbVar);
        if (isJSX(path.parentPath.node)) {
          path.replaceWith(t.JSXExpressionContainer(t.callExpression(rsxIdentifier, [cbId])));
        } else {
          path.replaceWith(t.callExpression(rsxIdentifier, [cbId]));
        }
      },
    },
  };

  const findReturns = {
    'ArrowFunctionExpression|FunctionExpression|FunctionDeclaration': {
      enter(path) {
        if (!this.ignoredBlock) {
          this.ignoredBlock = path.node;
          this.ignore = true;
        }
      },
      exit(path) {
        if (this.ignoredBlock === path.node) {
          this.ignoredBlock = null;
          this.ignore = false;
        }
      },
    },
    ReturnStatement(path) {
      if (this.ignore) return;
      this.returns.push(path);
    },
  };

  const handleUnisonComponent = {
    ReturnStatement(path) {
      const t = this.types;
      const argument = path.get('argument');
      if (this.componentReturn.node === path.node && isJSX(argument.node)) {
        argument.replaceWith(t.arrowFunctionExpression([], argument.node));
      }
      const body = argument.get('body');
      let jsxList;
      if (body.isBlockStatement()) {
        const returns = [];
        body.traverse(findReturns, { returns });
        jsxList = returns;
      } else {
        jsxList = [argument];
      }
      for (const jsx of jsxList) {
        jsx.traverse(optimizeStatic, {
          dirtiness: new WeakMap(),
          parents: [],
          componentReturn: this.componentReturn,
        });
        jsx.traverse(breakDownReturn, {
          componentReturn: this.componentReturn,
        });
      }
    },
  };

  const isUnisonComponent = {
    CallExpression(path) {
      if (
        path.node.callee.name === currentUnisonName &&
        t.isIdentifier(path.node.arguments[0]) &&
        path.node.arguments[0].name === this.idName
      ) {
        this.isUnison();
      }
    },
  };

  function optimizeComponent(componentBody) {
    componentBody.findParent((path) => path.isFunctionDeclaration() || path.isVariableDeclaration()).node;
    const returnIndex = componentBody.node.body.findIndex((item) => t.isReturnStatement(item));
    const componentReturn = componentBody.get(`body.${returnIndex}`);
    componentBody.traverse(handleUnisonComponent, {
      types: t,
      componentReturn,
    });
  }

  function useUnison(directives) {
    if (!Array.isArray(directives)) return false;
    for (const directive of directives) {
      if (directive.value.value === 'use unison') return true;
    }
    return false;
  }

  function noUnison(directives) {
    if (!Array.isArray(directives)) return false;
    for (const directive of directives) {
      if (directive.value.value === 'no unison') return true;
    }
    return false;
  }

  const hasUnisonVisitor = {
    ImportDeclaration(path) {
      const declaration = path.node;
      if (declaration.source.value === moduleName) {
        for (const specifier of declaration.specifiers) {
          if (specifier.local.name === UNISON_NAME) {
            currentUnisonName = specifier.imported.name;
            this.hasUnison();
            path.stop();
            break;
          }
        }
      }
    },
  };

  let mode = opts.mode || 'manual';

  const mainVisitor = {
    FunctionDeclaration(path) {
      // Looking for :
      // function Component() {}; $unison(Component);
      if (path.node.id && isComponentishName(path.node.id.name)) {
        let isUnison = false;
        program.traverse(isUnisonComponent, {
          isUnison: () => void (isUnison = true),
          idName: path.node.id.name,
        });

        if (noUnison(path.node.body.directives)) return;
        if (!isUnison && (mode === 'full' || (mode === 'directive' && useUnison(path.node.body.directives)))) {
          if (t.isExportDefaultDeclaration(path.parent)) {
            // Convert to : const Component = $unison(function Component() {});
            const varDec = path.parentPath.replaceWith(
              t.variableDeclaration('const', [
                t.variableDeclarator(
                  path.node.id,
                  t.callExpression(t.identifier(currentUnisonName), [
                    t.functionExpression(path.node.id, path.node.params, path.node.body),
                  ]),
                ),
              ]),
            )[0];

            // add : export default Component;
            varDec.insertAfter(t.exportDefaultDeclaration(path.node.id));
          } else {
            // export default Component;
            path.replaceWith(
              t.variableDeclaration(path.node.kind || 'const', [
                t.variableDeclarator(
                  path.node.id,
                  t.callExpression(t.identifier(currentUnisonName), [
                    t.functionExpression(path.node.id, path.node.params, path.node.body),
                  ]),
                ),
              ]),
            );
          }
        }

        if (isUnison) {
          const componentBody = path.get('body');
          optimizeComponent(componentBody);
        }
      }
    },
    VariableDeclaration(path) {
      for (let i = 0; i < path.node.declarations.length; i++) {
        const declaration = path.get(`declarations.${i}`);
        const id = declaration.node.id;

        if (id && isComponentishName(declaration.node.id.name)) {
          if (t.isArrowFunctionExpression(declaration.node.init) || t.isFunctionExpression(declaration.node.init)) {
            if (noUnison(declaration.node.init.body.directives)) return;
            if (mode === 'full' || (mode === 'directive' && useUnison(declaration.node.init.body.directives))) {
              declaration
                .get('init')
                .replaceWith(t.callExpression(t.identifier(currentUnisonName), [declaration.node.init]));
            }
          }

          // It's not a unison component
          //
          if (
            !t.isCallExpression(declaration.node.init) ||
            !declaration.node.init.callee ||
            declaration.node.init.callee.name !== currentUnisonName
          ) {
            return;
          }
          const root = declaration.get('init');

          const argument = root.get('arguments.0');
          if (argument.isArrowFunctionExpression() || argument.isFunctionExpression()) {
            const componentBody = argument.get('body');
            optimizeComponent(componentBody);
            alreadyOptimized.add(id.name);
            toOptimize.delete(id.name);
          }

          if (argument.isIdentifier()) {
            if (!alreadyOptimized.has(id.name)) {
              toOptimize.add(id.name);
            }
          }
        }
      }
    },
  };

  return {
    name: 'unison-compiler',
    visitor: {
      Program: {
        enter(path) {
          if (noUnison(path.node.directives)) {
            path.stop();
            return;
          };
          program = path;
          let unisonImported = false;
          path.traverse(hasUnisonVisitor, { hasUnison: () => (unisonImported = true) });

          if (!unisonImported) {
            const id = t.identifier(UNISON_NAME);
            // add: import { $unison } from 'module_name';
            path.unshiftContainer('body', [
              t.importDeclaration([t.importSpecifier(id, id)], t.stringLiteral(moduleName)),
            ]);
          }

          if (mode === 'directive' && useUnison(path.node.directives)) {
            mode = 'full';
            path.get('directives.0').replaceWith(t.directive(t.directiveLiteral('use client')));
          }

          rsxIdentifier = path.scope.generateUidIdentifier('rsx');
          path.unshiftContainer('body', [
            t.importDeclaration([t.importSpecifier(rsxIdentifier, t.identifier('rsx'))], t.stringLiteral(moduleName)),
          ]);

          path.traverse(mainVisitor);
        },
      },
    },
  };
}
