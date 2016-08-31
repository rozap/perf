import html from "choo/html"
import _ from "underscore";

const e = (key, thing) => {
  if(_.isString(thing)) return t(thing);
  if(_.isArray(thing)) return arr(key, thing)
  console.error("i don't know how to show", key, thing);
}

function isFieldError(error) {
  return error.reason === 'field_values_invalid';
}

function view({error}, options) {
  if(!error) return;
  if(!_.isObject(error.error)) return;
  options = options || {};

  if(options.showFields && isFieldError(error.error)) return;

  return html`
    <div class="generic-error pure-u-1-1">
      <p class="error">
        <i class="ion-android-warning"></i>
        ${error.error.english}
      </p>
    </div>
  `;
}

export default view;