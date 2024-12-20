import generate from '@babel/generator';

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

  let rsxIdentifier;
  const alreadyOptimized = new Set();
  const toOptimize = new Set();

  if (!opts.module) throw new Error('The module name should be specified');
  const moduleName = opts.module;

  const BRIDGE_NAME = '$bridge';
  let currentBridgeName = BRIDGE_NAME;
  let program;

  const optimizeFnProp = {
    JSXAttribute(path) {
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
    for (const child of path.node.openingElement.attributes) {
      if (t.isJSXExpressionContainer(child.value)) {
        toInspect.push(child.value);
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
      if (!t.isJSXElement(child) && !t.isJSXFragment(child)) continue;
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
    JSXElement: {
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

  const breakDownReturn = {
    JSXElement: {
      exit(path) {
        if (!rsxIdentifier) {
          const program = path.findParent((path) => path.isProgram());
          rsxIdentifier = program.scope.generateUidIdentifier('rsx');
          program.unshiftContainer('body', [
            t.importDeclaration([t.importSpecifier(rsxIdentifier, t.identifier('rsx'))], t.stringLiteral(moduleName)),
          ]);
        }

        const container = path.findParent((path) => path.isJSXExpressionContainer());
        if (container) {
          const isInFunctionCall = path
            .findParent((path) => path.node === container.node || path.isCallExpression())
            .isCallExpression();
          if (isInFunctionCall) return;
        }
        const props = path.get('openingElement');
        props.traverse(optimizeFnProp, { types: t, seen: this.seen, componentReturn: this.componentReturn });

        const cbJsx = t.arrowFunctionExpression([], path.node);

        const cbId = path.scope.generateUidIdentifier('cbJsx');
        const cbVar = t.variableDeclaration('const', [t.variableDeclarator(cbId, cbJsx)]);

        this.componentReturn.insertBefore(cbVar);
        if (path.parentPath.isJSXElement() || path.parentPath.isJSXFragment()) {
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

  const handleBridgeComponent = {
    ReturnStatement(path) {
      const t = this.types;
      const argument = path.get('argument');
      if (this.componentReturn.node === path.node && argument.isJSXElement()) {
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
        jsx.traverse(optimizeStatic, { dirtiness: new WeakMap(), parents: [], componentReturn: this.componentReturn });
        jsx.traverse(breakDownReturn, { componentReturn: this.componentReturn });
      }
    },
  };

  const isBridgeComponent = {
    CallExpression(path) {
      if (
        path.node.callee.name === currentBridgeName &&
        t.isIdentifier(path.node.arguments[0]) &&
        path.node.arguments[0].name === this.idName
      ) {
        this.isBridge();
      }
    },
  };

  function optimizeComponent(componentBody) {
    const parent = componentBody.findParent((path) => path.isFunctionDeclaration() || path.isVariableDeclaration()).node;
    try {
      const returnIndex = componentBody.node.body.findIndex((item) => t.isReturnStatement(item));
      const componentReturn = componentBody.get(`body.${returnIndex}`);
      componentBody.traverse(handleBridgeComponent, { types: t, componentReturn });
    } catch (e) {
      console.log(JSON.stringify(parent));
      console.log(
        generate(parent)
          .code,
      );
      throw e;
    }
  }

  function useBridge(directives) {
    for (const directive of directives) {
      if (directive.value.value === 'use bridge') return true;
    }
    return false;
  }
  function noBridge(directives) {
    if (!Array.isArray(directives)) return false;
    for (const directive of directives) {
      if (directive.value.value === 'no bridge') return true;
    }
    return false;
  }

  const mode = opts.mode ?? 'manual';
  return {
    name: 'bridge-compiler',
    visitor: {
      Program: {
        enter(path) {
          program = path;
        },
        exit() {
          rsxIdentifier = undefined;
          program = undefined;
        },
      },
      ImportSpecifier(path) {
        if (path.node.imported.name === BRIDGE_NAME) currentBridgeName = path.node.local.name;
      },
      FunctionDeclaration(path) {
        // Looking for :
        // function Component() {}; $bridge(Component);
        if (isComponentishName(path.node.id.name)) {
          let isBridge = false;
          program.traverse(isBridgeComponent, {
            isBridge: () => void (isBridge = true),
            idName: path.node.id.name,
          });

          if (noBridge(path.node.body.directives)) return;
          if (!isBridge && mode === 'full') {
            if (t.isExportDefaultDeclaration(path.parent)) {
              // Convert to : const Component = $bridge(function Component() {});
              const varDec = path.parentPath.replaceWith(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    path.node.id,
                    t.callExpression(t.identifier(currentBridgeName), [
                      t.functionExpression(path.node.id, [], path.node.body),
                    ]),
                  ),
                ]),
              )[0];

              // add : export default Component;
              varDec.insertAfter(t.exportDefaultDeclaration(path.node.id));
            } else {
              // export default Component;
              path.replaceWith(
                t.variableDeclaration(path.node.kind, [
                  t.variableDeclarator(
                    path.node.id,
                    t.callExpression(t.identifier(currentBridgeName), [
                      t.functionExpression(path.node.id, [], path.node.body),
                    ]),
                  ),
                ]),
              );
            }
          }

          if (!isBridge && mode === 'directive' && useBridge(declaration.node.init.body.directives)) {
            path.replaceWith(t.callExpression(t.identifier(currentBridgeName), path.node));
          }

          if (isBridge) {
            const componentBody = path.get('body');
            optimizeComponent(componentBody);
          }
        }
      },
      VariableDeclaration(path) {
        for (let i = 0; i < path.node.declarations.length; i++) {
          const declaration = path.get(`declarations.${i}`);
          const id = declaration.node.id;

          if (isComponentishName(declaration.node.id.name)) {
            if (t.isArrowFunctionExpression(declaration.node.init) || t.isFunctionExpression(declaration.node.init)) {
              if (noBridge(declaration.node.init.body.directives)) return;
              if (mode === 'full') {
                declaration
                  .get('init')
                  .replaceWith(t.callExpression(t.identifier(currentBridgeName), [declaration.node.init]));
              }
              if (mode === 'directive' && useBridge(declaration.node.init.body.directives)) {
                declaration
                  .get('init')
                  .replaceWith(t.callExpression(t.identifier(currentBridgeName), [declaration.node.init]));
              }
            }

            // It's not a bridge component
            if (
              !t.isCallExpression(declaration.node.init) ||
              declaration.node.init.callee.name !== currentBridgeName
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
    },
  };
}
