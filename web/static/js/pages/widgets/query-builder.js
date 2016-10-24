import html from "choo/html"
import _ from "underscore";
import {fromAst, check, userYamFuncs, Percentile} from './yams/funcs';

function view(nodes, onChange) {
  const isValid = (query) => {
    return check(query).errors.length === 0;
  }

  var toAdd = Percentile;
  const onUpdateExpr = (e) => toAdd = _.find(userYamFuncs(), yf => yf.id() === e.currentTarget.value);
  const onAddNode = (e) => {
    const newNodes = [
      ...nodes.slice(0, nodes.length - 1),
      toAdd.empty(),
      ...nodes.slice(nodes.length - 1, nodes.length)
    ]
    onChange(newNodes, isValid(newNodes));
  }

  const onChangeNode = (node) => {
    console.log(isValid(nodes), check(nodes))
    onChange(nodes, isValid(nodes));
  }

  const onDeleteNode = (index) => () => {
    const newNodes = [
      ...nodes.slice(0, index),
      ...nodes.slice(index + 1, nodes.length)
    ];
    onChange(newNodes, isValid(newNodes));
  }


  const checked = check(nodes);
  console.log(checked);

  return html`
    <div class="query-builder">
      <div class="check-result">
        <div class="errors">
          ${
            checked.errors.map((t) => {
              return html`<span class="result error">(error) ${t}</span>`;
            })
          }
        </div>
        <div class="warnings">
          ${
            checked.warnings.map((t) => {
              return html`<span class="result warn">(warn) ${t}</span>`;
            })
          }
        </div>
      </div>

      ${nodes.map((node, i) => node.view({
        onChangeNode,
        onDeleteNode: onDeleteNode(i)
      }))}


      <div class="expr add-new-yam yam-func">
        <div class="new-func">
          <select onchange=${onUpdateExpr}>
            ${
              userYamFuncs().map(f => {
                return html`
                  <option ${toAdd.id() === f.id()? 'selected' : ''}>
                    ${f.id()}
                  </option>
                `
              })
            }
          </select>
        </div>
        <div class="new-func-add">
          <a href="javascript:void(0)"
            onclick=${onAddNode}
            class="pure-button pure-button-primary add-expression">
            Add Expression 
          </a>

        </div>
      </div>
    </div>
  `
}

export default view;