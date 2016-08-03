import html from "choo/html"

function view() {
  return html`
    <div class="loading pure-u-1-1">
      <h4 class="text-muted">Creating a new suite just for you</h4>
      <div class="loading-anim"></div>
    </div>
  `;
}

export default view;