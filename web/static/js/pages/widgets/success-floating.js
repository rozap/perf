import html from "choo/html"
import _ from "underscore";

function view(state, message) {
  if(!state.success) return;
  return html`
    <div class="generic-success floating-message">
      <p>
        <i class="ion-ios-checkmark-outline"></i>
        ${message}
      </p>
    </div>
  `;
}

export default view;