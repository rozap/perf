import html from "choo/html"
import _ from "underscore";

const t = (k) => {
  return {
    'invalid_resource': 'Invalid Resource'
  }[k];
}

function view(state) {
  if(!state.error) return;
  console.error(state.error)
  return html`
    <div class="generic-error pure-u-1-1">
      <span>
      ${
        _.map(state.error, (value, key) => {
          return t(value);
        })
      }
      </span>
    </div>
  `;
}

export default view;