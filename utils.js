const { DRIVE_FOLDER_TYPE } = require("./constants");

const bytesToMB = (node) => {
  if ("size" in node) node.size = (node.size / (1024 * 1024)).toFixed(2);
};

const isFolder = (node) => {
  return node.mimeType === DRIVE_FOLDER_TYPE;
};

function logTree(TREE) {
  console.log(JSON.stringify(TREE, null, 2));
}

const jsonToFile = async (filename, jsonObject) => {
  const fsp = require("fs").promises;
  await fsp.writeFile(filename, JSON.stringify(jsonObject));
};

const fileToJSON = async (filename) => {
  const fsp = require("fs").promises;
  return await fsp.readFile(filename).then((data) => {
    return JSON.parse(data);
  });
};

const shutDown = () => {
  const process = require("process");
  process.exit();
};

module.exports = {
  bytesToMB,
  isFolder,
  logTree,
  jsonToFile,
  fileToJSON,
  shutDown,
};
