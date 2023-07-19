const fs = require("fs");
const { unlink } = require("fs/promises");
const { auth } = require("./auth.js");
const {
  GOOGLE_DOC_TYPE,
  WORD_DOC_TYPE,
  GOOGLE_SHEET_TYPE,
  EXCEL_SHEET_TYPE,
  DRIVE_FOLDER_TYPE,
  DRIVE_SHORTCUT_TYPE,
} = require("./constants.js");
const { bytesToMB, isFolder, shutDown } = require("./utils.js");
const { google } = require("googleapis");

let HOST_DRIVE;
let TARGET_DRIVE;
const INITIAL_NODE = {
  kind: "drive#file",
  mimeType: DRIVE_FOLDER_TYPE,
  id: "root",
  name: "Root",
  parent: "root",
};
const TRUTH_PATTERN = [];
let TP_ITERATOR = 0;
const SKIPPED = [];

async function authInit() {
  const host_auth_client = await auth(true);
  const target_auth_client = await auth(false);
  HOST_DRIVE = google.drive({ version: "v3", auth: host_auth_client });
  TARGET_DRIVE = google.drive({
    version: "v3",
    auth: target_auth_client,
  });
}

const listFiles = async (hostParentID, targetParentID) => {
  let res = await HOST_DRIVE.files.list({
    q: `"${hostParentID}" in parents and trashed=false and mimeType!="${DRIVE_SHORTCUT_TYPE}"`,
    fields:
      "nextPageToken, kind, incompleteSearch, files(size, kind, mimeType, id, name)",
  });
  const files = res.data.files;
  while (res.data.nextPageToken) {
    res = await HOST_DRIVE.files.list({
      pageToken: res.data.nextPageToken,
      q: `"${hostParentID}" in parents and trashed=false and mimeType!="${DRIVE_SHORTCUT_TYPE}"`,
      fields:
        "nextPageToken, kind, incompleteSearch, files(size, kind, mimeType, id, name)",
    });
    for (const file of res.data.files) files.push(file);
    if (files.length === 0) break;
  }
  for (const item of files) {
    bytesToMB(item);
    item.parent = targetParentID;
  }
  return files;
};

async function buildTruthPattern(path, currentNode) {
  console.log(path);
  const { parent, children, ...restOfCurrentNode } = currentNode;
  TRUTH_PATTERN.push(restOfCurrentNode);
  if (isFolder(currentNode)) {
    currentNode.children = await listFiles(currentNode.id, null);
    for (const child of currentNode.children)
      await buildTruthPattern(path + child.name + "/", child);
  }
}

const createNewFolder = async (name, parent, mimeType) => {
  // if (name !== TRUTH_PATTERN[TP_ITERATOR].name) {
  //   console.log("MISMATCH FOUND DURING FOLDER CREATION:", name);
  //   shutDown();
  // }
  const res = await TARGET_DRIVE.files
    .create({
      requestBody: {
        name: name,
        parents: [parent],
        mimeType: mimeType,
      },
    })
    .then((res) => {
      TP_ITERATOR++;
      return res;
    });
  return res.data.id;
};

const fileTransfer = async (currentNode) => {
  // if (currentNode.name !== TRUTH_PATTERN[TP_ITERATOR].name) {
  //   console.log("MISMATCH FOUND DURING FILE TRANSFER:");
  //   console.log(currentNode);
  //   shutDown();
  // }
  if (parseFloat(currentNode.size) > 5) {
    SKIPPED.push(currentNode);
    console.log("====> SKIPPING FILE: (TOO LARGE)");
    TP_ITERATOR++;
    return;
  }

  let exportType;
  let convertBeforeUpload = false;
  let fileNameOnDisk = "";

  if (currentNode.mimeType === GOOGLE_DOC_TYPE) {
    exportType = WORD_DOC_TYPE;
    convertBeforeUpload = true;
    fileNameOnDisk = currentNode.name + ".docx";
  } else if (currentNode.mimeType === GOOGLE_SHEET_TYPE) {
    exportType = EXCEL_SHEET_TYPE;
    convertBeforeUpload = true;
    fileNameOnDisk = currentNode.name + ".xlsx";
  } else {
    convertBeforeUpload = false;
    fileNameOnDisk = currentNode.name;
  }

  let res = convertBeforeUpload
    ? await HOST_DRIVE.files.export(
        {
          fileId: currentNode.id,
          mimeType: exportType,
        },
        {
          responseType: "stream",
        },
      )
    : await HOST_DRIVE.files.get(
        {
          fileId: currentNode.id,
          alt: "media",
        },
        {
          responseType: "stream",
        },
      );
  const saveToDisk = new Promise((resolve) => {
    let streamToSave = fs.createWriteStream(fileNameOnDisk);
    res.data.pipe(streamToSave);

    streamToSave.on("finish", function () {
      streamToSave.close();
    });
    streamToSave.on("close", async () => {
      resolve();
    });
  });
  await saveToDisk;

  console.log("====> File Downloaded: ", fileNameOnDisk);

  convertBeforeUpload
    ? await TARGET_DRIVE.files.create({
        requestBody: {
          name: currentNode.name,
          parents: [currentNode.parent],
          mimeType: currentNode.mimeType,
        },
        media: {
          mimeType: exportType,
          body: fs.createReadStream(fileNameOnDisk),
        },
      })
    : await TARGET_DRIVE.files.create({
        requestBody: {
          name: currentNode.name,
          parents: [currentNode.parent],
          mimeType: currentNode.mimeType,
        },
        media: {
          body: fs.createReadStream(fileNameOnDisk),
        },
      });

  await unlink(fileNameOnDisk);

  console.log("====> File Uploaded: ", fileNameOnDisk);
  TP_ITERATOR++;
};

const sync = async (path, currentNode) => {
  console.log(path);
  if (isFolder(currentNode)) {
    currentNode.newID = await createNewFolder(
      currentNode.name,
      currentNode.parent,
      currentNode.mimeType,
    );
    currentNode.children = await listFiles(currentNode.id, currentNode.newID);
    for (const child of currentNode.children)
      await sync(path + child.name + "/", child);
  } else {
    await fileTransfer(currentNode);
  }
};

async function main() {
  await authInit();

  console.log("Building Truth Pattern...");
  console.log();

  // await buildTruthPattern("./", { ...INITIAL_NODE });

  console.log("Finished. Starting sync now...");
  console.log();

  await sync("./", { ...INITIAL_NODE });

  console.log("Sync Complete.");
}

main();
