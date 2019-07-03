const util = require("util");
const SDCC = require("./SDCC");

const createCompiler = (AppContext) => {
  const _Compiler = function() {
    this.compile = (args) => {
      let {cflags, libs, sources, ldflags} = args.compiler;
      let {tools, params} = args.flasher;
      console.log(`args=`, args);
      let promise = new Promise((resolve, reject) => {
        SDCC.setConfig(AppContext);
        SDCC.compileFiles({libs, sources, cflags, ldflags}).then((args) => {
          params = [...params, ...args.params];
          return SDCC.flash({tools, params});
        }).then(() => {
          resolve();
        }).catch((r) => {
          //console.error(r);
        });
      });
      return promise;
    };
  };
  return new _Compiler;
};

module.exports = {
  createCompiler,
};
