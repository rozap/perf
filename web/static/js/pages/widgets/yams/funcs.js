import _ from "underscore";
import changeCase from "change-case";
import html from "choo/html";
import sexp from "sexp";

function merge(p, children) {
  const all = (kind) => {
    return _.flatten(children.map(c => c[kind]))
  }
  return {
    errors: p.errors.concat(all('errors')),
    warnings: p.warnings.concat(all('warnings'))
  };
}

function ok() {
  return {errors: [], warnings: []}
}

function error(reason) {
  return {errors: [reason], warnings: []}
}

class Any {
  static isa(a) { return true; }
  static subTypes() {
    return [Row, Num, Timeunit, Bool, Func, Text];
  }
  static fromAst(a) {
    const klass = _.find(this.subTypes(), (c) => c.isa(a));
    return klass? klass.fromAst(a) : (new this(a));
  }
  toAst() {
    return this.value;
  }
  toSexpr() {
    throw new Error(`no conversion from ${this.id()} to sexpr`);
  }
  static id() {
    return changeCase.snakeCase(this.name);
  }
  id() {
    return this.constructor.id();
  }
  constructor(value) {
    this.value = value;
  }
  check() {
    const isOk = (results) => {
      return _.every(results, result => (result.errors.length === 0));
    }
    const wrapped = _.isArray(this.value)? this.value: [this.value];

    const results = this.value.map(v => v.check());

    if(isOk(results)) {
      return ok();
    }
    return results;
  }
  returnType() {
    return this.constructor;
  }

  static isSubclassOf(type) {
    if(this.id() === type.id()) return true;
    return _.any(type.subTypes(), st => this.isSubclassOf(st));
  }

  isInstanceOf(type) {
    if(this.id() === type.id()) return true;
    return _.any(type.subTypes(), st => this.isInstanceOf(st))
  }


  // View Things

  canEdit() { return true; }
  canRemove() { return true; }

  view(actions) {
    return this.isEditing? this.edit(actions) : this.show(actions);
  }

  doEdit(actions) {
    this.isEditing = this.canEdit();
    actions.onChangeNode();
  }

  doneEdit(actions) {
    this.isEditing = false;
    actions.onChangeNode();
  }
}


class Atom extends Any {
  show(actions) {
    if(!actions) throw new Error("Cannot show without actions")
    const edit = () => this.doEdit(actions);
    return html`
      <span class="expr atom num"
        onclick=${edit}>${this.value}</span>
    `
  }

  toSexpr() {
    return this.value;
  }

  mutate(value) {
    this.value = value;
  }

  edit(actions) {
    const onUpdate = (e) => {
      this.mutate(e.currentTarget.value);
    }
    const unedit = () => this.doneEdit(actions)
    const onload = (el) => {
      if(this.isEditing) el.focus();
    }

    return html`
      <input type="${this.inputType()}" value=${this.value}
        onload=${onload}
        onchange=${onUpdate}
        onblur=${unedit}/>
    `
  }
}

class Num extends Atom {
  static subTypes() { return []; }
  static isa(a) { return _.isNumber(a) }
  inputType() { return 'number'; }
}
class Text extends Atom {
  static subTypes() { return []; }
  static isa(a) { return _.isString(a) }
  inputType() { return 'text' };
}
class Row extends Atom {
  static subTypes() { return []; }
  static isa(a) { return _.isString(a) && (a.indexOf("row.") === 0) }
  inputType() { return 'text' }

  show(actions) {
    return html`
      <span class="expr atom row">${this.value}</span>
    `
  }
}

class Enum extends Atom {
  view(actions) {
    const onSelect = (e) => {
      const newValue = e.currentTarget.value;
      this.value = newValue;
      actions.onChangeNode();
    }

    return html`
      <select class="expr ${this.id()}"
        onchange=${onSelect}>
        ${this.options().map(o => {
          return html`
            <option value="${o}"
              ${o === this.value ? 'selected' : ''}>
              ${o}
            </option>
          `
        })}
        ${this.value}
      </select>
    `
  }
}

class Bool extends Enum {
  static subTypes() { return []; }
  static isa(a) { return _.isBoolean(a); }
  options() {
    return [true, false]
  }
}
class Timeunit extends Enum {
  static subTypes() { return []; }
  static isa(a) {
    return _.contains(this.options(), a);
  }
  static options() {
    return ['minutes', 'seconds', 'milliseconds', 'microseconds'];
  }
  options() {
    return this.constructor.options();
  }
}
class Func extends Any {
  static subTypes() {
    return [
      Bucket, Where, Percentile, Minimum, Maximum, CountWhere, Aggregates,
      Gt, Lt, Gte, Lte, Eq, Neq,
      Plus, Minus, Mult, Div
    ];
  }

  toSexpr() {
    return `(${this.id()} ${this.value.map(v => v.toSexpr()).join(' ')})`;
  }

  static isa(a) { return _.isArray(a) }


