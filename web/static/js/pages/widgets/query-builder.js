import html from "choo/html"
import _ from "underscore";

function isYamFunc(expr) {
  return _.first(expr) === '.';
}

const infixOperators = ['-', '+', '*', '/', '==']
function isInfix(expr) {
  if(!_.isArray(expr)) return;
  const operator = _.first(expr);
  return _.contains(infixOperators, operator);
}

function yamsFuncView(expr, which, actions) {
  const params = _.last(expr);
  const funcName = _.first(params);
  const args = params.slice(1);
  return html`
    <div class="expr yam-func">
      <span class="func-name">${funcName}</span>
      ${args.map(exprView)}

      <a class="remove"
        onclick=${() => actions.onExprDeleted(expr, which)}
        href="javascript:void(0)">
        <i class="ion-ios-close"></i>
      </a>
    </div>
  `
}

function infixView(expr, which, actions) {
  const [operator, [arg1, arg2]] = expr;

  return html`
    <div class="expr infix">
      <span>${arg1}</span>
      <span class="operator">${operator}</span>
      <span>${arg2}</span>
    </div>
  `
}

function exprView(expr, which, actions) {
  if(isYamFunc(expr)) return yamsFuncView(expr, which, actions);
  if(isInfix(expr)) return infixView(expr, which, actions);
  return html`
    <span class="expr">
      ${expr.toString()}
    </span>
  `
}


function view(query, onExprAdded, onExprDeleted, onExprUpdated) {
  const actions = {onExprAdded, onExprDeleted, onExprUpdated}
  return html`
    <div class="query-builder">
      ${query.map((clause, i) => {
        return exprView(clause, i, actions)
      })}
    </div>
  `
}

export default view;