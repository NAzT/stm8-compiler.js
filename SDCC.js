const path = require("path");
const util = require("util");
const execPromise = util.promisify(require("child_process").exec);
const execSync = require("child_process").execSync;
let G = {};

//sdcc -c -I../../include -mstm8 -lstm8 ../../src/gpio.c -obin/
//sdcc -c -I../../include -mstm8 -lstm8 ../../src/clock.c -obin/
//sdcc -c -I../../include -mstm8 -lstm8 ../../src/dance.c -obin/
//sdcc -I../../include -mstm8 -lstm8 leddance.c bin/clock.rel bin/dance.rel bin/gpio.rel -obin/

const ospath = function(p) {
  if (process.platform == "win32") {
    return p.replace(/\//g, "\\");
  }
  return p;
};

const setConfig = (AppContext) => {
  G = Object.assign({}, AppContext);
  G.compiler = AppContext.compiler;
  G.Log = require("./log");
  G.esptool = AppContext.esptool;
  G.board_name = AppContext.board_name;
  G.toolchain_dir = AppContext.toolchain_dir;
  G.COMPILER_GCC = `${G.toolchain_dir}/sdcc`;
  G.PROCESS_DIR = AppContext.process_dir || `${__dirname}/../..`;
  G.ospath = ospath;
  console.log(`process_dir=${G.process_dir}`);
};

const getFileName = (file) => path.basename(file).split(".")[0];
let compileFiles = async function({libs, sources, cflags, ldflags}, cb) {
  let libsCompiled = [];
  let cmds = [];
  libs.forEach((file, idx, arr) => {
    let cmd = `"${G.COMPILER_GCC}" ${cflags} ${ldflags} -c "${file}" -o"bin/"`;
    libsCompiled.push(`bin/${path.basename(file).split(".")[0]}.rel`);
    cmds.push({cmd, file: path.basename(file)});
  });

  sources.forEach((file, idx, arr) => {
    let cmd = `"${G.COMPILER_GCC}" ${cflags} ${ldflags} ${libsCompiled.join(
        " ")} "${file}" -o"bin/"`;
    cmds.push({cmd, file: path.basename(file)});
  });

  for (const [idx, args] of cmds.entries()) {
    let {cmd, file} = args;
    try {
      const {stdout, stderr} = await execPromise(G.ospath(cmd),
          {cwd: G.process_dir});
      console.log(cmd);
      if (!stderr) {
        //console.log(`compiling... ${path.basename(file)} ok.`);
      } else {
        console.log(`compiling... ${path.basename(file)} ok. (with warnings)`);
        console.log(`${stderr}`);
      }
    } catch (e) {
      console.error(e);
      console.log(`compiling... ${file} failed.`);
      cb && cb(e);
    }
  }

  const out = {
    params: ["-pstm8s103f3", `-wbin/${getFileName(sources[0])}.ihx`],
  };
  return cb(null, out);
};

async function flash(args) {
  const {tools, params, stdio} = args;
  let flash_cmd = `${tools} ${params.join(" ")}`;
  console.log(flash_cmd);
  execSync(flash_cmd, {cwd: G.process_dir, stdio});
}

module.exports = {
  compileFiles: util.promisify(compileFiles),
  flash,
  setConfig,
};
