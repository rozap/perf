import chai from 'chai';
import should from 'should';
import {fromAst} from '../../web/static/js/pages/widgets/yams/funcs'
var expect = chai.expect;


describe('from ast', function() {

  it('can make a bucket', () => {
    const b = fromAst([".", ["bucket", 5000, "milliseconds"]]);
    expect(b.name()).to.eql('Bucket');
  });


  // it('can make a where', () => {
  //   const w = fromAst([".", ["where", ["==", ["row.type", "success"]]]])
  //   console.log(w.children);

  // })

});