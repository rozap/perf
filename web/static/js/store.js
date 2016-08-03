import Emitter from 'tiny-emitter';

function wrap(channel) {
  const sync = (op, params) => {
    const em = new Emitter();
    channel.push(op, params)
    .receive('ok', (payload) => em.emit('ok', payload))
    .receive('error', (payload) => em.emit('error', payload));
    return em;
  };


  return {
    list: (name, params) => (sync(`list:${name}`, params)),
    get: (name, params) => (sync(`read:${name}`, params)),
    create: (name, params) => (sync(`create:${name}`, params))
  }
}



function store(socket, cb) {
  let channel = socket.channel("api", {})

  channel.join()
  .receive("ok", resp => cb(null, wrap(channel)))
  .receive("error", resp => {
    console.warn("Unable to join", resp)
    cb(resp);
  })



}
export default store;