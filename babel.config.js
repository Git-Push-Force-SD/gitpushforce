/** Maps import.meta.env.* to process.env.* so Jest can run Vite env reads. */
function transformImportMetaEnv() {
  return {
    name: 'transform-import-meta-env',
    visitor: {
      MemberExpression(path) {
        const { node } = path;
        const obj = node.object;
        if (
          obj?.type === 'MemberExpression' &&
          obj.object?.type === 'MetaProperty' &&
          obj.object.meta?.name === 'import' &&
          obj.object.property?.name === 'meta' &&
          obj.property?.name === 'env'
        ) {
          path.replaceWith({
            type: 'MemberExpression',
            object: {
              type: 'MemberExpression',
              object: { type: 'Identifier', name: 'process' },
              property: { type: 'Identifier', name: 'env' },
            },
            property: node.property,
            computed: node.computed,
          });
        }
      },
    },
  };
}

module.exports = {
  presets: [
    ['@babel/preset-env', { 
      targets: { node: 'current' },
      modules: 'commonjs'
    }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
  plugins: [
    transformImportMetaEnv,
    'babel-plugin-transform-import-meta',
  ],
};
