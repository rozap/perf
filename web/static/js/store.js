import Emitter from 'tiny-emitter';
import {Socket} from "phoenix";
import _ from "underscore";

function getToken() {
  const {token} = JSON.parse(localStorage['session']);
  return token;
}

class Store extends Emitter {

  constructor(socket, params) {
    super();

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
    this._underlying.push(op, params)
    .receive('ok', (payload) => {
      console.log("Channel -->", op, params, payload);
      em.emit('ok', payload)
    })
    .receive('error', (payload) => {
      console.error("Channel -->", op, params, payload);
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

class Yams extends Store {
  name() {
    return 'yams';
  }

  changes(cb) {
    this.send('change:events', {});
    return this._underlying.on('change:events', cb)
  }

  slice(params) {
    return this.send('list:events', params);
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