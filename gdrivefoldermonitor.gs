///////////////////////////////////////
// script usage:
// add a folder id to a script property property and make value an empty array
// go to file > project properties > project properties
//////////////////////////////////////

var domain = "yourdomain.com";
var email = "email@domain.com";

function cron() {
  var folders = PropertiesService.getScriptProperties().getKeys();
  for (var i=0; i<folders.length; i++) {
    var currentIds = getCurrentDocumentIds(folders[i]);
    
    if (!currentIds) { continue; }
    
    var storedIds = getStoredDocumentIds(folders[i]);
    
    var newFiles = compareFiles(storedIds, currentIds);
    if (newFiles.length == 0) { continue; }
    
    var copiedIds = copyAndReplace(newFiles, folders[i]);
    
    var allFiles = newFiles.concat(copiedIds);
    
    storeNew(allFiles, folders[i]);
    
    sendEmail(newFiles, folders[i]);
  }
}

//settrashed not working, waiting on issue tracker
function copyAndReplace(files, folderId) {
  var folder = DocsList.getFolderById(folderId);
  var copiedIds = [];
  for (var i=0; i<files.length; i++) {
    var file = DocsList.getFileById(files[i]);
    var name = file.getName();
    var copy = file.makeCopy(name);
    var copyLoc = DocsList.getFolderById(copy.getParents()[0].getId());
    copy.addToFolder(folder);
    copy.removeFromFolder(copyLoc);
    copiedIds.push(copy.getId());
  }
  return copiedIds;
}

function getCurrentDocumentIds(folderId) {
  try {
    var folder = DocsList.getFolderById(folderId);
    var files = folder.getFiles();
  }
  catch(e) {
    return false;
  }
  var fileIds = [];
  for (var i=0; i<files.length; i++) {
    fileIds.push(files[i].getId());
  }
  return fileIds;
}


function getStoredDocumentIds(folderId) {
  var files = PropertiesService.getScriptProperties().getProperty(folderId);
  return files;
}


function compareFiles(stored, current) {
  //iterate over current to find if no a file does not exist in stored
  var newFiles = [];
  for (var i=0; i<current.length; i++) {
    var owner = DocsList.getFileById(current[i]).getOwner().getEmail();
    if (owner.indexOf(domain) !== -1) {
      continue;
    }
    if (stored.indexOf(current[i]) === -1) {
      newFiles.push(current[i]);
    }
  }
  return newFiles;
}

function storeNew(ids, folderId) {
  var stored = JSON.parse(PropertiesService.getScriptProperties().getProperty(folderId));
  var joinstored = stored.concat(ids);
  PropertiesService.getScriptProperties().setProperty(folderId, JSON.stringify(joinstored));
}


function sendEmail(ids, folderId) {
  var folder = DocsList.getFolderById(folderId);
  var parents = [folder.getName()]
  var parent = folder.getParents()[0];
  while (parent.getName() !== 'Root') {
    parents.push(parent.getName());
    parent = parent.getParents()[0];
  }
  parents = parents.reverse();
  var pathstr = parents.join(" > ");
  
  var plural = "";
  if (ids.length < 1) { plural = "s"; }
  
  var filesMarkup = "There have been new file(s) added to: <br><a href='https://drive.google.com/?folders/0B8i9RPnjIuFZZkd0SWZBRnpuQkE'>" + pathstr + "</a><br><br>";
  
  
  for (var i=0; i<ids.length; i++) {
    var file = DocsList.getFileById(ids[i]).getName();
    filesMarkup += '<a href="https://drive.google.com//document/d/'+ids[i]+'">'+ file +'</a><br>';
  }
    
  MailApp.sendEmail({
    to: email,
    subject: 'Files added to Drive',
    htmlBody: filesMarkup
  });
}
