import html from "choo/html"
import _ from "underscore";
import {fromAst} from './yams/funcs';

function view(nodes, onChange) {
  const onChangeNode = (node) => {
    console.log("On change node...", node);
    onChange();
  }
  return html`
    <div class="query-builder">
      ${nodes.map((node) => node.view({onChangeNode}))}
    </div>
  `
}

export default view;