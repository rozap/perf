import chai from 'chai';
import should from 'should';
import {
  Any, Num, Text, Row, Bool, Func, Timeunit, YamFunc, Infix, Gt, Lt, Gte, Lte, Eq, Neq, Bucket, Where} from '../../web/static/js/pages/widgets/yams/funcs'
var expect = chai.expect;

const ok = {
  errors: [],
  warnings: []
}

function error(reason) {
  return {errors: [reason], warnings: []}
}


describe('funcs', () => {

  describe('fromAst', () => {
    it('can make a num', () => {
      const node = Any.fromAst(5000);
      expect(node.id()).to.eql('num');
    });

    it('can convert an row.accessor to Row', () => {
      const node = Any.fromAst("row.type");
      expect(node.id()).to.eql('row');
    });

    it('can make a timeunit', () => {
      const node = Any.fromAst('milliseconds');
      expect(node.id()).to.eql('timeunit');
    });

    it('can make a bucket', () => {
      const node = Any.fromAst(["bucket", 5000, "milliseconds"]);
      expect(node.id()).to.eql('bucket');
    });

    it('can make a where', () => {
      const node = Any.fromAst(["where", ["==", "row.type", "success"]]);
      expect(node.id()).to.eql('where');
    });

    it('can make a percentile', () => {
      const node = Any.fromAst(["percentile", ["-", "row.end_t", "row.start_t"], 95, "p95_latency"]);
      expect(node.id()).to.eql('percentile');
    });

    it('can make a nested expression', () => {
      const ast = [
        "count_where", [
          "&&",
          [">=", "row.status", 200],
          ["<", "row.status", 300]
        ],
        "2xx_count"
      ];
      const node = Any.fromAst(ast);
      expect(node.toAst()).to.eql(ast);
    });
  })

  describe('toAst', () => {
    it('can make a num', () => {
      const node = Any.fromAst(5000);
      expect(node.toAst()).to.eql(5000)
    });

    it('can convert an row.accessor to Row', () => {
      const node = Any.fromAst("row.type");
      expect(node.toAst()).to.eql("row.type");
    });

    it('can make a timeunit', () => {
      const node = Any.fromAst('milliseconds');
      expect(node.toAst()).to.eql('milliseconds');
    });

    it('can make a bucket', () => {
      const ast = ["bucket", 5000, "milliseconds"];
      const node = Any.fromAst(ast);
      expect(node.toAst()).to.eql(ast)
    });

    it('can make a where', () => {
      const ast = ["where", ["==", "row.type", "success"]];
      const node = Any.fromAst(ast);
      expect(node.toAst()).to.eql(ast);
    });

    it('can make a percentile', () => {
      const ast = ["percentile", ["-", "row.end_t", "row.start_t"], 95, "p95_latency"];
      const node = Any.fromAst(ast);
      expect(node.toAst()).to.eql(ast);
    });
  })

  describe('type checked', () => {
    it('can check an ok ==', () => {
      const node = Any.fromAst(["==", 5, "success"]);
      const checked = node.check()
      expect(checked).to.eql(ok);
    });

    it('bucket typecheck', () => {
      const node = Any.fromAst(["bucket", 5000, "milliseconds"]);
      expect(node.check()).to.eql(ok);
      const bad = Any.fromAst(["bucket", 5000, "fooey"]);
      expect(bad.check()).to.eql(error(
        "Invocation of function 'bucket' expected 'timeunit' but got 'text' in argument 1"
      ));
    });

    it('where typecheck', () => {
      const node = Any.fromAst(["where", ["==", "row.type", "success"]]);
      expect(node.check()).to.eql(ok);
      const bad = Any.fromAst(["where", "foo"]);
      expect(bad.check()).to.eql(error(
        "Invocation of function 'where' expected 'bool' but got 'text' in argument 0"
      ));

      const badFunc = Any.fromAst(["where", ["+", "row.start_t", 5]]);
      expect(badFunc.check()).to.eql(error(
        "Invocation of function 'where' expected 'bool' but got 'num' in argument 0"
      ));
    });

    it('percentile typecheck', () => {
      const node = Any.fromAst(["percentile", ["-", "row.end_t", "row.start_t"], 95, "p95_latency"]);
      expect(node.check()).to.eql(ok);

      var bad = Any.fromAst(["percentile", ["-", "row.end_t", "row.start_t"], "foo", 28]);
      expect(bad.check()).to.eql(error(
        "Invocation of function 'percentile' expected 'num' but got 'text' in argument 1"
      ));
      bad = Any.fromAst(["percentile", ["-", "row.end_t", "row.start_t"], 28, 28]);
      expect(bad.check()).to.eql(error(
        "Invocation of function 'percentile' expected 'text' but got 'num' in argument 2"
      ));
      bad = Any.fromAst(["percentile", ["==", "row.end_t", 28], 28, "foo"]);
      expect(bad.check()).to.eql(error(
        "Invocation of function 'percentile' expected 'num' but got 'bool' in argument 0"
      ));
    });
  })

  describe('tree operations', () => {
    it('isInstanceOf num', () => {
      const node = Any.fromAst(5);
      expect(node.isInstanceOf(Any)).to.be.true
      expect(node.isInstanceOf(Num)).to.be.true
      expect(node.isInstanceOf(Func)).to.be.false
    });
  });

  // describe('suggestions', () => {
  //   it('for bucket', () => {
  //     const node = fromAst([".", ["bucket", 5000, "milliseconds"]]);
  // });


});