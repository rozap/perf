import Emitter from 'tiny-emitter';
import {Socket} from "phoenix";
import _ from "underscore";
import createHash from "sha.js";

function getToken() {
  const {token} = JSON.parse(localStorage['session']);
  return token;
}

class Store extends Emitter {

  constructor(socket, params) {
    super();
    this.i = 0;

    const makeChannel = () => {
      let channel = socket.channel(this.name(), params);
      console.info("Joining", this.name(), params)
      channel.join()
      .receive("ok", resp => this.onJoin(channel))
      .receive("error", resp => this.onError(resp));
    }

    if(socket.isConnected()) {
      makeChannel();
    } else {
      socket.onOpen(makeChannel);
    }

    socket.onError((e) => {
      this.onError(e);
    });

    this._queued = [];

    setInterval(this._checkTimeouts.bind(this), 500);
  }

  onConnect() {

  }

  onJoin(channel) {
    console.info("Joined channel");
    this._underlying = channel;
    this.emit('connected');

    this.onConnect()

    this._queued.forEach((waiter) => {
      this._doSend(waiter);
    });
    this._queued = [];
  }

  onError(resp) {
    console.error("Channel error", resp);
    this._underlying = false;
    this.emit('error', resp);
  }

  _checkTimeouts() {
    const now = Date.now();
    this._queued = this._queued.filter(({expiry, em}) => {
      if(expiry < now) {
        em.emit('error', {reason: 'timeout'});
        return false;
      }
      return true;
    });
  }

  _doSend({op, params, em}) {
    var i = this.i;
    this.i = i + 1;
    console.log(i, ">>>", op, params)
    this._underlying.push(op, params)
    .receive('ok', (payload) => {
      console.log(i, "<<<", payload);
      em.emit('ok', payload)
    })
    .receive('error', (payload) => {
      console.error(i, "<<<", payload);
      em.emit('error', payload)
    });
  }

  send(op, params, timeout) {
    timeout = timeout || 5000;
    const expiry = Date.now() + timeout;

    const em = new Emitter();
    if(!this._underlying) {
      this._queued.push({op, params, em, expiry});
    } else {
      this._doSend({op, params, em});
    }
    return em;
  }
}

class Api extends Store {
  name() {
    return 'api';
  }
  onConnect() {
    this.login();
  }
  list(name, params) {
    return this.send(`list:${name}`, params);
  }
  get(name, params) {
    return this.send(`read:${name}`, params);
  }
  create(name, params) {
    return this.send(`create:${name}`, params);
  }
  del(name, params) {
    return this.send(`delete:${name}`, params);
  }
  update(name, params) {
    return this.send(`update:${name}`, params);
  }

  login() {
    try {
      this.get('session', {token: getToken()})
      .on('error', (error) => this.emit('login:error', error))
      .on('ok', (resp) => this.emit('login:ok', resp));
    } catch(e) {
      console.info("No session info found, login");
    }
  }

  logout() {
    try {
      this.del('session', {token: getToken()})
      .on('error', (error) => this.emit('logout:error', error))
      .on('ok', (resp) => this.emit('logout:ok', resp))
    } catch(e) {
      console.info("No session info found, logout")
    }
  }
}



class Yams extends Emitter {
  constructor(socket, params) {
    super();
    this._socket = socket;
    this._channels = {};
    this._params = params;
    socket.onError((e) => {
      this.onError(e);
    });
  }
  name() {
    return 'yams';
  }

  onError(resp) {
    console.error('yam channel error', resp)
    this.emit('error', resp);
  }

  close() {
    _.each(this._channels, (chan) => {
      chan.close();
    });
  }

  _makeChannel(name) {
    if(this._channels[name]) {
      this._channels[name].leave();
    }
    let channel = this._socket.channel(`yams:${name}`, this._params);
    console.info(`Joining yams:${name}`);
    this._channels[name] = channel;
    return channel;
  }

  streamOf(name, queryName, query) {
    const channel = this._makeChannel(name)
    const ee = new Emitter();

    channel.on('events', (data) => ee.emit('events', data));
    channel.onError((e) => ee.emit('error', e));
    channel.onClose(() => ee.emit('close'));

    channel.join()
    .receive("ok", _ => {
      console.log(name, "QUERY", query)
      channel.push(queryName, query)
      .receive('error', e => ee.emit('error', e))
    })
    .receive("error", e => ee.emit('error', e));

    return ee;
  }

  changes(name, query) {
    return this.streamOf(name, 'change:events', query);
  }

  query(name, {startSeconds, endSeconds, query}) {
    return this.streamOf(name, 'query:events', {
      start_t_seconds: startSeconds,
      end_t_seconds: endSeconds,
      query
    });
  }
}


function store() {
  var params = {};
  const socket = new Socket("/socket", {params});


  const channels = {
    api: Api,
    yams: Yams
  }

  socket.connect();

  return {
    create: (name, params) => {
      return new channels[name](socket, params || {});
    }
  }
}
export default store;