import Emitter from 'tiny-emitter';
import {Socket} from "phoenix";

function getToken() {
  const {token} = JSON.parse(localStorage['session']);
  return token;
}

class Store extends Emitter {

  constructor() {
    super();
    this._queued = [];

    setInterval(this._checkTimeouts.bind(this), 500);
  }

  onJoin(channel) {
    console.info("Joined channel");
    this._underlying = channel;
    this.emit('connected');

    this.login();

    this._queued.forEach((waiter) => {
      this._doSync(waiter);
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

  _doSync({op, params, em}) {
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

  sync(op, params, timeout) {
    timeout = timeout || 5000;
    const expiry = Date.now() + timeout;

    const em = new Emitter();
    if(!this._underlying) {

      this._queued.push({op, params, em, expiry});
    } else {
      this._doSync({op, params, em});
    }
    return em;
  }

  list(name, params) {
    return this.sync(`list:${name}`, params);
  }
  get(name, params) {
    return this.sync(`read:${name}`, params);
  }
  create(name, params) {
    return this.sync(`create:${name}`, params);
  }
  del(name, params) {
    return this.sync(`delete:${name}`, params);
  }
  update(name, params) {
    return this.sync(`update:${name}`, params);
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




function createStore(cb) {
  var params = {};
  const socket = new Socket("/socket", {params});
  const store = new Store();

  socket.onOpen(() => {
    let channel = socket.channel("api", {})

    channel.join()
    .receive("ok", resp => store.onJoin(channel))
    .receive("error", resp => store.onError(resp));
  });

  socket.onError((e) => store.onError(e));

  socket.connect();

  return store;
}
export default createStore;