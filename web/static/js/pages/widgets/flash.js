import html from "choo/html"
import error from "./error";
import _ from "underscore";

function view(appState, send) {
  if(!appState.error) return;
  if(!_.isObject(appState.error.error)) return;

  return html`
    <div class="global-error">
      ${error(appState)}
    </div>
  `;
}

export default view;