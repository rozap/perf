import _ from "underscore";

class Any {
  static isa(a) { return true; }
  static subTypes() {
    return [Num, Timeunit, Bool, Func];
  }
  static fromAst(a) {
    if(this.subTypes().length === 0) {
      return new this(a);
    }
    const klass = _.find(this.subTypes(), (c) => c.isa(a))
    return klass? klass.fromAst(a) : (new this(a));
  }
  name() {
    return this.constructor.name;
  }
}
class Num extends Any {
  static subTypes() {
    return [];
  }
  static isa(a) { return _.isNumber(a) }
}
class Bool extends Any {
  static subTypes() {
    return [];
  }
  static isa(a) { return _.isBoolean(a); }
}
class Func extends Any {
  static subTypes() {
    return [YamFunc];
  }
  static isa(a) { return _.isArray(a) }
}

class Timeunit extends Any {
  static isa(a) {
    const units = ['minutes', 'seconds', 'milliseconds', 'microseconds']
    return _.contains(units, a);
  }
}

class YamFunc extends Func {
  constructor(ast) {
    super();
    const [_, [_name, ...subExprs]] = ast;
    this.children = subExprs.map(fromAst);
  }
  static isa(a) { return _.first(a) === '.'; }
  static subTypes() {
    return [Bucket, Where]
  }
}

class Bucket extends YamFunc {
  static signature() {
    return [Num, Timeunit];
  }
  static isa([_, [funcName]]) { return funcName === 'bucket'; }
  static subTypes() { return [] }
}

class Where extends YamFunc {
  static signature() {
    return [Func];
  }
  static isa([_, [funcName]]) { return funcName === 'where'; }
  static subTypes() { return [] }
}


function fromAst(expr) {
  return Any.fromAst(expr);
}

export default {
  fromAst
}