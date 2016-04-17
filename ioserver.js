/****************************************************/
/*         IOServer - v0.1.8                        */
/*                                                  */
/*         Damn simple socket.io server             */
/****************************************************/
/*             -    Copyright 2014    -             */
/*                                                  */
/*   License: Apache v 2.0                          */
/*   @Author: Ben Mz                                */
/*   @Email: 0x62en (at) gmail.com                  */
/*                                                  */
/****************************************************/

(function() {
  var HOST, IOServer, LOG_LEVEL, PORT, Server, fs, http, https,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  fs = require('fs');

  Server = require('socket.io');

  http = require('http');

  https = require('https');

  PORT = 8080;

  HOST = 'localhost';

  LOG_LEVEL = ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTIFICATION', 'INFORMATION', 'DEBUG'];

  module.exports = IOServer = (function() {
    function IOServer(arg) {
      var host, login, port, secure, ssl_ca, ssl_cert, ssl_key, verbose;
      host = arg.host, port = arg.port, login = arg.login, verbose = arg.verbose, secure = arg.secure, ssl_ca = arg.ssl_ca, ssl_cert = arg.ssl_cert, ssl_key = arg.ssl_key;
      this.host = host ? host : HOST;
      this.port = port ? port : PORT;
      this.login = login ? login : null;
      this.verbose = verbose && LOG_LEVEL.indexOf(verbose.toUpperCase()) ? LOG_LEVEL.indexOf(verbose.toUpperCase()) : 3;
      this.secure = secure ? secure : false;
      this.ssl_ca = ssl_ca ? ssl_ca : null;
      this.ssl_cert = ssl_cert ? ssl_cert : null;
      this.ssl_key = ssl_key ? ssl_key : null;
      this.service_list = {};
      this.method_list = {};
    }

    IOServer.prototype.addService = function(arg) {
      var name, service;
      name = arg.name, service = arg.service;
      if ((name != null) && (name.length > 2) && (service != null) && (service.prototype != null)) {
        this.service_list[name] = new service();
        return this.method_list[name] = this._dumpMethods(service);
      } else {
        return this._logify(3, "#[!] Service name MUST be longer than 2 characters");
      }
    };

    IOServer.prototype._handler = function(req, res) {
      res.writeHead(200);
      return res.end("Hi, I'm a socket-io server.");
    };

    IOServer.prototype.start = function() {
      var app, d, day, hours, minutes, month, ns, ref, seconds, service, service_name, year;
      if (this.verbose) {
        d = new Date();
        day = d.getDate();
        month = d.getMonth();
        year = d.getFullYear();
        hours = d.getHours();
        minutes = d.getMinutes();
        seconds = d.getSeconds();
        hours = hours < 10 ? "0" + hours : "" + hours;
        minutes = minutes < 10 ? ":0" + minutes : ":" + minutes;
        seconds = seconds < 10 ? ":0" + seconds : ":" + seconds;
        this._logify(0, "################### " + day + "/" + month + "/" + year + " - " + hours + minutes + seconds + " #########################");
        this._logify(0, "#[*] Starting server on " + this.host + ":" + this.port + " ...");
      }
      if (this.secure) {
        app = https.createServer({
          key: this.ssl_key,
          cert: this.ssl_cert,
          ca: this.ssl_ca
        }, this._handler);
      } else {
        app = http.createServer(this._handler);
      }
      app.listen(this.port, this.host);
      this.io = Server.listen(app);
      this.io.enable('browser client minification');
      this.io.enable('browser client etag');
      this.io.enable('browser client gzip');
      this.io.set('log level', 1);
      this.io.set('transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
      ns = {};
      ref = this.service_list;
      for (service_name in ref) {
        service = ref[service_name];
        if (this.login != null) {
          ns[service_name] = this.io.of("/" + this.login + "/" + service_name);
        } else {
          ns[service_name] = this.io.of("/" + service_name);
        }
        this._logify(6, "#[*] service " + service_name + " registered...");
        ns[service_name].on('connection', this._handleEvents(ns[service_name], service_name));
      }
      if ((this.channel_list != null) && this.channel_list.length > 0) {
        return io.sockets.on('connection', this._handleEvents(io.sockets, 'global'));
      }
    };

    IOServer.prototype.interact = function(arg) {
      var data, method, ref, room, service;
      ref = arg != null ? arg : {}, service = ref.service, room = ref.room, method = ref.method, data = ref.data;
      return this._findClientsSocket({
        room: room,
        service: service,
        cb: (function(_this) {
          return function(connectedSockets) {
            var i, results, socket;
            if (connectedSockets != null) {
              results = [];
              for (i in connectedSockets) {
                socket = connectedSockets[i];
                if (socket != null) {
                  results.push(socket.emit(method, data));
                } else {
                  results.push(void 0);
                }
              }
              return results;
            }
          };
        })(this)
      });
    };

    IOServer.prototype._handleEvents = function(ns, service_name) {
      return (function(_this) {
        return function(socket) {
          var action, index, ref, results;
          _this._logify(5, "#[*] received connection for service " + service_name);
          ref = _this.method_list[service_name];
          results = [];
          for (index in ref) {
            action = ref[index];
            if (action.substring(0, 1) === '_') {
              continue;
            }
            if (action === 'constructor') {
              continue;
            }
            _this._logify(7, "#[*] method " + action + " of " + service_name + " listening...");
            results.push(socket.on(action, _this._handleCallback({
              service: service_name,
              method: action,
              socket: socket,
              namespace: ns
            })));
          }
          return results;
        };
      })(this);
    };

    IOServer.prototype._handleCallback = function(arg) {
      var method, namespace, service, socket;
      service = arg.service, method = arg.method, socket = arg.socket, namespace = arg.namespace;
      return (function(_this) {
        return function(data) {
          _this._logify(7, "#[*] call method " + method + " of service " + service);
          return _this.service_list[service][method](data, socket);
        };
      })(this);
    };

    IOServer.prototype._dumpMethods = function(klass) {
      var k, names, result;
      result = [];
      k = klass.prototype;
      while (k) {
        names = Object.getOwnPropertyNames(k);
        result = result.concat(names);
        k = Object.getPrototypeOf(k);
        if (!Object.getPrototypeOf(k)) {
          break;
        }
      }
      return this._unique(result).sort();
    };

    IOServer.prototype._unique = function(arr) {
      var hash, i, l, result;
      hash = {};
      result = [];
      i = 0;
      l = arr.length;
      while (i < l) {
        if (!hash.hasOwnProperty(arr[i])) {
          hash[arr[i]] = true;
          result.push(arr[i]);
        }
        ++i;
      }
      return result;
    };

    IOServer.prototype._findClientsSocket = function(arg) {
      var cb, i, id, ns, ref, ref1, res, room, service;
      ref = arg != null ? arg : {}, service = ref.service, room = ref.room, cb = ref.cb;
      res = [];
      ns = this.io.of(service || "/");
      if ((ns != null) && (ns.connected != null)) {
        ref1 = ns.connected;
        for (id in ref1) {
          i = ref1[id];
          if (indexOf.call(Object.keys(ns.connected[id].rooms), room) >= 0) {
            this._logify(7, "send notif " + service + " to " + id + " in " + room);
            res.push(ns.connected[id]);
          }
        }
      }
      return cb(res);
    };

    IOServer.prototype._logify = function(level, text) {
      if (level <= this.verbose) {
        if (level <= 4) {
          return console.error(text);
        } else {
          return console.log(text);
        }
      }
    };

    return IOServer;

  })();

}).call(this);