  check() {
    const invocation = _.zip(this.constructor.signature(), this.value);

    const badInvocation = _.find(invocation, ([t, actual]) => {
      if(actual.isInstanceOf(Func)) {
        return !actual.returnType().isSubclassOf(t);
      }
      return !actual.isInstanceOf(t)
    });

    if(badInvocation) {
      const [expectedType, actual] = badInvocation;

      var got = actual.id();
      if(actual.isInstanceOf(Func)) {
        got = actual.returnType().id();
      }
      return error(`Invocation of function '${this.id()}' expected '${expectedType.id()}' but got '${got}'`);
    };
    return ok();
  }
}
class YamFunc extends Func {
  constructor(ast) {
    const [_name, ...subExprs] = ast;
    super(subExprs.map(se => Any.fromAst(se)));
  }
  static isa([funcName]) { return funcName === this.id(); }
  static subTypes() { return [] }

  toAst() {
    return [this.id(), ...this.value.map(sub => sub.toAst())];
  }

  show(actions) {
    const node = this;
    const removeButton = () => {
      if(this.canRemove()) {
        return html`
          <a class="remove"
            onclick=${() => actions.onDeleteNode(node)}
            href="javascript:void(0)">
            <i class="ion-ios-close"></i>
          </a>
        `;
      }
    }

    const onReplace = (value, i) => {
      return (withNode) => {
        node.value[i] = withNode;
        actions.onChangeNode();
      }
    }

    return html`
      <div class="expr yam-func ${this.canEdit()? 'editable' : 'frozen'}">
        <span class="func-name">${this.id()}</span>
        ${this.value.map((v, i) => {

          return v.view({
            onChangeNode: actions.onChangeNode,
            onReplace: onReplace(v, i)
          })
        })}
        ${removeButton()}
      </div>
    `
  }
}

class Infix extends Func {
  constructor(ast) {
    const [_name, ...subExprs] = ast;
    super(subExprs.map(se => Any.fromAst(se)));
  }
  static signature() { return [Any, Any]; }
  static subTypes() { return [] }
  static isa([operator, _args]) { return this.op() === operator; }

  toAst() {
    return [this.op(), ...this.value.map(sub => sub.toAst())];
  }

  id() {
    return this.op();
  }

  op() { return this.constructor.op() }

  show(actions) {
    const [left, right] = this.value;

    const edit = (e) => {
      if(e.defaultPrevented) return;
      e.preventDefault();
      this.doEdit(actions);
    }

    return html`
      <div class="expr infix" onclick=${edit}>
        <span class="funcName">(${this.op()}</span>
        <span>${left.view(actions)}</span>
        <span>${right.view(actions)})</span>
      </div>
    `
  }

  edit(actions) {
    const unedit = (e) => {
      const ast = sexp(e.currentTarget.value);
      actions.onReplace(Infix.fromAst(ast));
      this.doneEdit(actions)
    }
    const onload = (el) => el.focus();

    const value = this.toSexpr();

    return html`
      <div class="expr infix">
        <input
          onblur=${unedit}
          onload=${onload}
          value=${value}/>
      </div>
    `
  }
}
class Comparator extends Infix {
  returnType() { return Bool; }
  options() {
    return ['>', '<', '>=', '<=', '==', '!=']
  }
}
class Arithmetic extends Infix {
  returnType() { return Num; }
  options() {
    return ['+', '-', '*', '/'];
  }
}
class Gt extends  Comparator { static op() { return '>'} }
class Lt extends  Comparator { static op() { return '<'} }
class Gte extends Comparator { static op() { return '>='} }
class Lte extends Comparator { static op() { return '<='} }
class Eq extends  Comparator { static op() { return '=='} }
class Neq extends Comparator { static op() { return '!='} }

class Plus  extends Arithmetic { static op() { return '+'} }
class Minus extends Arithmetic { static op() { return '-'} }
class Mult  extends Arithmetic { static op() { return '*'} }
class Div   extends Arithmetic { static op() { return '/'} }

class Bucket extends YamFunc {
  static signature() { return [Num, Timeunit]; }
  canRemove() { return false; }

}
class Where extends YamFunc {
  static signature() { return [Bool]; }
}
class Percentile extends YamFunc {
  static signature() { return [Num, Num, Text]; }
}
class Minimum extends YamFunc {
  static signature() { return [Num, Text]; }
}
class Maximum extends YamFunc {
  static signature() { return [Num, Text]; }
}
class CountWhere extends YamFunc {
  static signature() { return [Bool, Text]; }
}
class Aggregates extends YamFunc {
  static signature() { return []; }
  canRemove() { return false; }
  canEdit() { return false; }

}

function fromAst(exprs) {
  return exprs.map(expr => Any.fromAst(expr));
}

function toAst(nodes) {
  return nodes.map(q => q.toAst());
}

function check(nodes) {
  return nodes.reduce((acc, node) => {
    return merge(acc, [node.check()]);
  }, ok());
}

export default {
  fromAst, toAst, check,
  Any, Num, Text, Row, Bool, Func, Timeunit,
  Gt, Lt, Gte, Lte, Eq, Neq,
  Plus, Minus, Mult, Div,
  Bucket, Where, Percentile
}