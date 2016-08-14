import html from "choo/html"
import _ from "underscore";

function view(state, message) {
  if(!state.success) return;
  return html`
    <div class="generic-success pure-u-1-1">
      <span>
        ${message}
      </span>
    </div>
  `;
}

export default view;