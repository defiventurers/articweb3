require("dotenv").config();

const { installRuntimeStatusEndpoints } = require("../runtimeStatusBootstrap.js");

installRuntimeStatusEndpoints();
require("./start-with-indexer.js");
