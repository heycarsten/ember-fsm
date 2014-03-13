var utils = Ember.FSM.utils;

describe('utils.isThenable', function() {
  var isThenable = utils.isThenable;

  it('returns true for plain objects where .then is a function', function() {
    expect(isThenable({ then: function() {} })).toBe(true);
  });

  it('returns true for Ember objects where .then is a function', function() {
    var eobj = Ember.Object.create({ then: function() {} });
    expect(isThenable(eobj)).toBe(true);
  });

  it('returns false for plain objects that don\'t have a .then function', function() {
    var eobj = Ember.Object.create({ then: true });
    var obj  = { then: true };
    expect(isThenable(eobj)).toBe(false);
    expect(isThenable(obj)).toBe(false);
  });

  it('returns false for everything else', function() {
    var tests = [
      null,
      undefined,
      false,
      'string',
      1234,
      [],
      {}
    ];

    tests.forEach(function(test) {
      expect(isThenable(test)).toBe(false);
    }, true);
  });
});

describe('utils.capitalCamelize', function() {
  var capCam = utils.capitalCamelize;

  it('camelizes strings and then capitalizes them', function() {
    var expectations = {
      'hello.world':   'HelloWorld',
      'zzt remixes':   'ZztRemixes',
      'big-funThings': 'BigFunThings',
      'is_not-True':   'IsNotTrue'
    };
    var input;
    var expectation;

    for (input in expectations) {
      expectation = expectations[input];
      expect(capCam(input)).toBe(expectation);
    }
  });
});

describe('utils.toArray', function() {
  var toArray = utils.toArray;

  it('wraps stuff into an array', function() {
    var stuff = 'stuff';
    expect(toArray(stuff)).toContain(stuff);
  });

  it('doesn\'t wrap arrays', function() {
    var stuff = ['i', 'am', 'ary'];
    expect(toArray(stuff)).toBe(stuff);
  });
});

describe('utils.withPromise', function() {
  var withPromise = utils.withPromise;
  var resolve     = Ember.RSVP.resolve;

  describe('given a block that yields a thenable object', function() {
    var result;
    var resolution;
    var yieldedPromise;

    beforeEach(function(done) {
      result = withPromise(function() {
        return yieldedPromise = resolve('sup?');
      });

      result.then(function(value) {
        resolution = value;
        done();
      });
    });

    it('returns the original thenable', function() {
      expect(result).toBe(yieldedPromise);
    });

    it('resolves to it\'s intended value', function() {
      expect(resolution).toBe('sup?');
    });
  });

  describe('given a block that yields a non-thenable value', function() {
    var result;
    var resolution;
    var yieldedValue;

    beforeEach(function(done) {
      result = withPromise(function() {
        return yieldedValue = { hey: 'carsten' };
      });

      result.then(function(value) {
        resolution = value;
        done();
      });
    });

    it('returns a promise that resolves to the yielded value', function() {
      expect(resolution).toBe(yieldedValue);
    });
  });

  describe('given a block that throws an error', function() {
    var result;
    var rejection;
    var yieldedException;

    beforeEach(function(done) {
      result = withPromise(function() {
        throw yieldedException = new Error();
      });

      result.catch(function(error) {
        rejection = error;
        done();
      });
    });

    it('returns a promise that rejects with the exception', function() {
      expect(rejection).toBe(yieldedException);
    });
  });
});
