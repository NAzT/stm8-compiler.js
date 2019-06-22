const util = require('util');
const SDCC = require('./SDCC');

const createCompiler = (AppContext) => {
  const _Compiler = function() {
    this.compile = ({cflags, sources, ldflags}) => {
      let promise = new Promise((resolve, reject) => {
        SDCC.setConfig(AppContext);
        SDCC.compileProgram({sources, cflags}).
        then(() => SDCC.createBin()).
        then(() => {
          resolve();
        }).
        catch(reject);
      });
      return promise;
    };
  };
  return new _Compiler;
};

module.exports = {
  createCompiler,
};
