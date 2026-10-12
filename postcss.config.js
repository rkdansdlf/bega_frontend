import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

const mergeTailwindBackdropVariables = () => ({
  postcssPlugin: 'merge-tailwind-backdrop-variables',
  Once(root) {
    const universal = root.nodes.find(
      (node) => node.type === 'rule' && node.selector === '*, ::before, ::after',
    );
    const backdrop = root.nodes.find(
      (node) => node.type === 'rule' && node.selector === '::backdrop',
    );
    if (!universal || !backdrop) {
      return;
    }

    const declarations = (node) => node.nodes
      .filter((child) => child.type === 'decl')
      .map((child) => `${child.prop}:${child.value}${child.important ? '!important' : ''}`)
      .join(';');
    if (declarations(universal) !== declarations(backdrop)) {
      return;
    }

    universal.selector = `${universal.selector},${backdrop.selector}`;
    backdrop.remove();
  },
});

mergeTailwindBackdropVariables.postcss = true;

export default {
  plugins: [
    tailwindcss(),
    mergeTailwindBackdropVariables(),
    autoprefixer(),
  ],
}
