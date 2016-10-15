import html from "choo/html"
import _ from "underscore";
import {signatureOf} from './yams/funcs';


function atomView([types, expr], actions) {
  types = [types]
  return html`
    <span class="expr atom">${expr} (${types.join('|')})</span>
  `
}

function isYamFuncEditable(funcName) {
  const frozen = ['where', 'aggregates'];
  return !_.contains(frozen, funcName);
}
function isYamFuncRemovable(funcName) {
  const removable = ['where', 'aggregates', 'bucket'];
  return !_.contains(removable, funcName);
}

function yamsFuncView(expr, actions) {
  const [_dot, [funcName, ...args]] = expr;

  const editable = isYamFuncEditable(funcName);

  const removeButton = () => {
    if(isYamFuncRemovable(funcName)) {
      return html`
        <a class="remove"
          onclick=${() => actions.onExprDeleted(expr)}
          href="javascript:void(0)">
          <i class="ion-ios-close"></i>
        </a>
      `;
    }
  }

  const sig = signatureOf(funcName);
  const typedExprs = _.zip(sig, args);

  return html`
    <div class="expr yam-func ${editable? 'editable' : 'frozen'}">
      <span class="func-name">${funcName}</span>
      ${typedExprs.map(exprView)}
      ${removeButton()}
    </div>
  `
}

function infixView([type, expr], actions) {
  const [funcName, [arg1, arg2]] = expr;
  // console.log("INFIX", type, funcName, arg1, arg2)
  return html`
    <div class="expr infix">
      <span>(${exprView(arg1)}</span>
      <span class="funcName">${funcName}</span>
      <span>${exprView(arg2)})</span>
    </div>
  `
}

function exprView(expr, actions) {
  if(isYamFunc(expr)) return yamsFuncView(expr, actions);
  if(isInfix(expr)) return infixView(expr, actions);
  return atomView(expr, actions)
}


function view(query, onExprAdded, onExprDeleted, onExprUpdated) {
  const actions = {onExprAdded, onExprDeleted, onExprUpdated}
  return html`
    <div class="query-builder">
      ${query.map((expr) => {
        return exprView(expr, actions)
      })}
    </div>
  `
}

export default view;