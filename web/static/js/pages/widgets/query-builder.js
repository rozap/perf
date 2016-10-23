import html from "choo/html"
import _ from "underscore";
import {fromAst, check} from './yams/funcs';

function view(nodes, onChange) {
  const onChangeNode = (node) => {
    onChange(nodes);
  }
  const onDeleteNode = (index) => () => {
    onChange([
      ...nodes.slice(0, index),
      ...nodes.slice(index + 1, nodes.length)
    ]);
  }

  const checked = check(nodes);
  console.log(checked);

  return html`
    <div class="query-builder">
      ${nodes.map((node, i) => node.view({
        onChangeNode,
        onDeleteNode: onDeleteNode(i)
      }))}
    </div>
  `
}

export default view;