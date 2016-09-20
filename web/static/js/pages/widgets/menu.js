import html from "choo/html"

function current({user}, send) {
  if(user) {
    return html`
    <ul class="auths">
      <li class="${routeActive('profile')}">
        <a href="/app/profile">${user.email}</a>
      </li>
      <li>
        <a href="javascript:void(0)"
        onclick=${() => send('logout')}
        >Logout</a>
      </li>
    </ul>`;
  }
  return html`
  <ul class="auths">
    <li class=${routeActive('login')} >
      <a href="/app/login">Login</a>
    </li>
    <li class=${routeActive('register')} >
      <a href="/app/register">Register</a>
    </li>
  </ul>`;
}

function routeActive(wtf) {
  return window.location.pathname.indexOf(wtf) > -1? 'active': '';
}

function actions(user) {
  if(!user) return html`<ul class="actions"></ul>`;

  return html`
    <ul class="actions">
      <li class="${routeActive('suites')}"><a href="/app/suites">Suites</a></li>
      <li class="${routeActive('runs')}"><a href="/app/runs">Runs</a></li>
    </ul>
  `
}

function view({user}, send) {
  return html`
    <div class="top-menu">
      <a class="title" href="/">load.fail</a>
      ${actions(user)}
      ${current(user, send)}
    </div>
  `;
}

export default view;