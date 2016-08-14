import html from "choo/html"
import _ from "underscore";



const t = (k) => {
  const msg = {
    'invalid_resource': 'Invalid Resource'
  }[k];
  return html `<span class="error">
    <i class="ion-android-warning"></i>
    ${msg}
  </span>`;
}

const e = (key, thing) => {
  if(_.isString(thing)) return t(thing);
  console.error("i don't know how to show", key, thing);
}

function view({error}) {
  if(!error) return;
  if(!_.isObject(error.error)) return;
  const message = _.compact(_.map(error.error, (value, key) => {
    return e(key, value);
  }));
  if(!message.length) return;

  return html`
    <div class="generic-error pure-u-1-1">
      ${message}
    </div>
  `;
}

export default view;