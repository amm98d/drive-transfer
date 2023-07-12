const { fileToJSON, logTree } = require("./utils");

async function exportFile(authClient) {
  const fs = require("fs");
  const drive = google.drive({ version: "v3", auth: authClient });

  let res = await drive.files.export(
    {
      fileId: "1iIRtBHvpJbGgls8-jPNCViy-9USneCoDFt63yBogmVo",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    {
      responseType: "stream",
    },
  );
  let streamToSave = fs.createWriteStream("./sample.docx");
  res.data.pipe(streamToSave);

  streamToSave.on("finish", function () {
    console.log("Proccess FInished");
    streamToSave.close();
  });
  streamToSave.on("close", function () {
    console.log("Stream closed");
  });
  streamToSave.on("error", function (error) {
    console.log("ErrorStream:", error);
  });
}

function findMaxSize(currentNode, maxSize) {
  if (currentNode.mimeType !== "application/vnd.google-apps.folder") {
    if ("size" in currentNode) return parseFloat(currentNode.size);
    else return 0;
  } else {
    if (currentNode.children) {
      let localMax = -1;
      for (const child of currentNode.children) {
        localMax = Math.max(findMaxSize(child, maxSize), localMax);
      }
      return Math.max(localMax, maxSize);
    }
  }
}

function findExceedingCount(path, currentNode, count) {
  if (currentNode.mimeType !== "application/vnd.google-apps.folder") {
    if ("size" in currentNode && parseFloat(currentNode.size) > 5) {
      console.log(currentNode.size, path + currentNode.name);
      return 1;
    } else return 0;
  } else {
    if (currentNode.children) {
      let localCount = 0;
      for (const child of currentNode.children) {
        localCount += findExceedingCount(
          path + currentNode.name + "/",
          child,
          count,
        );
      }
      return localCount + count;
    }
  }
}

async function importFile(authClient) {
  const fs = require("fs");
  const drive = google.drive({ version: "v3", auth: authClient });

  const file = await drive.files.create({
    requestBody: {
      name: "LOM - Frankfurt UAS - High Integrity Systems",
      parents: ["1DwT0gTNM3kOOptsbgT-WObMeVvK_cSQc"],
      mimeType: "application/vnd.google-apps.document",
    },
    media: {
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      body: fs.createReadStream(
        "./LOM - Frankfurt UAS - High Integrity Systems.docx",
      ),
    },
  });
  console.log("File Id:", file.data.id);
  return file.data.id;
}

function findAllMIMETypes(currentNode, set) {
  if (!set.includes(currentNode.mimeType)) set.push(currentNode.mimeType);
  if (currentNode.children) {
    let localSet = [];
    for (const child of currentNode.children)
      localSet = findAllMIMETypes(child, set);
    for (const item of localSet) if (!set.includes(item)) set.push(item);
  }
  return set;
}

async function main() {
  const tree = await fileToJSON("./truth-tree.json");
  console.log(findAllMIMETypes(tree, []));
}

main();
