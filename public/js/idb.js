let db;
const request = indexedDB.open("budget_tracker", 1);

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database
  const db = event.target.result;
  // create an object store (table) called `new_entry`, set it to have an auto incrementing primary key of sorts
  db.createObjectStore("new_entry", { autoIncrement: true });
};

// upon a successful
request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run uploadData() function to send all local db data to api
  if (navigator.onLine) {
    // we haven't created this yet, but we will soon, so let's comment it out for now
    uploadData();
  }
};

request.onerror = function (event) {
  // log error here
  console.log(event.target.errorCode);
};

// executed if we attempt to submit new data and there's no internet connection
function saveRecord(record) {
  // open a new transaction with the database with read and write permissions
  const transaction = db.transaction(["new_entry"], "readwrite");

  // access the object store for `new_entry`
  const budgetObjectStore = transaction.objectStore("new_entry");

  // add record to your store with add method
  budgetObjectStore.add(record);
}

function uploadData() {
  // open a transaction on your pending db
  const transaction = db.transaction(["new_entry"], "readwrite");

  // access your pending object store
  const budgetObjectStore = transaction.objectStore("new_entry");

  // get all records from store and set to a variable
  const getAll = budgetObjectStore.getAll();

  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((serverResponse) => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }

          const transaction = db.transaction(["new_entry"], "readwrite");
          const budgetObjectStore = transaction.objectStore("new_entry");
          // clear all items in your store
          budgetObjectStore.clear();
        })
        .catch((err) => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}

// listen for app coming back online
window.addEventListener("online", uploadData);
