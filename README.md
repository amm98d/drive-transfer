# Drive Transfer

Drive Transfer is a Node.js utility for transferring all data from one Google Drive account to another.

## Who is it for

If you're having issues transferring your whole drive data from one Google account to another because of files like Google Docs, Sheets, Presentations, etc (they don't open in the new drive unless you download and upload the file specifically), then you might find this utility helpful. Otherwise, you're good.

## How it works

- When you run this utility it will ask you to authenticate the host account first, and then the destination account
- The replication will be done inside a folder called "Root" in the destination account's root folder. This folder will be created by the utility
- Then it will traverse the host account's root folder, in a recursive DFS manner
- For each file/folder it comes across in the host account, it will replicate it in the destination account
- For files, it will first download the file on your disk, then upload it to the destination drive, and then delete the file before moving on

## How to Use

1. Clone the repository
2. Do an `npm install` (assuming you have Node.js and npm installed
)
3. You'll need to provide a credentials.js file that you can quickly and easily create by following the instructions [here](https://developers.google.com/drive/api/quickstart/nodejs#authorize_credentials_for_a_desktop_application) (make sure you have a project created in your Google Cloud Console for this)
4. Once you've downloaded the credentials.json file, place it in the root folder of your cloned repo.
5. Run with `node index.js`

## Limitations

- Won't transfer shortcuts
- Won't transfer files larger than 5 MB (limitation by Drive API). A log (skipped.txt) is created for these files along with their path so you can do them manually
- Although for most cases it will work just fine, there is no error handling in this code. Exceptions can and will be thrown
- Won't transfer files in the "Shared With Me" folder
- Will only transfer files owned by the host user and located in the root folder
