const express = require("express");
const cors = require("cors");

function debug(...args) {
	if (module.exports.debug) console.debug("[RPC]", ...args);
}

class RPCApp {
	constructor() {
		this.procedures = {};
	}

	register(async, name, fnct) {
		if (typeof async !== "boolean") {
			fnct = name;
			name = async;
			async = false;
		}
		if (typeof name === "function") { 
			fnct = name;
			name = fnct.name;
		}
		debug("register:", name, "async:", async);
		this.procedures[name] = { fnct, async };
	}

	registerSync(name, fnct) {
		this.register(false, name, fnct)
	}

	registerAsync(name, fnct) {
		this.register(true, name, fnct);
	}

}

class RPCServer {
	constructor(port, callback) {
		this.apps = {};
		if (!port || typeof port === "function") port = 3501;
		var app = express();
		app.get("/", function (req, res) {
			res.json("RPC server");
		});
		app.use("/RPC", cors());
		app.use("/RPC", express.json({ strict: false }));
		app.post("/RPC/:app/:procedure", (req, res) => {
			var appName = req.params.app;
			var app = this.apps[appName];
			if (!app) {
				console.error("No existe la app:", appName);
				res.status(404).json("No existe la app: " + appName);
				return;
			}
			var procedureName = req.params.procedure;
			var procedure = app.procedures[procedureName];
			if (!procedure) {
				console.error("No existe el procedimiento:", procedureName);
				res.status(404).json("No existe el procedimiento: " + procedureName);
				return;
			}

			var params = req.body;
			console.log("RPC Server - Llamando a:", appName, procedureName, "con params:", params);
			
			if (procedure.async) {
				console.log("Es async, llamando con callback");
				procedure.fnct(params, function(result) {
					console.log("Callback async llamado con resultado:", result);
					setTimeout(() => {
						res.json(result);
					}, module.exports.delay);
				});
			} else {
				console.log("Es sync, ejecutando directamente");
				var result = procedure.fnct(params);
				setTimeout(() => {
					res.json(result);
				}, module.exports.delay);
			}
		});
		app.listen(port, callback);
	}

	createApp(name) {
		debug("app:", name);
		return this.apps[name] = new RPCApp();
	}
}

module.exports = {
	debug: false,
	server: function (port, callback) { return new RPCServer(port, callback); },
	delay: 0
}
