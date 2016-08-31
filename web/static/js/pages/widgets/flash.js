import html from "choo/html"
import error from "./error";
import _ from "underscore";

function view(state, send, options) {
  if(!state.error) return;
  if(!_.isObject(state.error.error)) return;

  return html`
    <div class="global-error">
      ${error(state, options)}
    </div>
  `;
}

export default view;