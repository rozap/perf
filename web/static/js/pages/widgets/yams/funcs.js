import _ from "underscore";
import changeCase from "change-case";
import html from "choo/html";


function merge(p, children) {
  const all = (kind) => {
    return _.flatten(children.map(c => c[kind]))
  }
  return {
    errors: p.errors.concat(all(children, 'errors')),
    warnings: p.warnings.concat(all(children, 'warnings'))
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
  static id() {
    return changeCase.snakeCase(this.name);
    // return this.name.toLowerCase();
  }
  id() {
    return this.constructor.id();
  }
  constructor(value) {
    this.value = value;
  }
  check() {
    const isOk = (results) => {
      console.log(results)
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
    console.log("Rendering", this, this.isEditing)
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



class Num extends Any {
  static subTypes() { return []; }
  static isa(a) { return _.isNumber(a) }

  show(actions) {
    const edit = () => this.doEdit(actions);
    return html`
      <span class="expr atom num" onclick=${edit}>${this.value}</span>
    `
  }
  edit(actions) {
    const onUpdate = (e) => {
      this.value = e.currentTarget.value;
    }
    const unedit = () => this.doneEdit(actions)
    return html`
      <input type="number" value=${this.value} onchange=${onUpdate} onblur=${unedit}/>
    `
  } 
}
class Text extends Any {
  static subTypes() { return []; }
  static isa(a) { return _.isString(a) }
  show(actions) {
    return html`
      <span class="expr atom text">${this.value}</span>
    `
  }
}
class Row extends Any {
  static subTypes() { return []; }
  static isa(a) { return _.isString(a) && (a.indexOf("row.") === 0) }
  show(actions) {
    return html`
      <span class="expr atom row">${this.value}</span>
    `
  }
}
class Bool extends Any {
  static subTypes() { return []; }
  static isa(a) { return _.isBoolean(a); }
  show(actions) {
    return html`
      <span class="expr atom bool">${this.value}</span>
    `
  }
}
class Timeunit extends Any {
  static subTypes() { return []; }
  static isa(a) {
    const units = ['minutes', 'seconds', 'milliseconds', 'microseconds']
    return _.contains(units, a);
  }
  show(actions) {
    return html`
      <span class="expr timeunit">${this.value}</span>
    `
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
    const [_, [_name, ...subExprs]] = ast;
    super(subExprs.map(se => Any.fromAst(se)));
  }
  static isa([dot, [funcName]]) { return (dot === '.') && (funcName === this.id()); }
  static subTypes() { return [] }

  toAst() {
    return ['.', [this.id(), ...this.value.map(sub => sub.toAst())]];
  }

  show(actions) {
    const removeButton = () => {
      if(this.canRemove()) {
        return html`
          <a class="remove"
            onclick=${() => actions.onExprDeleted(expr)}
            href="javascript:void(0)">
            <i class="ion-ios-close"></i>
          </a>
        `;
      }
    }

    return html`
      <div class="expr yam-func ${this.canEdit()? 'editable' : 'frozen'}">
        <span class="func-name">${this.id()}</span>
        ${this.value.map(v => v.view(actions))}
        ${removeButton()}
      </div>
    `
  }
}

class Infix extends Func {
  constructor(ast) {
    const [_name, subExprs] = ast;
    super(subExprs.map(se => Any.fromAst(se)));
  }
  static signature() { return [Any, Any]; }
  static subTypes() { return [] }
  static isa([operator, _args]) { return this.op() === operator; }

  toAst() {
    return [this.op(), this.value.map(sub => sub.toAst())];
  }

  op() { return this.constructor.op() }

  show() {
    const [left, right] = this.value;
    return html`
      <div class="expr infix">
        <span>(${left.view()}</span>
        <span class="funcName">${this.op()}</span>
        <span>${right.view()})</span>
      </div>
    `
  }
}
class Comparator extends Infix {
  returnType() { return Bool; }
}
class Arithmetic extends Infix {
  returnType() { return Num; }
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

function toAst(query) {
  return query.map(q => q.toAst());
}

export default {
  fromAst, toAst, Any, Num, Text, Row, Bool, Func, Timeunit, 
  Gt, Lt, Gte, Lte, Eq, Neq, 
  Plus, Minus, Mult, Div,
  Bucket, Where, Percentile
}