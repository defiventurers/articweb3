require("dotenv").config();

const { installRuntimeStatusEndpoints } = require("../runtimeStatusBootstrap.js");
const { installSixteenIceWarriorsBackend } = require("../sixteenIceWarriorsBackendBootstrap.js");

installRuntimeStatusEndpoints();
installSixteenIceWarriorsBackend();
require("./start-with-indexer.js");
