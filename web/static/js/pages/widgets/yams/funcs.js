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
  mutate(value) {
    this.value = parseInt(value);
  }

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
    return ['seconds', 'milliseconds', 'microseconds'];
  }
  options() {
    return this.constructor.options();
  }
}
class Func extends Any {
  constructor(ast) {
    const [_name, ...subExprs] = ast;
    super(subExprs.map(se => Any.fromAst(se)));
  }

  static subTypes() {
    return [
      ...userYamFuncs(), Bucket, Aggregates,
      Gt, Lt, Gte, Lte, Eq, Neq,
      Plus, Minus, Mult, Div
    ];
  }

  toAst() {
    return [this.id(), ...this.value.map(sub => sub.toAst())];
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
      const argIndex = _.indexOf(invocation, badInvocation);
      const [expectedType, actual] = badInvocation;

      var got = actual.id();
      if(actual.isInstanceOf(Func)) {
        got = actual.returnType().id();
      }
      return error(`Invocation of function '${this.id()}' expected '${expectedType.id()}' but got '${got}' in argument ${argIndex}`);
    };
    return ok();
  }
}
class YamFunc extends Func {

  static subTypes() { return [] }
  static isa([funcName]) { return funcName === this.id(); }

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
  static signature() { return [Any, Any]; }
  static subTypes() { return [] }
  static isa([funcName]) { return funcName === this.id(); }

  show(actions) {
    const [left, right] = this.value;

    const edit = (e) => {
      if(e.defaultPrevented) return;
      e.preventDefault();
      this.doEdit(actions);
    }

    const id = this.id();

    return html`
      <div class="expr infix" onclick=${edit}>
        <span class="funcName">(${id}</span>
        <span>${left.view(actions)}</span>
        <span>${right.view(actions)})</span>
      </div>
    `
  }

  edit(actions) {
    const unedit = (e) => {
      const ast = sexp(e.currentTarget.value);
      console.log("Replace with ast", ast)
      actions.onReplace(Any.fromAst(ast));
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
class Gt extends  Comparator { static id() { return '>'} }
class Lt extends  Comparator { static id() { return '<'} }
class Gte extends Comparator { static id() { return '>='} }
class Lte extends Comparator { static id() { return '<='} }
class Eq extends  Comparator { static id() { return '=='} }
class Neq extends Comparator { static id() { return '!='} }

class Plus  extends Arithmetic { static id() { return '+'} }
class Minus extends Arithmetic { static id() { return '-'} }
class Mult  extends Arithmetic { static id() { return '*'} }
class Div   extends Arithmetic { static id() { return '/'} }

class Bucket extends YamFunc {
  static signature() { return [Num, Timeunit]; }
  canRemove() { return false; }

}
class Where extends YamFunc {
  static signature() { return [Bool]; }
  static empty() {
    return Any.fromAst(['where', ['==', 'row.type', 'success']]);
  }
}
class Percentile extends YamFunc {
  static signature() { return [Num, Num, Text]; }
  static empty() {
    return Any.fromAst(
      ['percentile', 
        ['-', 'row.end_t', 'row.start_t'],
        50,
        'p50_latency'
      ]
    )
  }
}
class Minimum extends YamFunc {
  static signature() { return [Num, Text]; }
  static empty() {
    return Any.fromAst(
      ['minimum', 
        ['-', 'row.end_t', 'row.start_t'],
        'min_latency'
      ]
    )
  }
}
class Maximum extends YamFunc {
  static signature() { return [Num, Text]; }
  static empty() {
    return Any.fromAst(
      ['maximum', 
        ['-', 'row.end_t', 'row.start_t'],
        'max_latency'
      ]
    )
  }
}
class CountWhere extends YamFunc {
  static signature() { return [Bool, Text]; }
  static empty() {
    return Any.fromAst(
      ['count_where', 
        ['>', ['-', 'row.end_t', 'row.start_t'], 100],
        'exceeds_100ms'
      ]
    )
  }
}
class Aggregates extends YamFunc {
  static signature() { return []; }
  canRemove() { return false; }
  canEdit() { return false; }
}

function userYamFuncs() {
  return [Where, Percentile, Minimum, Maximum, CountWhere];
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
  Bucket, Where, Percentile, CountWhere, Minimum, Maximum,
  userYamFuncs
}