const path = require('path');
const util = require('util');
const execPromise = util.promisify(require('child_process').exec);
const execSync = require('child_process').execSync;
let G = {};

const ospath = function(p) {
  if (process.platform == 'win32') {
    return p.replace(/\//g, '\\');
  }
  return p;
};

const setConfig = (AppContext) => {
  G = Object.assign({}, AppContext);
  G.compiler = AppContext.compiler;
  G.Log = require('./log');
  G.esptool = AppContext.esptool;
  G.board_name = AppContext.board_name;
  G.toolchain_dir = AppContext.toolchain_dir;
  G.COMPILER_GCC = `${G.toolchain_dir}/sdcc`;
  //G.ARCHIVE_FILE = `${G.user_app_dir}/libmain.a`;
  G.PROCESS_DIR = AppContext.process_dir || `${__dirname}/../..`;
  G.ospath = ospath;
  console.log(`process_dir=${G.process_dir}`);
};
const getName = (file) => path.basename(file).split('.')[0];
let compileFiles = async function({sources, cflags, ldflags}, cb) {
  console.log(`args=`, arguments);
  sources.forEach(async (file, idx, arr) => {
    let filename = getName(file);
    let fn_obj = `${G.user_app_dir}/${filename}.o`;
    let cmd = `"${G.COMPILER_GCC}" ${cflags} ${ldflags} -c "${file}" -o "${fn_obj}"`;
    try {
      const {stdout, stderr} = await execPromise(G.ospath(cmd),
          {cwd: G.process_dir});
      console.log(G.process_dir);
      if (!stderr) {
        console.log(`compiling... ${path.basename(file)} ok.`);
        // console.log(`${stdout}`);
      } else {
        console.log(`compiling... ${path.basename(file)} ok. (with warnings)`);
        // console.log(`${stderr}`);
      }
    } catch (e) {
      console.error(e);
      console.log(`compiling... ${file} failed.`);
      cb && cb(e);
    }
    if (idx === arr.length - 1) {
      cb && cb();
    }
  });
};

async function createBin() {
  //sdcc -I../../include -mstm8 -lstm8 leddance.c bin/clock.rel bin/dance.rel bin/gpio.rel -obin/

  console.log(`creating bin image... ${G.BIN_FILE}`);
  //let cmd = `"${G.esptool}" --chip esp32 elf2image --flash_mode "dio" --flash_freq "40m" --flash_size "4MB" -o "${G.BIN_FILE}" "${G.ELF_FILE}"`;
  //return execPromise(G.ospath(cmd), {cwd: G.process_dir});
  return true;
}

async function linkObject({ldflags}) {
  console.log(`linking... ${G.ELF_FILE}`);
  var cmd = `"${G.COMPILER_GCC}"` +
      ` -nostdlib -u call_user_start_cpu0 -Wl,--gc-sections -Wl,-static -Wl,` +
      `--start-group ${ldflags} -L"${G.user_app_dir}" -lgcc -lstdc++ -lgcov -Wl,--end-group -Wl,-EL` +
      ` -o "${G.ELF_FILE}"`;

  return execPromise(G.ospath(cmd), {cwd: G.process_dir});
}

async function archiveProgram({plugins_sources}) {
  console.log(`archiving... ${G.ARCHIVE_FILE} `);
  let obj_files = plugins_sources.map(
      plugin => `${G.user_app_dir}/${getName(plugin)}.o`).join(' ');
  var cmd = `"${G.COMPILER_AR}" cru "${G.ARCHIVE_FILE}" ${obj_files}`;
  return execPromise(G.ospath(cmd), {cwd: G.process_dir});
}

async function flash({portname: port, baudrate, G, stdio}) {
  baudrate = baudrate || 480600;
  stdio = stdio || 'inherit';
  var flash_cmd = util.format(
      `"${G.esptool}" --chip esp32 %s --before "default_reset" --after "hard_reset" write_flash -z --flash_mode "dio" --flash_freq "40m" --flash_size detect 0x1000 "%s" 0x8000 "%s" 0x10000 "%s"`,
      `--port "${port}" --baud ${baudrate}`,
      `./${G.release_dir}/bootloader.bin`,
      `./${G.release_dir}/partitions_singleapp.bin`,
      `./${G.user_app_dir}/${G.board_name}/${G.board_name}.bin`,
  );
  execSync(flash_cmd, {cwd: G.process_dir, stdio});
}

module.exports = {
  createBin,
  linkObject,
  archiveProgram,
  compileFiles: util.promisify(compileFiles),
  flash,
  setConfig,
};
