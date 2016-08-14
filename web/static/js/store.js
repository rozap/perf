import Emitter from 'tiny-emitter';
import {Socket} from "phoenix";

function getToken() {
  const {token} = JSON.parse(localStorage['session']);
  return token;
}

class Store extends Emitter {

  onJoin(channel) {
    console.info("Joined channel");
    this._underlying = channel;
    this.emit('connected');
  }

  onError(resp) {
    console.error("Channel error", resp);
    this._underlying = false;
    this.emit('error', resp);
  }

  sync(op, params) {
    const em = new Emitter();
    if(!this._underlying) {
      return setTimeout(() => {
        em.emit('error', {reason: 'not_connected'});
      }, 0);
    };

    console.log("Channel -->", op, params)

    this._underlying.push(op, params)
    .receive('ok', (payload) => em.emit('ok', payload))
    .receive('error', (payload) => em.emit('error', payload));
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
    .receive("ok", resp => {
      store.onJoin(channel);
      store.login();
    })
    .receive("error", resp => store.onError(resp));
  });

  socket.onError((e) => store.onError(e));

  socket.connect();

  return store;
}
export default createStore;