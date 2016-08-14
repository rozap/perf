import html from "choo/html"

function current(user, send) {
  if(user) {
    return html`
    <div>
      <a href="/app/profile">${user.email}</a>
      <a href="javascript:void(0)"
        onclick=${() => send('logout')}
        >Logout</a>
    </div>`;
  }
  return html`
    <div>
      <a href="/app/login">Login</a>
      <a href="/app/register">Register</a>
    </div>`;
}

function actions(user) {
  if(!user) return;

  return html`
    <ul class="actions">
      <li><a href="/app/suites">Suites</a></li>
    </ul>
  `
}

function view({user}, send) {
  return html`
    <div class="top-menu">
      <a class="title" href="/app">perf.fail</a>${actions(user)}

      <ul class="auths">
        <li>${current(user, send)}</li>
      </ul>
    </div>
  `;
}

export default view;