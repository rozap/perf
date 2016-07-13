import {Socket} from "phoenix"

// console.log(Socket)
// var socket = new Socket("/socket", {})

// socket.onOpen(() => {
//   console.log("open!");
// });
// socket.onError((e) => {
//   console.error("socket error", e)
// });

// socket.connect();

// console.log("elo from regular js")
window.onload = function() {
  var elmDiv = document.getElementById('elm-main'),
    elmApp = Elm.Main.embed(elmDiv);
}